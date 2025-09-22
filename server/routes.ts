import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema, insertClaimSchema } from "@shared/schema";
import { upload, handleUploadError, getFileUrl, getFilePath } from "./services/upload";
import { verifyClaimWithAI, detectFraud } from "./services/gemini";
import express from "express";
import path from "path";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Items routes
  app.get('/api/items', async (req, res) => {
    try {
      const { type, search, location } = req.query;
      const filters: any = {};
      
      if (type && (type === 'lost' || type === 'found')) {
        filters.type = type;
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }
      if (location && typeof location === 'string') {
        filters.location = location;
      }

      const items = await storage.getItems(filters);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch items' });
    }
  });

  app.get('/api/items/:id', async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch item' });
    }
  });

  app.post('/api/items', upload.single('image'), handleUploadError, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Coerce date inputs from HTML date fields (strings like 'YYYY-MM-DD')
      // into a JavaScript Date instance which the drizzle-zod timestamp mode
      // can accept during validation.
      if (req.body && typeof req.body.date === 'string') {
        const parsed = Date.parse(req.body.date);
        if (!isNaN(parsed)) {
          req.body.date = new Date(parsed);
        }
      }

      const validation = insertItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid item data', errors: validation.error.issues });
      }

      const itemData = {
        ...validation.data,
        userId: req.user!.id,
        imageUrl: req.file ? getFileUrl(req.file.filename) : undefined,
        date: new Date(validation.data.date)
      };

      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create item' });
    }
  });

  app.get('/api/users/:id/items', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const items = await storage.getUserItems(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user items' });
    }
  });

  // Claims routes
  app.get('/api/claims', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const { itemId, userId } = req.query;
      const claims = await storage.getClaims(
        itemId as string || undefined,
        userId as string || undefined
      );
      res.json(claims);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch claims' });
    }
  });

  app.get('/api/claims/:id', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: 'Claim not found' });
      }
      res.json(claim);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch claim' });
    }
  });

  app.post('/api/claims', upload.single('evidenceImage'), handleUploadError, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const validation = insertClaimSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid claim data', errors: validation.error.issues });
      }

      // Check for fraud
      const failedClaims = await storage.getUserFailedClaims(req.user!.id);
      const fraudCheck = await detectFraud(req.user!.id, failedClaims);
      
      if (fraudCheck.isSuspicious) {
        return res.status(403).json({ 
          message: 'Account flagged for suspicious activity',
          reason: fraudCheck.reason
        });
      }

      // Get the original item
      const item = await storage.getItem(validation.data.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      if (item.status !== 'active') {
        return res.status(400).json({ message: 'Item is no longer available for claims' });
      }

      // Create claim with evidence
      const claimData = {
        ...validation.data,
        claimerId: req.user!.id,
        evidenceImageUrl: req.file ? getFileUrl(req.file.filename) : undefined
      };

      const claim = await storage.createClaim(claimData);

      // Run AI verification
      try {
        const originalImagePath = item.imageUrl ? getFilePath(path.basename(item.imageUrl)) : undefined;
        const claimImagePath = req.file ? getFilePath(req.file.filename) : undefined;

        const verification = await verifyClaimWithAI(
          item.description,
          validation.data.evidenceText,
          originalImagePath,
          claimImagePath
        );

        // Update claim with AI results
        await storage.updateClaim(claim.id, {
          aiScore: verification.finalScore,
          textSimilarity: verification.textSimilarity,
          imageSimilarity: verification.imageSimilarity,
          status: verification.decision === "manual_review" ? "manual_review" : verification.decision,
          reason: verification.reason
        });

        // Update item status if approved
        if (verification.decision === "approved") {
          await storage.updateItemStatus(item.id, "claimed");
        }

        res.status(201).json({ ...claim, ...verification });
      } catch (aiError) {
        // If AI fails, set to manual review
        await storage.updateClaim(claim.id, {
          status: "manual_review",
          reason: "AI verification unavailable - manual review required"
        });

        res.status(201).json({ 
          ...claim, 
          status: "manual_review",
          reason: "AI verification unavailable - manual review required"
        });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to create claim' });
    }
  });

  app.get('/api/users/:id/claims', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const claims = await storage.getClaims(undefined, req.params.id);
      res.json(claims);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user claims' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userId = req.user!.id;
      const userItems = await storage.getUserItems(userId);
      const userClaims = await storage.getClaims(undefined, userId);
      
      const itemsReported = userItems.length;
      const claimsSubmitted = userClaims.length;
      const itemsReunited = userItems.filter(item => item.status === 'resolved').length;
      const approvedClaims = userClaims.filter(claim => claim.status === 'approved').length;
      const successRate = claimsSubmitted > 0 ? Math.round((approvedClaims / claimsSubmitted) * 100) : 0;

      res.json({
        itemsReported,
        claimsSubmitted,
        itemsReunited,
        successRate
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
