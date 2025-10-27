import { type User, type InsertUser, type Item, type InsertItem, type Claim, type InsertClaim, type ItemWithUser, type ClaimWithItem, type Reward, type InsertReward, type Achievement, type InsertAchievement } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";
import { SqliteStorage } from "./sql-storage";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: string, points: number): Promise<void>;
  
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
  
  createReward(reward: InsertReward & { userId: string; relatedItemId?: string; relatedClaimId?: string }): Promise<Reward>;
  getUserRewards(userId: string, limit?: number): Promise<Reward[]>;
  getLeaderboard(limit?: number): Promise<User[]>;
  
  createAchievement(achievement: InsertAchievement & { userId: string }): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
  
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private items = new Map<string, Item>();
  private claims = new Map<string, Claim>();
  private rewards = new Map<string, Reward>();
  private achievements = new Map<string, Achievement>();
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
    const user: User = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      points: 0,
      ...insertUser,
    };
    this.users.set(user.id, user);
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
        item.description.toLowerCase().includes(search) ||
        item.contactInfo.toLowerCase().includes(search)
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

  async updateUserPoints(userId: string, points: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, points: user.points + points });
    }
  }

  async createReward(rewardData: InsertReward & { userId: string; relatedItemId?: string; relatedClaimId?: string }): Promise<Reward> {
    const id = randomUUID();
    const reward: Reward = {
      ...rewardData,
      id,
      createdAt: new Date(),
      relatedItemId: rewardData.relatedItemId || null,
      relatedClaimId: rewardData.relatedClaimId || null
    };
    this.rewards.set(id, reward);
    return reward;
  }

  async getUserRewards(userId: string, limit?: number): Promise<Reward[]> {
    let rewards = Array.from(this.rewards.values()).filter(r => r.userId === userId);
    rewards.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    if (limit) {
      rewards = rewards.slice(0, limit);
    }
    return rewards;
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    const users = Array.from(this.users.values());
    users.sort((a, b) => b.points - a.points);
    return users.slice(0, limit);
  }

  async createAchievement(achievementData: InsertAchievement & { userId: string }): Promise<Achievement> {
    const id = randomUUID();
    const achievement: Achievement = {
      ...achievementData,
      id,
      unlockedAt: new Date()
    };
    this.achievements.set(id, achievement);
    return achievement;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const achievements = Array.from(this.achievements.values()).filter(a => a.userId === userId);
    return achievements.sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime());
  }
}
export const storage = new SqliteStorage();
