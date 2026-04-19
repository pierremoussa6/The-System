import type { BuildType, Stats, UserProfile } from "./types";
import { getBuildFromStats as getBuildFromStatsFromEngine } from "./quest-engine";

const BASE_LEVEL_XP = 120;
const LEVEL_XP_GROWTH = 55;

function getXpRequiredForLevel(level: number) {
  if (level <= 1) return 0;
  return BASE_LEVEL_XP + (level - 2) * LEVEL_XP_GROWTH;
}

export function calculateLevel(totalXp: number) {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);
  let xpGoal = getXpRequiredForLevel(level + 1);

  while (remainingXp >= xpGoal) {
    remainingXp -= xpGoal;
    level += 1;
    xpGoal = getXpRequiredForLevel(level + 1);
  }

  const currentLevelXp = remainingXp;
  const progressPercent = Math.max(
    0,
    Math.min(100, (currentLevelXp / xpGoal) * 100)
  );

  return {
    level,
    currentLevelXp,
    xpGoal,
    progressPercent,
  };
}

export function getBuildFromStats(stats: Stats): BuildType {
  return getBuildFromStatsFromEngine(stats);
}

export function explainSpecialQuestChoice(profile: UserProfile) {
  const reasons: string[] = [];

  if (profile.preferredBuild !== "Balanced") {
    reasons.push(`preferred build is ${profile.preferredBuild}`);
  }

  if (profile.mainImprovementArea !== "Balanced") {
    reasons.push(`main improvement area is ${profile.mainImprovementArea}`);
  }

  if (profile.studyInterest !== "None") {
    reasons.push(`study interest is ${profile.studyInterest}`);
  }

  if (profile.sleepQuality === "Poor") {
    reasons.push("sleep quality is poor, so recovery is prioritized");
  }

  if (reasons.length === 0) {
    return "This quest was selected from your balanced default profile.";
  }

  return `This quest was selected because your ${reasons.join(", ")}.`;
}

export function getStatTotal(stats: Stats) {
  return stats.strength + stats.vitality + stats.discipline + stats.focus;
}

export function getDominantStat(stats: Stats) {
  const entries = [
    { key: "Strength", value: stats.strength },
    { key: "Vitality", value: stats.vitality },
    { key: "Discipline", value: stats.discipline },
    { key: "Focus", value: stats.focus },
  ] as const;

  const max = Math.max(...entries.map((entry) => entry.value));
  const winners = entries.filter((entry) => entry.value === max);

  if (winners.length !== 1) {
    return "Balanced";
  }

  return winners[0].key;
}

export function getCompletionRate(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
