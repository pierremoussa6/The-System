import type { Stats, UserRecord } from "./types";
import { getSystemRank } from "./rank-system";

export type AchievementTier = "common" | "rare" | "epic" | "legendary";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  unlocked: boolean;
};

function getTotalStatPoints(stats: Stats) {
  return stats.strength + stats.vitality + stats.discipline + stats.focus;
}

function hasCompletedAnyDailyQuest(user: UserRecord) {
  return user.log.some((entry) => entry.type === "daily_quest");
}

function hasCompletedAnySpecialQuest(user: UserRecord) {
  return user.log.some((entry) => entry.type === "special_quest");
}

function hasTriggeredPenalty(user: UserRecord) {
  return user.log.some((entry) => entry.type === "penalty");
}

function hasAllStatsAtLeast(stats: Stats, min: number) {
  return (
    stats.strength >= min &&
    stats.vitality >= min &&
    stats.discipline >= min &&
    stats.focus >= min
  );
}

function isBalancedBuild(stats: Stats, maxSpread = 2) {
  const values = [
    stats.strength,
    stats.vitality,
    stats.discipline,
    stats.focus,
  ];

  return Math.max(...values) - Math.min(...values) <= maxSpread;
}

function getUnlockedAchievements(user: UserRecord): Achievement[] {
  const totalStats = getTotalStatPoints(user.stats);
  const currentRank = getSystemRank(user.totalXp, user.stats);

  return [
    {
      id: "first_daily",
      title: "Gate Contact",
      description: "Clear your first daily quest.",
      tier: "common",
      unlocked: hasCompletedAnyDailyQuest(user),
    },
    {
      id: "first_special",
      title: "Directive Cleared",
      description: "Complete your first special quest.",
      tier: "rare",
      unlocked: hasCompletedAnySpecialQuest(user),
    },
    {
      id: "streak_3",
      title: "Initiate Chain",
      description: "Reach a 3-day streak.",
      tier: "common",
      unlocked: user.streak >= 3,
    },
    {
      id: "streak_7",
      title: "Seven-Day Oath",
      description: "Reach a 7-day streak.",
      tier: "rare",
      unlocked: user.streak >= 7,
    },
    {
      id: "streak_14",
      title: "Two-Week Contract",
      description: "Reach a 14-day streak.",
      tier: "epic",
      unlocked: user.streak >= 14,
    },
    {
      id: "xp_100",
      title: "Awakening",
      description: "Earn 250 total XP.",
      tier: "common",
      unlocked: user.totalXp >= 250,
    },
    {
      id: "xp_500",
      title: "Hunter Contract",
      description: "Earn 1,500 total XP.",
      tier: "rare",
      unlocked: user.totalXp >= 1500,
    },
    {
      id: "xp_5000",
      title: "Raid Veteran",
      description: "Earn 5,000 total XP.",
      tier: "legendary",
      unlocked: user.totalXp >= 5000,
    },
    {
      id: "stats_20",
      title: "Body Reconstruction",
      description: "Reach 40 total stat points.",
      tier: "rare",
      unlocked: totalStats >= 40,
    },
    {
      id: "balanced_core",
      title: "Balanced Core",
      description: "Keep all stats balanced with low spread.",
      tier: "epic",
      unlocked: totalStats >= 20 && isBalancedBuild(user.stats),
    },
    {
      id: "all_stats_5",
      title: "Complete Foundation",
      description: "Reach at least 10 points in every stat.",
      tier: "epic",
      unlocked: hasAllStatsAtLeast(user.stats, 10),
    },
    {
      id: "rank_b",
      title: "Recognized Hunter",
      description: "Reach rank B or higher.",
      tier: "rare",
      unlocked: ["B", "A", "S", "SS", "Monarch"].includes(currentRank),
    },
    {
      id: "rank_a",
      title: "Gate Captain",
      description: "Reach rank A or higher.",
      tier: "epic",
      unlocked: ["A", "S", "SS", "Monarch"].includes(currentRank),
    },
    {
      id: "rank_s",
      title: "S-Rank Presence",
      description: "Reach rank S or higher.",
      tier: "legendary",
      unlocked: ["S", "SS", "Monarch"].includes(currentRank),
    },
    {
      id: "rank_ss",
      title: "National-Level Shadow",
      description: "Reach rank SS or higher.",
      tier: "legendary",
      unlocked: ["SS", "Monarch"].includes(currentRank),
    },
    {
      id: "survived_penalty",
      title: "Penalty Witness",
      description: "Trigger a penalty at least once and keep moving.",
      tier: "epic",
      unlocked: hasTriggeredPenalty(user),
    },
  ];
}

export function getAchievementSummary(user: UserRecord) {
  const achievements = getUnlockedAchievements(user);
  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const locked = achievements.filter((achievement) => !achievement.unlocked);

  return {
    achievements,
    unlocked,
    locked,
    unlockedCount: unlocked.length,
    totalCount: achievements.length,
    completionPercent:
      achievements.length === 0
        ? 0
        : Math.round((unlocked.length / achievements.length) * 100),
  };
}

export function getRecentUnlockedAchievements(user: UserRecord, limit = 4) {
  const { unlocked } = getAchievementSummary(user);
  return unlocked.slice(-limit).reverse();
}

export function getAchievementTierClasses(tier: AchievementTier) {
  switch (tier) {
    case "legendary":
      return {
        border: "border-yellow-500",
        text: "text-yellow-300",
        badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
      };
    case "epic":
      return {
        border: "border-fuchsia-500",
        text: "text-fuchsia-300",
        badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
      };
    case "rare":
      return {
        border: "border-cyan-500",
        text: "text-cyan-300",
        badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
      };
    case "common":
    default:
      return {
        border: "border-zinc-600",
        text: "text-zinc-200",
        badge: "bg-zinc-700 text-zinc-200 border-zinc-600",
      };
  }
}
