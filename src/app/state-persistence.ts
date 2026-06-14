import type { UserRecord } from "./types";

const MAX_REMOTE_LOG_ENTRIES = 120;
const MAX_REMOTE_HISTORY_ENTRIES = 180;
const MAX_REMOTE_JOURNAL_ENTRIES = 90;
const MAX_REMOTE_TASK_HISTORY_ENTRIES = 180;
const MAX_REMOTE_ARTIFACT_HISTORY_ENTRIES = 120;
const MAX_REMOTE_DIET_FEEDBACK_ENTRIES = 60;
const MAX_REMOTE_FUN_ACTIVITY_ENTRIES = 20;
const MAX_REMOTE_SPECIAL_QUEST_MEMORY_ENTRIES = 40;

function keepFirst<T>(items: T[] | undefined, maxItems: number): T[] {
  return Array.isArray(items) ? items.slice(0, maxItems) : [];
}

function keepLast<T>(items: T[] | undefined, maxItems: number): T[] {
  return Array.isArray(items) ? items.slice(-maxItems) : [];
}

export function createCompactAppState(user: UserRecord): UserRecord {
  const compact: UserRecord = {
    ...user,
    history: keepLast(user.history, MAX_REMOTE_HISTORY_ENTRIES),
    workoutJournal: keepFirst(user.workoutJournal, MAX_REMOTE_JOURNAL_ENTRIES),
    householdTasks: keepFirst(user.householdTasks, MAX_REMOTE_JOURNAL_ENTRIES),
    taskHistory: keepFirst(user.taskHistory, MAX_REMOTE_TASK_HISTORY_ENTRIES),
    funSpecialActivities: keepFirst(
      user.funSpecialActivities,
      MAX_REMOTE_FUN_ACTIVITY_ENTRIES
    ),
    foodJournal: keepFirst(user.foodJournal, MAX_REMOTE_JOURNAL_ENTRIES),
    dietFeedback: keepFirst(
      user.dietFeedback,
      MAX_REMOTE_DIET_FEEDBACK_ENTRIES
    ),
    log: keepFirst(user.log, MAX_REMOTE_LOG_ENTRIES),
    activeEffects: {
      ...user.activeEffects,
      artifactEffects: keepFirst(
        user.activeEffects.artifactEffects,
        MAX_REMOTE_ARTIFACT_HISTORY_ENTRIES
      ),
    },
    artifactHistory: keepFirst(
      user.artifactHistory,
      MAX_REMOTE_ARTIFACT_HISTORY_ENTRIES
    ),
    specialQuestMemory: user.specialQuestMemory
      ? {
          recentTitles: keepFirst(
            user.specialQuestMemory.recentTitles,
            MAX_REMOTE_SPECIAL_QUEST_MEMORY_ENTRIES
          ),
          recentSources: keepFirst(
            user.specialQuestMemory.recentSources,
            MAX_REMOTE_SPECIAL_QUEST_MEMORY_ENTRIES
          ),
          recentJobFocuses: keepFirst(
            user.specialQuestMemory.recentJobFocuses,
            MAX_REMOTE_SPECIAL_QUEST_MEMORY_ENTRIES
          ),
        }
      : undefined,
  };

  delete compact.mediaLibrary;
  delete compact.creatorAuditLog;

  return compact;
}
