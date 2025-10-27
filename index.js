// server/index.ts
import express3 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session3 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// server/storage.ts
import session2 from "express-session";
import createMemoryStore2 from "memorystore";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
var users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
});
var items = sqliteTable("items", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  type: text("type", { enum: ["lost", "found"] }).notNull(),
  itemName: text("item_name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  contactInfo: text("contact_info").notNull(),
  status: text("status", { enum: ["active", "claimed", "resolved"] }).default("active"),
  imageUrl: text("image_url"),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
});
var claims = sqliteTable("claims", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  itemId: text("item_id").notNull().references(() => items.id),
  claimerId: text("claimer_id").notNull().references(() => users.id),
  evidenceText: text("evidence_text").notNull(),
  evidenceImageUrl: text("evidence_image_url"),
  aiScore: real("ai_score"),
  textSimilarity: real("text_similarity"),
  imageSimilarity: real("image_similarity"),
  status: text("status", { enum: ["pending", "approved", "rejected", "manual_review"] }).default("pending"),
  reason: text("reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true
});
var insertItemSchema = createInsertSchema(items).pick({
  type: true,
  itemName: true,
  description: true,
  location: true,
  date: true,
  contactInfo: true,
  imageUrl: true
});
var insertClaimSchema = createInsertSchema(claims).pick({
  itemId: true,
  evidenceText: true,
  evidenceImageUrl: true
});

// server/sql-storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";

// server/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
var sqlitePath = path.join(process.cwd(), "database.sqlite");
var sqlite = new Database(sqlitePath);
sqlite.pragma("foreign_keys = ON");
var db = drizzle(sqlite, { schema: { users, items, claims } });
function initializeDatabase() {
  try {
    const initSqlPath = path.join(process.cwd(), "server", "sql", "init.sql");
    if (fs.existsSync(initSqlPath)) {
      const sql2 = fs.readFileSync(initSqlPath, "utf8");
      sqlite.exec(sql2);
      console.log(`Database initialized from ${initSqlPath}`);
    } else {
      console.warn(`Initialization SQL not found at ${initSqlPath}. Skipping initialization.`);
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}

// server/sql-storage.ts
import { eq, and, desc } from "drizzle-orm";
var MemoryStore = createMemoryStore(session);
var SqliteStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
    });
    initializeDatabase();
  }
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!result[0]) return void 0;
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt
    };
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!result[0]) return void 0;
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt
    };
  }
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!result[0]) return void 0;
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt
    };
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values({
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password
    }).returning();
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt
    };
  }
  async getItems(filters) {
    console.debug("SqliteStorage.getItems called - filters:", filters);
    let query = db.select({
      item: items,
      user: users
    }).from(items).innerJoin(users, eq(items.userId, users.id)).orderBy(desc(items.createdAt));
    const result = await query;
    console.debug(`SqliteStorage.getItems - db returned rows: ${result.length}`);
    let itemsWithUsers = result.map((row) => ({
      ...row.item,
      createdAt: row.item.createdAt,
      date: row.item.date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt
      }
    }));
    if (filters?.type) {
      itemsWithUsers = itemsWithUsers.filter((item) => item.type === filters.type);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      itemsWithUsers = itemsWithUsers.filter(
        (item) => item.itemName.toLowerCase().includes(search) || item.description.toLowerCase().includes(search)
      );
    }
    if (filters?.location) {
      const location = filters.location.toLowerCase();
      itemsWithUsers = itemsWithUsers.filter(
        (item) => item.location.toLowerCase().includes(location)
      );
    }
    console.debug(`SqliteStorage.getItems - after filters: ${itemsWithUsers.length}`);
    return itemsWithUsers;
  }
  async getItem(id) {
    const result = await db.select({
      item: items,
      user: users
    }).from(items).innerJoin(users, eq(items.userId, users.id)).where(eq(items.id, id)).limit(1);
    if (!result[0]) return void 0;
    const row = result[0];
    return {
      ...row.item,
      createdAt: row.item.createdAt,
      date: row.item.date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt
      }
    };
  }
  async getUserItems(userId) {
    const result = await db.select({
      item: items,
      user: users
    }).from(items).innerJoin(users, eq(items.userId, users.id)).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));
    return result.map((row) => ({
      ...row.item,
      createdAt: row.item.createdAt,
      date: row.item.date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt
      }
    }));
  }
  async createItem(itemData) {
    const result = await db.insert(items).values({
      type: itemData.type,
      itemName: itemData.itemName,
      description: itemData.description,
      location: itemData.location,
      date: itemData.date,
      contactInfo: itemData.contactInfo,
      status: "active",
      imageUrl: itemData.imageUrl || null,
      userId: itemData.userId
    }).returning();
    const item = result[0];
    return {
      ...item,
      createdAt: item.createdAt,
      date: item.date
    };
  }
  async updateItemStatus(id, status) {
    await db.update(items).set({ status }).where(eq(items.id, id));
  }
  async getClaims(itemId, userId) {
    const result = await db.select({
      claim: claims,
      item: items,
      claimer: users
    }).from(claims).innerJoin(items, eq(claims.itemId, items.id)).innerJoin(users, eq(claims.claimerId, users.id)).orderBy(desc(claims.createdAt));
    let filteredResults = result;
    if (itemId) {
      filteredResults = filteredResults.filter((row) => row.claim.itemId === itemId);
    }
    if (userId) {
      filteredResults = filteredResults.filter((row) => row.claim.claimerId === userId);
    }
    const claimsWithItems = [];
    for (const row of filteredResults) {
      const itemOwner = await this.getUser(row.item.userId);
      if (itemOwner) {
        claimsWithItems.push({
          ...row.claim,
          createdAt: row.claim.createdAt,
          item: {
            ...row.item,
            createdAt: row.item.createdAt,
            date: row.item.date,
            user: itemOwner
          },
          claimer: {
            ...row.claimer,
            createdAt: row.claimer.createdAt
          }
        });
      }
    }
    return claimsWithItems;
  }
  async getClaim(id) {
    const result = await db.select({
      claim: claims,
      item: items,
      claimer: users
    }).from(claims).innerJoin(items, eq(claims.itemId, items.id)).innerJoin(users, eq(claims.claimerId, users.id)).where(eq(claims.id, id)).limit(1);
    if (!result[0]) return void 0;
    const row = result[0];
    const itemOwner = await this.getUser(row.item.userId);
    if (!itemOwner) return void 0;
    return {
      ...row.claim,
      createdAt: row.claim.createdAt,
      item: {
        ...row.item,
        createdAt: row.item.createdAt,
        date: row.item.date,
        user: itemOwner
      },
      claimer: {
        ...row.claimer,
        createdAt: row.claimer.createdAt
      }
    };
  }
  async createClaim(claimData) {
    const result = await db.insert(claims).values({
      itemId: claimData.itemId,
      claimerId: claimData.claimerId,
      evidenceText: claimData.evidenceText,
      evidenceImageUrl: claimData.evidenceImageUrl || null,
      aiScore: null,
      textSimilarity: null,
      imageSimilarity: null,
      status: "pending",
      reason: null
    }).returning();
    const claim = result[0];
    return {
      ...claim,
      createdAt: claim.createdAt
    };
  }
  async updateClaim(id, updates) {
    const dbUpdates = { ...updates };
    if (dbUpdates.createdAt instanceof Date) {
      dbUpdates.createdAt = Math.floor(dbUpdates.createdAt.getTime() / 1e3);
    }
    await db.update(claims).set(dbUpdates).where(eq(claims.id, id));
  }
  async getUserFailedClaims(userId) {
    const result = await db.select().from(claims).where(and(eq(claims.claimerId, userId), eq(claims.status, "rejected")));
    return result.length;
  }
};

// server/storage.ts
var MemoryStore2 = createMemoryStore2(session2);
var storage = new SqliteStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    // Provide a safe default for local development if SESSION_SECRET isn't set.
    // In production this MUST be set via env var.
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session3(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/services/upload.ts
import multer from "multer";
import path2 from "path";
import fs2 from "fs";
var uploadsDir = path2.join(process.cwd(), "uploads");
if (!fs2.existsSync(uploadsDir)) {
  fs2.mkdirSync(uploadsDir, { recursive: true });
}
var storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path2.extname(file.originalname));
  }
});
var fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};
var upload = multer({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
var handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
    }
  }
  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({ message: "Only image files are allowed." });
  }
  next(error);
};
var getFileUrl = (filename) => {
  return `/uploads/${filename}`;
};
var getFilePath = (filename) => {
  return path2.join(uploadsDir, filename);
};

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs3 from "fs";
var apiKey = process.env.GEMINI_API_KEY;
var genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
async function verifyClaimWithAI(originalDescription, claimDescription, originalImagePath, claimImagePath) {
  try {
    const textSimilarity = await analyzeTextSimilarity(originalDescription, claimDescription);
    let imageSimilarity = 0;
    if (originalImagePath && claimImagePath) {
      imageSimilarity = await analyzeImageSimilarity(originalImagePath, claimImagePath);
    }
    const finalScore = originalImagePath && claimImagePath ? 0.6 * textSimilarity + 0.4 * imageSimilarity : textSimilarity;
    let decision;
    let reason;
    if (textSimilarity >= 0.8) {
      decision = "approved";
      reason = "High text similarity (80%+) detected. Claim automatically approved.";
    } else if (finalScore >= 0.6) {
      decision = "manual_review";
      reason = "Moderate similarity detected. Manual review recommended for verification.";
    } else {
      decision = "rejected";
      reason = "Low similarity between claim and original item description.";
    }
    return {
      textSimilarity,
      imageSimilarity,
      finalScore,
      decision,
      reason
    };
  } catch (error) {
    console.error("AI verification error:", error);
    throw new Error("AI verification service unavailable");
  }
}
async function analyzeTextSimilarity(original, claim) {
  if (!genAI) {
    console.log("No Gemini API key provided, using fallback text similarity");
    return calculateBasicTextSimilarity(original, claim);
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      Analyze the similarity between these two item descriptions and return only a JSON response:
      
      Original Description: "${original}"
      Claim Description: "${claim}"
      
      Compare:
      1. Item type and category
      2. Physical characteristics (color, size, brand, model)
      3. Unique identifying features
      4. Condition and notable details
      
      Return JSON format:
      {
        "similarity": 0.85,
        "reasoning": "Both descriptions match on key identifying features..."
      }
      
      Similarity score should be between 0 and 1.
    `;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text2 = response.text();
    try {
      const parsed = JSON.parse(text2);
      return Math.max(0, Math.min(1, parsed.similarity || 0));
    } catch (parseError) {
      console.log("Failed to parse AI response, using fallback:", parseError);
      return calculateBasicTextSimilarity(original, claim);
    }
  } catch (error) {
    console.log("AI text analysis failed, using fallback:", error);
    return calculateBasicTextSimilarity(original, claim);
  }
}
async function analyzeImageSimilarity(imagePath1, imagePath2) {
  if (!genAI) {
    console.log("No Gemini API key provided, using fallback image similarity");
    return 0.5;
  }
  if (!fs3.existsSync(imagePath1) || !fs3.existsSync(imagePath2)) {
    return 0;
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const image1 = fs3.readFileSync(imagePath1);
    const image2 = fs3.readFileSync(imagePath2);
    const prompt = `
      Compare these two images and determine if they show the same item. Return only JSON:
      
      {
        "similarity": 0.92,
        "reasoning": "Both images show the same iPhone model with matching physical characteristics..."
      }
      
      Consider:
      - Object type and shape
      - Colors and materials
      - Unique marks, scratches, or features
      - Brand logos or text
      - Overall condition
      
      Similarity score between 0 and 1.
    `;
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: image1.toString("base64"),
          mimeType: getImageMimeType(imagePath1)
        }
      },
      {
        inlineData: {
          data: image2.toString("base64"),
          mimeType: getImageMimeType(imagePath2)
        }
      }
    ]);
    const response = result.response;
    const text2 = response.text();
    try {
      const parsed = JSON.parse(text2);
      return Math.max(0, Math.min(1, parsed.similarity || 0));
    } catch (parseError) {
      console.log("Failed to parse AI image response:", parseError);
      return 0.5;
    }
  } catch (error) {
    console.log("AI image analysis failed:", error);
    return 0.5;
  }
}
function getImageMimeType(filePath) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}
function calculateBasicTextSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set(Array.from(set1).filter((x) => set2.has(x)));
  const union = /* @__PURE__ */ new Set([...Array.from(set1), ...Array.from(set2)]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
async function detectFraud(userId, failedClaims) {
  if (failedClaims >= 3) {
    if (!genAI) {
      return {
        isSuspicious: true,
        reason: "Multiple failed claim attempts detected"
      };
    }
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        A user has failed ${failedClaims} claim attempts. Assess fraud risk and return JSON:
        
        {
          "isSuspicious": true,
          "reason": "Multiple failed claims indicate potential fraudulent activity..."
        }
      `;
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text2 = response.text();
      try {
        const parsed = JSON.parse(text2);
        return {
          isSuspicious: parsed.isSuspicious || failedClaims >= 3,
          reason: parsed.reason || "Multiple failed claim attempts detected"
        };
      } catch (parseError) {
        console.log("Failed to parse AI fraud detection response:", parseError);
        return {
          isSuspicious: true,
          reason: "Multiple failed claim attempts detected"
        };
      }
    } catch (error) {
      console.log("AI fraud detection failed:", error);
      return {
        isSuspicious: true,
        reason: "Multiple failed claim attempts detected"
      };
    }
  }
  return { isSuspicious: false };
}

// server/routes.ts
import express from "express";
import path3 from "path";
function registerRoutes(app2) {
  setupAuth(app2);
  app2.use("/uploads", express.static(path3.join(process.cwd(), "uploads")));
  app2.get("/api/items", async (req, res) => {
    try {
      const { type, search, location } = req.query;
      console.debug(`/api/items requested - query:`, { type, search, location, src: req.query._src, ip: req.ip, referer: req.get("referer"), authenticated: req.isAuthenticated() });
      const filters = {};
      if (type && (type === "lost" || type === "found")) {
        filters.type = type;
      }
      if (search && typeof search === "string") {
        filters.search = search;
      }
      if (location && typeof location === "string") {
        filters.location = location;
      }
      const items2 = await storage.getItems(filters);
      res.json(items2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });
  app2.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });
  app2.post("/api/items", upload.single("image"), handleUploadError, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (req.body && typeof req.body.date === "string") {
        const parsed = Date.parse(req.body.date);
        if (!isNaN(parsed)) {
          req.body.date = new Date(parsed);
        }
      }
      const validation = insertItemSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid item data", errors: validation.error.issues });
      }
      const itemData = {
        ...validation.data,
        userId: req.user.id,
        imageUrl: req.file ? getFileUrl(req.file.filename) : void 0,
        date: new Date(validation.data.date)
      };
      const item = await storage.createItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to create item" });
    }
  });
  app2.get("/api/users/:id/items", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const items2 = await storage.getUserItems(req.params.id);
      res.json(items2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user items" });
    }
  });
  app2.get("/api/claims", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const { itemId, userId } = req.query;
      const claims2 = await storage.getClaims(
        itemId || void 0,
        userId || void 0
      );
      res.json(claims2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });
  app2.get("/api/claims/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claim" });
    }
  });
  app2.post("/api/claims", upload.single("evidenceImage"), handleUploadError, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const validation = insertClaimSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid claim data", errors: validation.error.issues });
      }
      const failedClaims = await storage.getUserFailedClaims(req.user.id);
      const fraudCheck = await detectFraud(req.user.id, failedClaims);
      if (fraudCheck.isSuspicious) {
        return res.status(403).json({
          message: "Account flagged for suspicious activity",
          reason: fraudCheck.reason
        });
      }
      const item = await storage.getItem(validation.data.itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      if (item.status !== "active") {
        return res.status(400).json({ message: "Item is no longer available for claims" });
      }
      const claimData = {
        ...validation.data,
        claimerId: req.user.id,
        evidenceImageUrl: req.file ? getFileUrl(req.file.filename) : void 0
      };
      const claim = await storage.createClaim(claimData);
      try {
        const originalImagePath = item.imageUrl ? getFilePath(path3.basename(item.imageUrl)) : void 0;
        const claimImagePath = req.file ? getFilePath(req.file.filename) : void 0;
        const verification = await verifyClaimWithAI(
          item.description,
          validation.data.evidenceText,
          originalImagePath,
          claimImagePath
        );
        await storage.updateClaim(claim.id, {
          aiScore: verification.finalScore,
          textSimilarity: verification.textSimilarity,
          imageSimilarity: verification.imageSimilarity,
          status: verification.decision === "manual_review" ? "manual_review" : verification.decision,
          reason: verification.reason
        });
        if (verification.decision === "approved") {
          await storage.updateItemStatus(item.id, "claimed");
        }
        res.status(201).json({ ...claim, ...verification });
      } catch (aiError) {
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
      res.status(500).json({ message: "Failed to create claim" });
    }
  });
  app2.get("/api/users/:id/claims", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const claims2 = await storage.getClaims(void 0, req.params.id);
      res.json(claims2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user claims" });
    }
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const userId = req.user.id;
      const userItems = await storage.getUserItems(userId);
      const userClaims = await storage.getClaims(void 0, userId);
      const itemsReported = userItems.length;
      const claimsSubmitted = userClaims.length;
      const itemsReunited = userItems.filter((item) => item.status === "resolved").length;
      const approvedClaims = userClaims.filter((claim) => claim.status === "approved").length;
      const successRate = claimsSubmitted > 0 ? Math.round(approvedClaims / claimsSubmitted * 100) : 0;
      res.json({
        itemsReported,
        claimsSubmitted,
        itemsReunited,
        successRate
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs4 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay() shows a blocking overlay in the browser. Keep
    // the plugin but rely on Vite's server.hmr.overlay = false to disable the
    // blocking overlay behavior.
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  base: "/lost-n-found/",
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path4.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    // Disable Vite's HMR overlay which shows a blocking UI when runtime
    // errors occur. This avoids the clickable overlay message described by the
    // runtime error plugin output.
    hmr: { overlay: false },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs4.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path5.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs4.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' 'unsafe-inline' data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    );
    next();
  });
}
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions = { port, host: "0.0.0.0" };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
