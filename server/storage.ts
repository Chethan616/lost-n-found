import { type User, type InsertUser, type Item, type InsertItem, type Claim, type InsertClaim, type ItemWithUser, type ClaimWithItem } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private items: Map<string, Item>;
  private claims: Map<string, Claim>;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.items = new Map();
    this.claims = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getItems(filters?: { type?: "lost" | "found"; search?: string; location?: string }): Promise<ItemWithUser[]> {
    let items = Array.from(this.items.values());
    
    if (filters?.type) {
      items = items.filter(item => item.type === filters.type);
    }
    
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(item => 
        item.itemName.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      );
    }
    
    if (filters?.location) {
      const location = filters.location.toLowerCase();
      items = items.filter(item => 
        item.location.toLowerCase().includes(location)
      );
    }

    const itemsWithUsers: ItemWithUser[] = [];
    for (const item of items) {
      const user = await this.getUser(item.userId);
      if (user) {
        itemsWithUsers.push({ ...item, user });
      }
    }
    
    return itemsWithUsers.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getItem(id: string): Promise<ItemWithUser | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const user = await this.getUser(item.userId);
    if (!user) return undefined;
    
    return { ...item, user };
  }

  async getUserItems(userId: string): Promise<ItemWithUser[]> {
    const items = Array.from(this.items.values()).filter(item => item.userId === userId);
    const user = await this.getUser(userId);
    if (!user) return [];
    
    return items.map(item => ({ ...item, user }));
  }

  async createItem(itemData: InsertItem & { userId: string }): Promise<Item> {
    const id = randomUUID();
    const item: Item = {
      ...itemData,
      id,
      status: "active",
      createdAt: new Date(),
      imageUrl: itemData.imageUrl || null
    };
    this.items.set(id, item);
    return item;
  }

  async updateItemStatus(id: string, status: "active" | "claimed" | "resolved"): Promise<void> {
    const item = this.items.get(id);
    if (item) {
      this.items.set(id, { ...item, status });
    }
  }

  async getClaims(itemId?: string, userId?: string): Promise<ClaimWithItem[]> {
    let claims = Array.from(this.claims.values());
    
    if (itemId) {
      claims = claims.filter(claim => claim.itemId === itemId);
    }
    
    if (userId) {
      claims = claims.filter(claim => claim.claimerId === userId);
    }

    const claimsWithItems: ClaimWithItem[] = [];
    for (const claim of claims) {
      const item = await this.getItem(claim.itemId);
      const claimer = await this.getUser(claim.claimerId);
      if (item && claimer) {
        claimsWithItems.push({ ...claim, item, claimer });
      }
    }
    
    return claimsWithItems.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getClaim(id: string): Promise<ClaimWithItem | undefined> {
    const claim = this.claims.get(id);
    if (!claim) return undefined;
    
    const item = await this.getItem(claim.itemId);
    const claimer = await this.getUser(claim.claimerId);
    if (!item || !claimer) return undefined;
    
    return { ...claim, item, claimer };
  }

  async createClaim(claimData: InsertClaim & { claimerId: string }): Promise<Claim> {
    const id = randomUUID();
    const claim: Claim = {
      ...claimData,
      id,
      status: "pending",
      createdAt: new Date(),
      evidenceImageUrl: claimData.evidenceImageUrl || null,
      aiScore: null,
      textSimilarity: null,
      imageSimilarity: null,
      reason: null
    };
    this.claims.set(id, claim);
    return claim;
  }

  async updateClaim(id: string, updates: Partial<Claim>): Promise<void> {
    const claim = this.claims.get(id);
    if (claim) {
      this.claims.set(id, { ...claim, ...updates });
    }
  }

  async getUserFailedClaims(userId: string): Promise<number> {
    const claims = Array.from(this.claims.values()).filter(
      claim => claim.claimerId === userId && claim.status === "rejected"
    );
    return claims.length;
  }
}

export const storage = new MemStorage();
