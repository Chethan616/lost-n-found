import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const items = sqliteTable("items", {
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
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const claims = sqliteTable("claims", {
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
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const rewards = sqliteTable("rewards", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["report_found", "report_lost", "claim_approved", "item_reunited", "helped_someone"] }).notNull(),
  points: integer("points").notNull(),
  relatedItemId: text("related_item_id").references(() => items.id),
  relatedClaimId: text("related_claim_id").references(() => claims.id),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["helper_hero", "detective", "community_star", "first_report", "first_claim"] }).notNull(),
  unlockedAt: integer("unlocked_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertItemSchema = createInsertSchema(items).pick({
  type: true,
  itemName: true,
  description: true,
  location: true,
  date: true,
  contactInfo: true,
  imageUrl: true,
});

export const insertClaimSchema = createInsertSchema(claims).pick({
  itemId: true,
  evidenceText: true,
  evidenceImageUrl: true,
});

export const insertRewardSchema = createInsertSchema(rewards).pick({
  type: true,
  points: true,
  description: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).pick({
  type: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;

// Extended types for joins
export type ItemWithUser = Item & { user: User };
export type ClaimWithItem = Claim & { item: ItemWithUser; claimer: User };
export type UserWithStats = User & { 
  recentRewards?: Reward[];
  achievements?: Achievement[];
  rank?: number;
};
