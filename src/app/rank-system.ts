import type { Stats } from "./types";

export type SystemRank =
  | "E"
  | "D"
  | "C"
  | "B"
  | "A"
  | "S"
  | "SS"
  | "Monarch";

export function getTotalStatPoints(stats: Stats) {
  return (
    stats.strength +
    stats.vitality +
    stats.discipline +
    stats.intelligence +
    stats.agility +
    stats.magicResistance
  );
}

export function getRankScore(totalXp: number, stats: Stats) {
  return Math.floor(totalXp + getTotalStatPoints(stats) * 12);
}

export function getSystemRank(totalXp: number, stats: Stats): SystemRank {
  const score = getRankScore(totalXp, stats);
  const totalStats = getTotalStatPoints(stats);

  if (score >= 10000 && totalStats >= 160) return "Monarch";
  if (score >= 7200 && totalStats >= 115) return "SS";
  if (score >= 4800 && totalStats >= 80) return "S";
  if (score >= 3000 && totalStats >= 50) return "A";
  if (score >= 1700) return "B";
  if (score >= 800) return "C";
  if (score >= 250) return "D";
  return "E";
}

export function getRankLabel(rank: SystemRank) {
  switch (rank) {
    case "Monarch":
      return "Shadow Monarch Candidate";
    case "SS":
      return "Awakened Elite";
    case "S":
      return "High-Rank Hunter";
    case "A":
      return "Advanced Hunter";
    case "B":
      return "Trained Fighter";
    case "C":
      return "Disciplined Rookie";
    case "D":
      return "Unstable Awakening";
    case "E":
    default:
      return "Ordinary Human";
  }
}

export function getNextRank(rank: SystemRank): SystemRank | null {
  switch (rank) {
    case "E":
      return "D";
    case "D":
      return "C";
    case "C":
      return "B";
    case "B":
      return "A";
    case "A":
      return "S";
    case "S":
      return "SS";
    case "SS":
      return "Monarch";
    case "Monarch":
    default:
      return null;
  }
}

export function getRankThreshold(rank: SystemRank) {
  switch (rank) {
    case "E":
      return 0;
    case "D":
      return 250;
    case "C":
      return 800;
    case "B":
      return 1700;
    case "A":
      return 3000;
    case "S":
      return 4800;
    case "SS":
      return 7200;
    case "Monarch":
      return 10000;
  }
}

export function getRankStatRequirement(rank: SystemRank) {
  switch (rank) {
    case "A":
      return 50;
    case "S":
      return 80;
    case "SS":
      return 115;
    case "Monarch":
      return 160;
    case "E":
    case "D":
    case "C":
    case "B":
    default:
      return 0;
  }
}

export function getRankProgress(totalXp: number, stats: Stats) {
  const rank = getSystemRank(totalXp, stats);
  const nextRank = getNextRank(rank);
  const score = getRankScore(totalXp, stats);
  const totalStats = getTotalStatPoints(stats);
  const currentThreshold = getRankThreshold(rank);

  if (!nextRank) {
    return {
      rank,
      nextRank: null,
      score,
      currentThreshold,
      nextThreshold: null,
      progressPercent: 100,
      remainingScore: 0,
      requiredStats: getRankStatRequirement(rank),
      remainingStats: 0,
    };
  }

  const nextThreshold = getRankThreshold(nextRank);
  const requiredStats = getRankStatRequirement(nextRank);
  const range = nextThreshold - currentThreshold;
  const progress = score - currentThreshold;
  const scorePercent =
    range <= 0 ? 100 : Math.max(0, Math.min(100, (progress / range) * 100));
  const statPercent =
    requiredStats <= 0
      ? 100
      : Math.max(0, Math.min(100, (totalStats / requiredStats) * 100));

  return {
    rank,
    nextRank,
    score,
    currentThreshold,
    nextThreshold,
    progressPercent: Math.min(scorePercent, statPercent),
    remainingScore: Math.max(0, nextThreshold - score),
    requiredStats,
    remainingStats: Math.max(0, requiredStats - totalStats),
  };
}

