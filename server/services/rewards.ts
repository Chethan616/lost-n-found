import { storage } from "../storage";
import type { InsertReward, InsertAchievement } from "@shared/schema";

// Point values for different actions
export const REWARD_POINTS = {
  REPORT_FOUND: 50,
  REPORT_LOST: 20,
  CLAIM_APPROVED: 100,
  ITEM_REUNITED: 150,
  HELPED_SOMEONE: 75,
};

// Achievement thresholds
export const ACHIEVEMENT_THRESHOLDS = {
  HELPER_HERO: 5, // 5+ found items
  DETECTIVE: 10, // 10+ successful claims
  COMMUNITY_STAR: 500, // 500+ points
};

export async function awardPoints(
  userId: string,
  type: InsertReward["type"],
  points: number,
  description: string,
  relatedItemId?: string,
  relatedClaimId?: string
): Promise<void> {
  try {
    // Create reward record
    await storage.createReward({
      userId,
      type,
      points,
      description,
      relatedItemId,
      relatedClaimId,
    });

    // Update user points
    await storage.updateUserPoints(userId, points);

    // Check for new achievements
    await checkAchievements(userId);
  } catch (error) {
    console.error("Failed to award points:", error);
  }
}

export async function checkAchievements(userId: string): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    const existingAchievements = await storage.getUserAchievements(userId);
    const achievementTypes = existingAchievements.map(a => a.type);

    // Check Helper Hero (5+ found items)
    if (!achievementTypes.includes("helper_hero")) {
      const userItems = await storage.getUserItems(userId);
      const foundItems = userItems.filter(i => i.type === "found");
      if (foundItems.length >= ACHIEVEMENT_THRESHOLDS.HELPER_HERO) {
        await storage.createAchievement({ userId, type: "helper_hero" });
      }
    }

    // Check Detective (10+ successful claims)
    if (!achievementTypes.includes("detective")) {
      const userClaims = await storage.getClaims(undefined, userId);
      const approvedClaims = userClaims.filter(c => c.status === "approved");
      if (approvedClaims.length >= ACHIEVEMENT_THRESHOLDS.DETECTIVE) {
        await storage.createAchievement({ userId, type: "detective" });
      }
    }

    // Check Community Star (500+ points)
    if (!achievementTypes.includes("community_star") && user.points >= ACHIEVEMENT_THRESHOLDS.COMMUNITY_STAR) {
      await storage.createAchievement({ userId, type: "community_star" });
    }

    // Check First Report
    if (!achievementTypes.includes("first_report")) {
      const userItems = await storage.getUserItems(userId);
      if (userItems.length === 1) {
        await storage.createAchievement({ userId, type: "first_report" });
      }
    }

    // Check First Claim
    if (!achievementTypes.includes("first_claim")) {
      const userClaims = await storage.getClaims(undefined, userId);
      if (userClaims.length === 1) {
        await storage.createAchievement({ userId, type: "first_claim" });
      }
    }
  } catch (error) {
    console.error("Failed to check achievements:", error);
  }
}

export function getAchievementInfo(type: InsertAchievement["type"]): { name: string; description: string; icon: string } {
  const info = {
    helper_hero: {
      name: "Helper Hero",
      description: "Reported 5+ found items",
      icon: "🦸",
    },
    detective: {
      name: "Detective",
      description: "Successfully claimed 10+ items",
      icon: "🔍",
    },
    community_star: {
      name: "Community Star",
      description: "Earned 500+ points",
      icon: "⭐",
    },
    first_report: {
      name: "First Steps",
      description: "Reported your first item",
      icon: "🎯",
    },
    first_claim: {
      name: "Claim Starter",
      description: "Submitted your first claim",
      icon: "🎬",
    },
  };

  return info[type];
}
