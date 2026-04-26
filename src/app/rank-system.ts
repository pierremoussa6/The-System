import { calculateLevel } from "./logic";
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

type RankRequirement = {
  rank: SystemRank;
  label: string;
  minLevel: number;
  minStats: number;
};

const rankRequirements: RankRequirement[] = [
  { rank: "E", label: "Ordinary Human", minLevel: 1, minStats: 0 },
  { rank: "D", label: "Unstable Awakening", minLevel: 3, minStats: 6 },
  { rank: "C", label: "Disciplined Rookie", minLevel: 15, minStats: 45 },
  { rank: "B", label: "Trained Fighter", minLevel: 22, minStats: 75 },
  { rank: "A", label: "Advanced Hunter", minLevel: 32, minStats: 110 },
  { rank: "S", label: "High-Rank Hunter", minLevel: 45, minStats: 155 },
  { rank: "SS", label: "Awakened Elite", minLevel: 60, minStats: 215 },
  {
    rank: "Monarch",
    label: "Shadow Monarch Candidate",
    minLevel: 80,
    minStats: 300,
  },
];

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

function getRequirement(rank: SystemRank) {
  return rankRequirements.find((entry) => entry.rank === rank) ?? rankRequirements[0];
}

export function getRankScore(totalXp: number, stats: Stats) {
  const level = calculateLevel(totalXp).level;
  return level * 1000 + getTotalStatPoints(stats);
}

export function getSystemRank(totalXp: number, stats: Stats): SystemRank {
  const level = calculateLevel(totalXp).level;
  const totalStats = getTotalStatPoints(stats);
  let currentRank: SystemRank = "E";

  for (const requirement of rankRequirements) {
    if (level >= requirement.minLevel && totalStats >= requirement.minStats) {
      currentRank = requirement.rank;
    }
  }

  return currentRank;
}

export function getRankLabel(rank: SystemRank) {
  return getRequirement(rank).label;
}

export function getNextRank(rank: SystemRank): SystemRank | null {
  const index = rankRequirements.findIndex((entry) => entry.rank === rank);
  if (index === -1 || index === rankRequirements.length - 1) {
    return null;
  }

  return rankRequirements[index + 1]?.rank ?? null;
}

export function getRankThreshold(rank: SystemRank) {
  return getRequirement(rank).minLevel;
}

export function getRankStatRequirement(rank: SystemRank) {
  return getRequirement(rank).minStats;
}

export function getRankProgress(totalXp: number, stats: Stats) {
  const rank = getSystemRank(totalXp, stats);
  const nextRank = getNextRank(rank);
  const totalStats = getTotalStatPoints(stats);
  const currentLevel = calculateLevel(totalXp).level;
  const score = getRankScore(totalXp, stats);
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
      currentLevel,
      remainingLevels: 0,
    };
  }

  const nextThreshold = getRankThreshold(nextRank);
  const requiredStats = getRankStatRequirement(nextRank);
  const levelRange = Math.max(1, nextThreshold - currentThreshold);
  const levelProgress = Math.max(0, currentLevel - currentThreshold);
  const levelPercent = Math.max(
    0,
    Math.min(100, (levelProgress / levelRange) * 100)
  );
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
    progressPercent: Math.min(levelPercent, statPercent),
    remainingScore: Math.max(0, nextThreshold - currentLevel),
    requiredStats,
    remainingStats: Math.max(0, requiredStats - totalStats),
    currentLevel,
    remainingLevels: Math.max(0, nextThreshold - currentLevel),
  };
}
