import type { Quest, SpecialQuest, Stats, UserProfile, UserRecord } from "./types";
import {
  calculateLevel,
  explainSpecialQuestChoice,
  getBuildFromStats,
  getCompletionRate,
  getDominantStat,
  getStatTotal,
} from "./logic";

export function getQuestProgress(quests: Quest[]) {
  const completedCount = quests.filter((quest) => quest.completed).length;
  const totalCount = quests.length;
  const remainingCount = totalCount - completedCount;
  const completionPercent = getCompletionRate(completedCount, totalCount);

  return {
    completedCount,
    totalCount,
    remainingCount,
    completionPercent,
    allCompleted: totalCount > 0 && completedCount === totalCount,
  };
}

export function getStatsSummary(stats: Stats) {
  return {
    detectedBuild: getBuildFromStats(stats),
    dominantStat: getDominantStat(stats),
    totalStatPoints: getStatTotal(stats),
  };
}

export function getSpecialQuestPresentation(
  specialQuest: SpecialQuest,
  profile: UserProfile
) {
  const canAccept = specialQuest.status === "pending";
  const canMarkUrgent =
    specialQuest.status !== "urgent" && !specialQuest.completed;
  const canComplete = !specialQuest.completed && !specialQuest.awardedToday;

  return {
    reason: explainSpecialQuestChoice(profile),
    canAccept,
    canMarkUrgent,
    canComplete,
    completionLabel:
      specialQuest.completed || specialQuest.awardedToday
        ? "Completed"
        : "Complete Special Quest",
  };
}

export function getDashboardViewModel(user: UserRecord) {
  const levelData = calculateLevel(user.totalXp);
  const questProgress = getQuestProgress(user.quests);
  const statsSummary = getStatsSummary(user.stats);
  const specialQuestUi = getSpecialQuestPresentation(
    user.specialQuest,
    user.profile
  );

  return {
    ...levelData,
    ...questProgress,
    ...statsSummary,
    ...specialQuestUi,
  };
}