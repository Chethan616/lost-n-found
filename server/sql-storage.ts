import { type User, type InsertUser, type Item, type InsertItem, type Claim, type InsertClaim, type ItemWithUser, type ClaimWithItem, users, items, claims } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db, initializeDatabase } from "./db";
import { eq, and, desc, like, or } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getItems(filters?: { type?: "lost" | "found"; search?: string; location?: string }): Promise<ItemWithUser[]>;
  getItem(id: string): Promise<ItemWithUser | undefined>;
  getUserItems(userId: string): Promise<ItemWithUser[]>;
  createItem(item: InsertItem & { userId: string }): Promise<Item>;
  updateItemStatus(id: string, status: "active" | "claimed" | "resolved"): Promise<void>;
  
  getClaims(itemId?: string, userId?: string): Promise<ClaimWithItem[]>;
  getClaim(id: string): Promise<ClaimWithItem | undefined>;
  createClaim(claim: InsertClaim & { claimerId: string }): Promise<Claim>;
  updateClaim(id: string, updates: Partial<Claim>): Promise<void>;
  getUserFailedClaims(userId: string): Promise<number>;
  
  sessionStore: any;
}

export class SqliteStorage implements IStorage {
  public sessionStore: any;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Initialize database tables
    initializeDatabase();
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!result[0]) return undefined;
    
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt as Date | null
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!result[0]) return undefined;
    
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt as Date | null
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!result[0]) return undefined;
    
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt as Date | null
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      username: insertUser.username,
      email: insertUser.email,
      password: insertUser.password
    }).returning();
    
    const user = result[0];
    return {
      ...user,
      createdAt: user.createdAt as Date | null
    };
  }

  async getItems(filters?: { type?: "lost" | "found"; search?: string; location?: string }): Promise<ItemWithUser[]> {
    // Start with base query
    let query = db
      .select({
        item: items,
        user: users
      })
      .from(items)
      .innerJoin(users, eq(items.userId, users.id))
      .orderBy(desc(items.createdAt));

    const result = await query;
    
    // Convert to proper format with date conversion
    let itemsWithUsers = result.map(row => ({
      ...row.item,
      createdAt: row.item.createdAt as Date | null,
      date: row.item.date as Date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt as Date | null
      }
    }));
    
    // Apply JavaScript filters
    if (filters?.type) {
      itemsWithUsers = itemsWithUsers.filter(item => item.type === filters.type);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      itemsWithUsers = itemsWithUsers.filter(item => 
        item.itemName.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      );
    }
    if (filters?.location) {
      const location = filters.location.toLowerCase();
      itemsWithUsers = itemsWithUsers.filter(item => 
        item.location.toLowerCase().includes(location)
      );
    }
    
    return itemsWithUsers;
  }

  async getItem(id: string): Promise<ItemWithUser | undefined> {
    const result = await db
      .select({
        item: items,
        user: users
      })
      .from(items)
      .innerJoin(users, eq(items.userId, users.id))
      .where(eq(items.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    const row = result[0];
    return {
      ...row.item,
      createdAt: row.item.createdAt as Date | null,
      date: row.item.date as Date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt as Date | null
      }
    };
  }

  async getUserItems(userId: string): Promise<ItemWithUser[]> {
    const result = await db
      .select({
        item: items,
        user: users
      })
      .from(items)
      .innerJoin(users, eq(items.userId, users.id))
      .where(eq(items.userId, userId))
      .orderBy(desc(items.createdAt));
    
    return result.map(row => ({
      ...row.item,
      createdAt: row.item.createdAt as Date | null,
      date: row.item.date as Date,
      user: {
        ...row.user,
        createdAt: row.user.createdAt as Date | null
      }
    }));
  }

  async createItem(itemData: InsertItem & { userId: string }): Promise<Item> {
    const result = await db.insert(items).values({
      type: itemData.type,
      itemName: itemData.itemName,
      description: itemData.description,
      location: itemData.location,
      date: itemData.date as Date,
      contactInfo: itemData.contactInfo,
      status: "active",
      imageUrl: itemData.imageUrl || null,
      userId: itemData.userId
    }).returning();
    
    const item = result[0];
    return {
      ...item,
      createdAt: item.createdAt as Date | null,
      date: item.date as Date
    };
  }

  async updateItemStatus(id: string, status: "active" | "claimed" | "resolved"): Promise<void> {
    await db.update(items).set({ status }).where(eq(items.id, id));
  }

  async getClaims(itemId?: string, userId?: string): Promise<ClaimWithItem[]> {
    // Base query with joins
    const result = await db
      .select({
        claim: claims,
        item: items,
        claimer: users
      })
      .from(claims)
      .innerJoin(items, eq(claims.itemId, items.id))
      .innerJoin(users, eq(claims.claimerId, users.id))
      .orderBy(desc(claims.createdAt));
    
    // Filter results
    let filteredResults = result;
    if (itemId) {
      filteredResults = filteredResults.filter(row => row.claim.itemId === itemId);
    }
    if (userId) {
      filteredResults = filteredResults.filter(row => row.claim.claimerId === userId);
    }
    
    // Get item owners for each claim
    const claimsWithItems: ClaimWithItem[] = [];
    for (const row of filteredResults) {
      const itemOwner = await this.getUser(row.item.userId);
      if (itemOwner) {
        claimsWithItems.push({
          ...row.claim,
          createdAt: row.claim.createdAt as Date | null,
          item: {
            ...row.item,
            createdAt: row.item.createdAt as Date | null,
            date: row.item.date as Date,
            user: itemOwner
          },
          claimer: {
            ...row.claimer,
            createdAt: row.claimer.createdAt as Date | null
          }
        });
      }
    }
    
    return claimsWithItems;
  }

  async getClaim(id: string): Promise<ClaimWithItem | undefined> {
    const result = await db
      .select({
        claim: claims,
        item: items,
        claimer: users
      })
      .from(claims)
      .innerJoin(items, eq(claims.itemId, items.id))
      .innerJoin(users, eq(claims.claimerId, users.id))
      .where(eq(claims.id, id))
      .limit(1);
    
    if (!result[0]) return undefined;
    
    const row = result[0];
    const itemOwner = await this.getUser(row.item.userId);
    if (!itemOwner) return undefined;
    
    return {
      ...row.claim,
      createdAt: row.claim.createdAt as Date | null,
      item: {
        ...row.item,
        createdAt: row.item.createdAt as Date | null,
        date: row.item.date as Date,
        user: itemOwner
      },
      claimer: {
        ...row.claimer,
        createdAt: row.claimer.createdAt as Date | null
      }
    };
  }

  async createClaim(claimData: InsertClaim & { claimerId: string }): Promise<Claim> {
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
      createdAt: claim.createdAt as Date | null
    };
  }

  async updateClaim(id: string, updates: Partial<Claim>): Promise<void> {
    // Convert any Date objects to timestamps for storage
    const dbUpdates: any = { ...updates };
    if (dbUpdates.createdAt instanceof Date) {
      dbUpdates.createdAt = Math.floor(dbUpdates.createdAt.getTime() / 1000);
    }
    
    await db.update(claims).set(dbUpdates).where(eq(claims.id, id));
  }

  async getUserFailedClaims(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(claims)
      .where(and(eq(claims.claimerId, userId), eq(claims.status, "rejected")));
    
    return result.length;
  }
}