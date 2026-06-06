"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  AiSystemAnalysis,
  AiWeeklyPlan,
  AppState,
  ArtifactActionResult,
  ArtifactKey,
  ActiveEffects,
  DietFeedback,
  FoodJournalEntry,
  HouseholdTaskInput,
  HouseholdTaskKind,
  MultiUserData,
  SpecialQuestTemplate,
  Stats,
  UserProfile,
  UserRecord,
  WorkoutJournalEntry,
  WorkoutProgram,
} from "./types";

import {
  addArtifactCopy,
  applyArtifactRewardModifiers,
  consumeArtifactCopy,
  createActiveArtifactEffect,
  createDefaultActiveEffects,
  getArtifactMeta,
  getArtifactPurchaseState,
  getDailyQuestOverride,
  getNextRankUpRequirements,
  getNewArtifactUnlocks,
  getSpendableXp,
  normalizeActiveEffects,
  unlockArtifacts,
} from "./artifacts";

import {
  appendHistoryEntry,
  appendLog,
  appendSpecialQuestMemory,
  cancelSpecialQuestForRecovery,
  createDailyQuests,
  createDailySpecialQuest,
  createFunSpecialActivity,
  createNewUserRecord,
  createSpecialQuestFromAiSuggestion,
  defaultStats,
  getActiveAiQuest,
  getNextAiQuestIndex,
  getPreviewSpecialQuests,
  getQuestStatRewards,
  getTimestampString,
  getTodayString,
  getYesterdayString,
  normalizeStats,
  normalizeSpecialQuestMemory,
  normalizeUserForToday,
  shouldUseRecoveryMode,
} from "./quest-engine";
import {
  addStatRewards,
  formatRewardText,
  hasPositiveStatRewards,
  type RewardBundle,
} from "./reward-system";
import {
  createTaskHistoryEntry,
  createHouseholdTask,
  getHouseholdTaskReward,
} from "./task-system";
import { useAuth } from "./auth-context";
import { getSupabaseBrowserClient } from "./lib/supabase/client";
import { shouldAssignSpecialQuest } from "./schedule";
import { sanitizeWeeklyPlanForProfile } from "./weekly-plan-system";
import {
  buildWorkoutProgram,
  sanitizeWorkoutProgramForProfile,
} from "./workout-system";

const STORAGE_KEY = "the-system-multi-user-data";
const SAVE_DELAY_MS = 600;

const AppContext = createContext<AppState | null>(null);

function createSingleUserData(user: UserRecord): MultiUserData {
  return {
    users: [user],
    activeUserId: user.id,
  };
}

function createDefaultMultiUserData(name = "Player 1"): MultiUserData {
  return createSingleUserData(createNewUserRecord(name));
}

function loadInitialMultiUserData(): MultiUserData {
  if (typeof window === "undefined") {
    return createDefaultMultiUserData();
  }

  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createDefaultMultiUserData();
  }

  try {
    const parsed = JSON.parse(saved) as MultiUserData;

    const parsedUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const normalizedUsers = parsedUsers.map((user) =>
      normalizeUserForToday(user)
    );

    if (normalizedUsers.length === 0) {
      return createDefaultMultiUserData();
    }

    let activeUserId = parsed.activeUserId;

    if (!activeUserId || !normalizedUsers.some((user) => user.id === activeUserId)) {
      activeUserId = normalizedUsers[0].id;
    }

    return {
      users: normalizedUsers,
      activeUserId,
    };
  } catch {
    return createDefaultMultiUserData();
  }
}

function getLocalActiveUser(data: MultiUserData) {
  return (
    data.users.find((user) => user.id === data.activeUserId) ??
    data.users[0] ??
    null
  );
}

function isUserRecord(value: unknown): value is UserRecord {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<UserRecord>;
  return Boolean(
    candidate.id &&
      candidate.profile &&
      candidate.stats &&
      candidate.specialQuest &&
      Array.isArray(candidate.quests) &&
      Array.isArray(candidate.log)
  );
}

function prepareAuthenticatedUserRecord(
  authUserId: string,
  displayName: string,
  sourceUser?: UserRecord | null
) {
  const baseUser = sourceUser ?? createNewUserRecord(displayName);
  const nextProfile: UserProfile = {
    ...baseUser.profile,
    name: baseUser.profile.name || displayName,
  };

  return normalizeUserForToday({
    ...baseUser,
    id: authUserId,
    profile: nextProfile,
    stats: normalizeStats(baseUser.stats),
  });
}

function getUserStatePayload(user: UserRecord) {
  return {
    user_id: user.id,
    total_xp: user.totalXp,
    lifetime_xp: user.lifetimeXp ?? user.totalXp,
    spendable_xp: user.spendableXp ?? user.totalXp,
    streak: user.streak,
    last_completion_date: user.lastCompletionDate,
    strength: user.stats.strength,
    vitality: user.stats.vitality,
    discipline: user.stats.discipline,
    focus: user.stats.intelligence,
    intelligence: user.stats.intelligence,
    agility: user.stats.agility,
    magic_resistance: user.stats.magicResistance,
    daily_hp: user.dailyHp,
    daily_hp_date: user.dailyHpDate,
    ai_analysis_json: user.aiAnalysis,
    ai_weekly_plan_json: user.aiWeeklyPlan,
    workout_program_json: user.workoutProgram,
    ai_quest_index: user.aiQuestIndex,
    active_effects_json: user.activeEffects,
    artifact_history_json: user.artifactHistory ?? [],
    task_history_json: user.taskHistory ?? [],
    app_state_json: user,
    updated_at: new Date().toISOString(),
  };
}

function applyArtifactUnlockRewards(user: UserRecord): UserRecord {
  const unlockedKeys = getNewArtifactUnlocks(user);

  if (unlockedKeys.length === 0) return user;

  const nextArtifacts = unlockArtifacts(user.artifacts, unlockedKeys);
  const nextLog = unlockedKeys.reduce((log, key) => {
    const meta = getArtifactMeta(key);

    return appendLog(log, {
      type: "artifact",
      title: `Artifact Unlocked: ${meta.title}`,
      details: `${meta.rarity.toUpperCase()} discovery. Condition: ${meta.unlockHint} ${meta.lore}`,
    });
  }, user.log);

  return {
    ...user,
    artifacts: nextArtifacts,
    log: nextLog,
  };
}

function applyRewardBundle(
  user: UserRecord,
  reward: RewardBundle,
  logEntry: {
    type: UserRecord["log"][number]["type"];
    title: string;
    details?: string;
  },
  source:
    | "daily_quest"
    | "special_quest"
    | "fun_special_activity"
    | "household_task"
    | "artifact_bonus"
    | "artifact_challenge"
    | "system" = "system"
): UserRecord {
  const modified = applyArtifactRewardModifiers(
    user,
    reward,
    source,
    logEntry.title
  );
  const finalReward = modified.reward;
  const nextStats = addStatRewards(user.stats, finalReward.statRewards);
  const gainedStats = hasPositiveStatRewards(finalReward.statRewards);
  const nextHistory = gainedStats
    ? appendHistoryEntry(user.history, nextStats)
    : user.history;
  let nextLog = appendLog(user.log, {
    type: logEntry.type,
    title: logEntry.title,
    details:
      logEntry.details ??
      `Completed for ${formatRewardText(finalReward)}.`,
  });

  for (const details of modified.logs) {
    nextLog = appendLog(nextLog, {
      type: "artifact",
      title: "Artifact Effect Applied",
      details,
    });
  }

  return applyArtifactUnlockRewards({
    ...user,
    lifetimeXp: (user.lifetimeXp ?? user.totalXp) + finalReward.xp,
    totalXp: user.totalXp + finalReward.xp,
    spendableXp: getSpendableXp(user) + finalReward.xp,
    stats: nextStats,
    history: nextHistory,
    log: nextLog,
    activeEffects: modified.activeEffects,
  });
}

function useClientReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user: authUser, profile: authProfile } = useAuth();
  const [data, setData] = useState<MultiUserData>(() => loadInitialMultiUserData());
  const [remoteLoadedUserId, setRemoteLoadedUserId] = useState<string | null>(
    null
  );
  const remoteSaveReadyRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientReady = useClientReady();
  const isUsingRemoteState = authStatus === "authenticated" && Boolean(authUser);
  const remoteStateLoaded =
    !isUsingRemoteState || remoteLoadedUserId === authUser?.id;
  const isLoaded = clientReady && remoteStateLoaded;

  useEffect(() => {
    if (!clientReady || authStatus !== "unconfigured") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [authStatus, clientReady, data]);

  useEffect(() => {
    if (!clientReady || !isUsingRemoteState || !authUser) {
      remoteSaveReadyRef.current = false;
      return;
    }

    let isMounted = true;
    const authUserId = authUser.id;
    const authUserEmail = authUser.email;

    async function loadRemoteState() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      remoteSaveReadyRef.current = false;

      const displayName =
        authProfile?.display_name ?? authUserEmail?.split("@")[0] ?? "Player";

      const { data: remoteState, error } = await supabase
        .from("user_state")
        .select("app_state_json")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load remote user state", error);
      }

      const remoteRecord = isUserRecord(remoteState?.app_state_json)
        ? remoteState.app_state_json
        : null;

      const localUser = getLocalActiveUser(loadInitialMultiUserData());
      const nextUser = prepareAuthenticatedUserRecord(
        authUserId,
        displayName,
        remoteRecord ?? localUser
      );

      setData(createSingleUserData(nextUser));
      setRemoteLoadedUserId(authUserId);
      remoteSaveReadyRef.current = true;

      if (!remoteRecord) {
        const { error: upsertError } = await supabase
          .from("user_state")
          .upsert(getUserStatePayload(nextUser), { onConflict: "user_id" });

        if (upsertError) {
          console.error("Failed to create remote user state", upsertError);
        }
      }
    }

    void loadRemoteState();

    return () => {
      isMounted = false;
    };
  }, [
    authProfile?.display_name,
    authUser,
    authUser?.id,
    authUser?.email,
    clientReady,
    isUsingRemoteState,
  ]);

  useEffect(() => {
    if (
      !isUsingRemoteState ||
      remoteLoadedUserId !== authUser?.id ||
      !remoteSaveReadyRef.current
    ) {
      return;
    }

    const activeRemoteUser = getLocalActiveUser(data);
    const supabase = getSupabaseBrowserClient();

    if (!activeRemoteUser || !supabase) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void supabase
        .from("user_state")
        .upsert(getUserStatePayload(activeRemoteUser), {
          onConflict: "user_id",
        })
        .then(({ error }) => {
          if (error) {
            console.error("Failed to save remote user state", error);
          }
        });
    }, SAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [authUser?.id, data, isUsingRemoteState, remoteLoadedUserId]);

  const activeUser =
    data.users.find((user) => user.id === data.activeUserId) ?? null;

  function updateActiveUser(updater: (user: UserRecord) => UserRecord) {
    setData((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === current.activeUserId ? updater(user) : user
      ),
    }));
  }

  function toggleQuest(id: number) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();
      const dailyQuestOverride = getDailyQuestOverride(current.activeEffects, today);

      if (dailyQuestOverride === "emperor_cancelled") {
        return {
          ...current,
          log: appendLog(current.log, {
            type: "artifact",
            title: "The Emperor's Law",
            details:
              "Daily quest completion was blocked because today's quests are cancelled by The Emperor.",
          }),
        };
      }

      let xpToAdd = 0;
      let statRewards: Partial<Stats> = {};
      let loggedQuestTitle = "";
      let nextActiveEffects = normalizeActiveEffects(current.activeEffects);
      let modifierLogs: string[] = [];

      const nextQuests = current.quests.map((quest) => {
        if (quest.id !== id) return quest;

        if (!quest.completed) {
          if (!quest.awardedToday) {
            const modified = applyArtifactRewardModifiers(
              { ...current, activeEffects: nextActiveEffects },
              {
                xp: quest.xp,
                statRewards: getQuestStatRewards(quest.id, quest),
              },
              "daily_quest",
              quest.title
            );

            xpToAdd = modified.reward.xp;
            statRewards = modified.reward.statRewards;
            loggedQuestTitle = quest.title;
            nextActiveEffects = modified.activeEffects;
            modifierLogs = modified.logs;
          }

          return {
            ...quest,
            completed: true,
            awardedToday: true,
          };
        }

        return {
          ...quest,
          completed: false,
        };
      });

      let nextStats = addStatRewards(current.stats, statRewards);
      let nextHistory = current.history;
      let nextLog = current.log;

      const gainedDirectStats = hasPositiveStatRewards(statRewards);

      if (gainedDirectStats) {
        nextHistory = appendHistoryEntry(nextHistory, nextStats);
        nextLog = appendLog(nextLog, {
          type: "daily_quest",
          title: loggedQuestTitle,
          details: `Completed for ${formatRewardText({
            xp: xpToAdd,
            statRewards,
          })}.`,
        });
      }

      for (const details of modifierLogs) {
        nextLog = appendLog(nextLog, {
          type: "artifact",
          title: "Artifact Effect Applied",
          details,
        });
      }

      const allCompleted =
        nextQuests.length > 0 && nextQuests.every((quest) => quest.completed);

      let nextStreak = current.streak;
      let nextLastCompletionDate = current.lastCompletionDate;

      if (allCompleted && current.lastCompletionDate !== today) {
        nextStreak =
          current.lastCompletionDate === yesterday ? current.streak + 1 : 1;
        nextLastCompletionDate = today;

        nextStats = addStatRewards(nextStats, { discipline: 1 });
        nextHistory = appendHistoryEntry(nextHistory, nextStats);

        nextLog = appendLog(nextLog, {
          type: "system_notice",
          title: "Daily Protocol Cleared",
          details: `All daily quests completed. Streak protocol preserved at ${nextStreak} day(s).`,
        });
      }

      return applyArtifactUnlockRewards({
        ...current,
        quests: nextQuests,
        lifetimeXp: (current.lifetimeXp ?? current.totalXp) + xpToAdd,
        totalXp: current.totalXp + xpToAdd,
        spendableXp: getSpendableXp(current) + xpToAdd,
        streak: nextStreak,
        lastCompletionDate: nextLastCompletionDate,
        stats: nextStats,
        history: nextHistory,
        log: nextLog,
        activeEffects: nextActiveEffects,
      });
    });
  }

  function completeSpecialQuest() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      if (current.specialQuest.completed || current.specialQuest.awardedToday) {
        return current;
      }

      const rewardedUser = applyRewardBundle(current, {
        xp: current.specialQuest.xp,
        statRewards: current.specialQuest.statRewards,
      }, {
        type: "special_quest",
        title: current.specialQuest.title,
      }, "special_quest");

      return {
        ...rewardedUser,
        specialQuest: {
          ...current.specialQuest,
          completed: true,
          awardedToday: true,
          status: "completed",
        },
      };
    });
  }

  function acceptSpecialQuest() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      if (current.specialQuest.status !== "pending") {
        return current;
      }

      return {
        ...current,
        log: appendLog(current.log, {
          type: "special_status",
          title: current.specialQuest.title,
          details: "Special quest accepted.",
        }),
        specialQuest: {
          ...current.specialQuest,
          status: "accepted",
        },
      };
    });
  }

  function markSpecialQuestUrgent() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      if (
        current.specialQuest.status === "urgent" ||
        current.specialQuest.completed
      ) {
        return current;
      }

      return {
        ...current,
        log: appendLog(current.log, {
          type: "special_status",
          title: current.specialQuest.title,
          details: "Special quest marked as urgent.",
        }),
        specialQuest: {
          ...current.specialQuest,
          status: "urgent",
        },
      };
    });
  }

  function clearPenaltyNotice() {
    if (!activeUser) return;

    updateActiveUser((current) => ({
      ...current,
      penaltyNotice: null,
    }));
  }

  function updateProfile(profile: UserProfile) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const safeProfile: UserProfile = {
        ...current.profile,
        ...profile,
      };
      const safeMemory = normalizeSpecialQuestMemory(
        current.specialQuestMemory
      );
      const nextWorkoutProgram = buildWorkoutProgram(
        safeProfile,
        current.totalXp,
        current.aiAnalysis
      );
      const nextSpecialQuest = createDailySpecialQuest(
        getTodayString(),
        current.stats,
        safeProfile,
        current.aiAnalysis,
        safeMemory
      );
      const effectiveSpecialQuest = shouldUseRecoveryMode(current.dailyHp)
        ? cancelSpecialQuestForRecovery(nextSpecialQuest)
        : nextSpecialQuest;

      const nextLog = appendLog(current.log, {
        type: "system_notice",
        title: "Hunter Profile Updated",
        details:
          `Preferences recalibrated. Build preference: ${safeProfile.preferredBuild}. ` +
          `Difficulty: ${safeProfile.difficulty}. Rotation: ${safeProfile.questRotationPreference}.`,
      });

      return {
        ...current,
        profile: safeProfile,
        workoutProgram: nextWorkoutProgram,
        quests: createDailyQuests(
          safeProfile,
          getTodayString(),
          nextWorkoutProgram
        ),
        specialQuest: effectiveSpecialQuest,
        specialQuestMemory: appendSpecialQuestMemory(
          safeMemory,
          effectiveSpecialQuest
        ),
        log: nextLog,
      };
    });
  }

  function updateAiAnalysis(analysis: AiSystemAnalysis | null) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const canAssignSpecial = shouldAssignSpecialQuest(today, current.profile);
      const firstAiQuestIndex = canAssignSpecial
        ? getNextAiQuestIndex(
            analysis,
            -1,
            [],
            current.profile,
            current.specialQuestMemory
          )
        : 0;
      const firstAiQuest = canAssignSpecial
        ? getActiveAiQuest(analysis, firstAiQuestIndex)
        : null;
      const generatedSpecialQuest = firstAiQuest
        ? createSpecialQuestFromAiSuggestion(
            firstAiQuest,
            today,
            current.profile,
            analysis
          )
        : current.specialQuest;
      const nextSpecialQuest = shouldUseRecoveryMode(current.dailyHp)
        ? cancelSpecialQuestForRecovery(generatedSpecialQuest)
        : generatedSpecialQuest;

      let nextLog = current.log;

      if (analysis) {
        nextLog = appendLog(nextLog, {
          type: "system_analysis",
          title: "System Diagnosis Complete",
          details:
            `Archetype: ${analysis.archetype}. Direction: ${analysis.primaryFocus}. ` +
            `Main Job: ${analysis.personalization?.mainJob.title ?? "Unknown"}. ` +
            `Secondary Job: ${analysis.personalization?.secondaryJob.title ?? "Unknown"}.`,
        });

        if (firstAiQuest) {
          nextLog = appendLog(nextLog, {
            type: "system_rotation",
            title: `Mission Assigned: ${firstAiQuest.title}`,
            details: "The System selected the first AI-generated special quest from your current hunter rotation.",
          });
        }
      }

      const nextWorkoutProgram = buildWorkoutProgram(
        current.profile,
        current.totalXp,
        analysis
      );

      return {
        ...current,
        aiAnalysis: analysis,
        aiQuestIndex: firstAiQuestIndex,
        workoutProgram: nextWorkoutProgram,
        quests: createDailyQuests(
          current.profile,
          today,
          nextWorkoutProgram
        ),
        specialQuest: nextSpecialQuest,
        specialQuestMemory: firstAiQuest
          ? appendSpecialQuestMemory(current.specialQuestMemory, nextSpecialQuest)
          : current.specialQuestMemory,
        log: nextLog,
      };
    });
  }

  function updateAiWeeklyPlan(plan: AiWeeklyPlan | null) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      let nextLog = current.log;
      const safePlan = plan ? sanitizeWeeklyPlanForProfile(plan, current.profile) : null;

      if (safePlan) {
        nextLog = appendLog(nextLog, {
          type: "weekly_plan",
          title: "Weekly Protocol Generated",
          details: `Objective: ${safePlan.weekObjective} Pressure level: ${safePlan.pressureLevel}. Missions issued: ${safePlan.missions.length}.`,
        });

        nextLog = appendLog(nextLog, {
          type: "system_notice",
          title: "System Warning Issued",
          details: safePlan.systemWarning,
        });
      }

      return {
        ...current,
        aiWeeklyPlan: safePlan,
        log: nextLog,
      };
    });
  }

  function updateWorkoutProgram(program: WorkoutProgram | null) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const safeProgram = program
        ? sanitizeWorkoutProgramForProfile(
            program,
            current.profile,
            current.totalXp,
            current.aiAnalysis
          )
        : buildWorkoutProgram(current.profile, current.totalXp, current.aiAnalysis);

      return {
        ...current,
        workoutProgram: safeProgram,
        quests: createDailyQuests(current.profile, getTodayString(), safeProgram),
        log: appendLog(current.log, {
          type: "system_notice",
          title: "Workout Program Updated",
          details:
            "The canonical workout plan was updated. Workout phases, daily training quest text, and journal exercise options now use the same plan.",
        }),
      };
    });
  }

  function updateDailyHp(hp: number) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const safeHp = Math.max(0, Math.min(100, Math.round(hp)));
      const enterRecovery = shouldUseRecoveryMode(safeHp);
      const shouldCancelSpecial =
        enterRecovery &&
        current.specialQuest.status !== "waived" &&
        !current.specialQuest.completed;

      return {
        ...current,
        dailyHp: safeHp,
        dailyHpDate: today,
        specialQuest: shouldCancelSpecial
          ? cancelSpecialQuestForRecovery(current.specialQuest)
          : current.specialQuest,
        log: shouldCancelSpecial
          ? appendLog(current.log, {
              type: "system_notice",
              title: "Recovery Mode Activated",
              details:
                "HP registered below 50. Focus on recovery and daily quests. The special quest is cancelled for today.",
            })
          : current.log,
      };
    });
  }

  function addWorkoutJournalEntry(entry: Omit<WorkoutJournalEntry, "id">) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const nextEntry: WorkoutJournalEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };

      return {
        ...current,
        workoutJournal: [nextEntry, ...(current.workoutJournal ?? [])].slice(0, 200),
        log: appendLog(current.log, {
          type: "workout_log",
          title: `${nextEntry.exerciseName} logged`,
          details:
            `${nextEntry.date} · ${nextEntry.sessionName} · ` +
            `${nextEntry.sets} set(s) x ${nextEntry.reps}` +
            (nextEntry.weightKg !== null ? ` @ ${nextEntry.weightKg} kg` : ""),
        }),
      };
    });
  }

  function addHouseholdTask(
    kind: HouseholdTaskKind,
    task: string | HouseholdTaskInput
  ) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const nextTask = createHouseholdTask(kind, task, getTimestampString());

      if (!nextTask) return current;

      return {
        ...current,
        householdTasks: [nextTask, ...(current.householdTasks ?? [])].slice(
          0,
          200
        ),
      };
    });
  }

  function completeHouseholdTask(id: string) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const completedTask = (current.householdTasks ?? []).find(
        (task) => task.id === id && !task.completed && !task.awarded
      );

      if (!completedTask) return current;

      const nextTasks = (current.householdTasks ?? []).map((task) => {
        if (task.id !== id || task.completed) return task;

        return {
          ...task,
          completed: true,
          awarded: true,
          completedAt: getTimestampString(),
        };
      });

      const reward = getHouseholdTaskReward(completedTask);
      const completedAt =
        nextTasks.find((task) => task.id === id)?.completedAt ??
        getTimestampString();
      const rewardedUser = applyRewardBundle(current, reward, {
        type: "household_task",
        title: completedTask.title,
      }, "household_task");

      return {
        ...rewardedUser,
        householdTasks: nextTasks,
        taskHistory: [
          createTaskHistoryEntry(completedTask, reward, completedAt),
          ...(rewardedUser.taskHistory ?? current.taskHistory ?? []),
        ].slice(0, 300),
      };
    });
  }

  function deleteHouseholdTask(id: string) {
    if (!activeUser) return;

    updateActiveUser((current) => ({
      ...current,
      householdTasks: (current.householdTasks ?? []).filter(
        (task) => task.id !== id
      ),
    }));
  }

  function generateFunSpecialActivity() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const activity = createFunSpecialActivity(
        getTodayString(),
        current.stats,
        current.profile,
        current.aiAnalysis,
        current.funSpecialActivities ?? [],
        shouldUseRecoveryMode(current.dailyHp)
      );

      return {
        ...current,
        funSpecialActivities: [
          activity,
          ...(current.funSpecialActivities ?? []),
        ].slice(0, 12),
        log: appendLog(current.log, {
          type: "system_rotation",
          title: `Fun Activity Generated: ${activity.title}`,
          details:
            "A profile-aware optional activity was generated without replacing the scheduled special quest.",
        }),
      };
    });
  }

  function completeFunSpecialActivity(id: number) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const activity = (current.funSpecialActivities ?? []).find(
        (item) => item.id === id && !item.completed && !item.awardedToday
      );

      if (!activity) return current;

      const reward = {
        xp: activity.xp,
        statRewards: activity.statRewards,
      };
      const nextActivities = (current.funSpecialActivities ?? []).map((item) =>
        item.id === id
          ? {
              ...item,
              completed: true,
              awardedToday: true,
              status: "completed" as const,
            }
          : item
      );
      const rewardedUser = applyRewardBundle(current, reward, {
        type: "special_quest",
        title: activity.title,
      }, "fun_special_activity");

      return {
        ...rewardedUser,
        funSpecialActivities: nextActivities,
      };
    });
  }

  function addFoodJournalEntry(entry: Omit<FoodJournalEntry, "id">) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const nextEntry: FoodJournalEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };

      return {
        ...current,
        foodJournal: [nextEntry, ...(current.foodJournal ?? [])].slice(0, 500),
        log: appendLog(current.log, {
          type: "nutrition",
          title: `${nextEntry.foodName} logged`,
          details:
            `${nextEntry.date} · ${nextEntry.quantity || "portion"} · ` +
            `${nextEntry.calories} kcal, ${nextEntry.protein}g protein`,
        }),
      };
    });
  }

  function deleteFoodJournalEntry(id: string) {
    if (!activeUser) return;

    updateActiveUser((current) => ({
      ...current,
      foodJournal: (current.foodJournal ?? []).filter(
        (entry) => entry.id !== id
      ),
    }));
  }

  function saveDietFeedback(feedback: DietFeedback) {
    if (!activeUser) return;

    updateActiveUser((current) => ({
      ...current,
      dietFeedback: [
        feedback,
        ...(current.dietFeedback ?? []).filter(
          (entry) => entry.date !== feedback.date
        ),
      ].slice(0, 30),
      log: appendLog(current.log, {
        type: "nutrition",
        title: `Diet Feedback: ${feedback.date}`,
        details: feedback.summary,
      }),
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function activateLegacyArtifact(key: string) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      const artifact = current.artifacts.find((item) => item.key === key);

      if (!artifact || !artifact.unlocked || !artifact.usable || artifact.quantity <= 0) {
        return current;
      }

      if (key === "legacy-rune" && current.activeEffects.doubleDailyXpDate === today) {
        return current;
      }

      if (
        key === "legacy-null" &&
        (!current.specialQuest ||
          current.specialQuest.completed ||
          current.specialQuest.awardedToday)
      ) {
        return current;
      }

      if (key === "legacy-rest" && current.lastCompletionDate === today) {
        return current;
      }

      const nextArtifacts = current.artifacts.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      );

      const meta = getArtifactMeta(key as ArtifactKey);

      if (key === "legacy-rune") {
        return {
          ...current,
          artifacts: nextArtifacts,
          activeEffects: {
            ...current.activeEffects,
            doubleDailyXpDate: today,
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details: "Legacy double-XP compatibility artifact activated.",
          }),
        };
      }

      if (key === "legacy-null") {
        return {
          ...current,
          artifacts: nextArtifacts,
          specialQuest: {
            ...current.specialQuest,
            completed: true,
            awardedToday: true,
            status: "waived",
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details: "Legacy special-quest waiver compatibility artifact activated.",
          }),
        };
      }

      if (key === "legacy-rest") {
        const nextStreak =
          current.lastCompletionDate === yesterday
            ? current.streak + 1
            : current.streak > 0
            ? current.streak
            : 1;

        return {
          ...current,
          artifacts: nextArtifacts,
          quests: current.quests.map((quest) => ({
            ...quest,
            completed: true,
            awardedToday: true,
          })),
          lastCompletionDate: today,
          streak: nextStreak,
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details: "Legacy recovery compatibility artifact activated.",
          }),
        };
      }

      return current;
    });
  }

  function getWeakestStatKey(stats: Stats): keyof Stats {
    return (Object.keys(stats) as Array<keyof Stats>).sort(
      (a, b) => stats[a] - stats[b]
    )[0];
  }

  function getStrongestStatKey(stats: Stats): keyof Stats {
    return (Object.keys(stats) as Array<keyof Stats>).sort(
      (a, b) => stats[b] - stats[a]
    )[0];
  }

  function addPointsToWeakestStats(stats: Stats, points: number): Stats {
    let nextStats = { ...stats };

    for (let index = 0; index < points; index += 1) {
      const key = getWeakestStatKey(nextStats);
      nextStats = {
        ...nextStats,
        [key]: nextStats[key] + 1,
      };
    }

    return nextStats;
  }

  function getWheelReward(stats: Stats): {
    outcome: string;
    xp: number;
    statRewards: Partial<Stats>;
  } {
    const roll = Math.random();
    const randomStat = getWeakestStatKey(stats);

    if (roll < 0.25) return { outcome: "+100 XP", xp: 100, statRewards: {} };
    if (roll < 0.45) return { outcome: "+200 XP", xp: 200, statRewards: {} };
    if (roll < 0.6) {
      return { outcome: "+2 random stat points", xp: 0, statRewards: { [randomStat]: 2 } };
    }
    if (roll < 0.7) {
      return { outcome: "+10 random stat points", xp: 0, statRewards: { [randomStat]: 10 } };
    }
    if (roll < 0.85) return { outcome: "No bonus", xp: 0, statRewards: {} };
    if (roll < 0.95) return { outcome: "+500 XP", xp: 500, statRewards: {} };
    if (roll < 0.99) return { outcome: "+800 XP", xp: 800, statRewards: {} };
    return { outcome: "Jackpot +2000 XP", xp: 2000, statRewards: {} };
  }

  function createArtifactActionResult(
    artifactId: ArtifactKey,
    eventType: ArtifactActionResult["eventType"],
    ok: boolean,
    message: string,
    metadata?: Record<string, unknown>
  ): ArtifactActionResult {
    return {
      ok,
      artifactId,
      eventType,
      message,
      metadata,
    };
  }

  function purchaseArtifact(key: ArtifactKey): ArtifactActionResult {
    let result = createArtifactActionResult(
      key,
      "purchase",
      false,
      "No active user selected."
    );

    if (!activeUser) return result;

    updateActiveUser((current) => {
      const state = getArtifactPurchaseState(current, key);
      const meta = getArtifactMeta(key as ArtifactKey);

      if (!state.canPurchase || state.cost === null) {
        result = createArtifactActionResult(
          key,
          "purchase",
          false,
          state.reason
        );

        return {
          ...current,
          log: appendLog(current.log, {
            type: "artifact",
            title: `Artifact Purchase Blocked: ${meta.title}`,
            details: state.reason,
          }),
        };
      }

      const activeEffects = normalizeActiveEffects(current.activeEffects);
      result = createArtifactActionResult(
        key,
        "purchase",
        true,
        `${meta.title} purchased for ${state.cost} spendable XP.`,
        {
          cost: state.cost,
          lifetimeXp: current.totalXp,
          spendableXpAfter: getSpendableXp(current) - state.cost,
        }
      );

      return {
        ...current,
        artifacts: addArtifactCopy(current.artifacts, key, "purchase"),
        spendableXp: getSpendableXp(current) - state.cost,
        activeEffects: {
          ...activeEffects,
          oneTimeUse:
            key === "fool_last_trick"
              ? { ...activeEffects.oneTimeUse, fool_last_trick: true }
              : activeEffects.oneTimeUse,
        },
        artifactHistory: [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            userId: current.id,
            artifactId: key,
            artifactName: meta.title,
            eventType: "purchased" as const,
            date: getTimestampString(),
            xpChange: -state.cost,
            details: `${meta.title} purchased for ${state.cost} spendable XP. Lifetime XP remains ${current.totalXp}.`,
          },
          ...(current.artifactHistory ?? []),
        ].slice(0, 200),
        log: appendLog(current.log, {
          type: "artifact",
          title: `Artifact Purchased: ${meta.title}`,
          details: `${state.cost} spendable XP spent. Lifetime XP remains ${current.totalXp}; rank cannot decrease from this purchase.`,
        }),
      };
    });

    return result;
  }

  function activateArtifact(key: ArtifactKey): ArtifactActionResult {
    let result = createArtifactActionResult(
      key,
      "activation",
      false,
      "Artifact was not activated."
    );

    if (!activeUser) return result;

    updateActiveUser((current) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();
      const activeEffects = normalizeActiveEffects(current.activeEffects);
      const artifact = current.artifacts.find((item) => item.key === key);
      const meta = getArtifactMeta(key as ArtifactKey);

      if (!artifact || !artifact.unlocked || !artifact.usable || artifact.quantity <= 0) {
        result = createArtifactActionResult(
          key,
          "activation",
          false,
          "No usable copy is available."
        );
        return current;
      }

      const hasActiveSameArtifact = activeEffects.artifactEffects.some(
        (effect) =>
          effect.artifactId === key &&
          (effect.status === "active" || effect.status === "unused")
      );

      if (
        (key === "sun_radiance" ||
          key === "judgement_shield" ||
          key === "devil_contract" ||
          key === "world_completion") &&
        hasActiveSameArtifact
      ) {
        result = createArtifactActionResult(
          key,
          "activation",
          false,
          `${meta.title} already has an unresolved active effect.`
        );
        return current;
      }

      if (key === "fool_last_trick") {
        if (activeEffects.oneTimeUse.fool_last_trick_used) {
          result = createArtifactActionResult(
            key,
            "activation",
            false,
            "The Fool's Last Trick has already been used."
          );
          return current;
        }

        const rankUp = getNextRankUpRequirements(current);
        const nextStats = addPointsToWeakestStats(
          current.stats,
          rankUp.statPointsNeeded
        );
        const lifetimeXpGain = rankUp.lifetimeXpNeeded;
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          rankUp.nextRank === null
            ? "The Fool laughs, but there is no higher rank to bend toward."
            : "The Fool laughs... reality bends... Rank Up!",
          {
            currentRank: rankUp.currentRank,
            nextRank: rankUp.nextRank,
            lifetimeXpGain,
            statPointsAdded: rankUp.statPointsNeeded,
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          lifetimeXp: (current.lifetimeXp ?? current.totalXp) + lifetimeXpGain,
          totalXp: current.totalXp + lifetimeXpGain,
          stats: nextStats,
          history:
            rankUp.statPointsNeeded > 0
              ? appendHistoryEntry(current.history, nextStats)
              : current.history,
          activeEffects: {
            ...activeEffects,
            oneTimeUse: {
              ...activeEffects.oneTimeUse,
              fool_last_trick: true,
              fool_last_trick_used: true,
            },
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              rankUp.nextRank === null
                ? "The Fool laughs, but there is no higher rank to bend toward."
                : `The Fool laughs... reality bends... Rank Up! Advanced toward Rank ${rankUp.nextRank}. Spendable XP was not changed.`,
          }),
        };
      }

      if (key === "sun_radiance") {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "The Sun rises. All quest XP is multiplied by 10 for 24 hours.",
          {
            expiresAt,
            multiplier: 10,
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "active"),
          activeEffects: {
            ...activeEffects,
            artifactEffects: [
              createActiveArtifactEffect(key, "quest_xp_multiplier", expiresAt, {
                multiplier: 10,
              }),
              ...activeEffects.artifactEffects,
            ],
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              "The Sun rises. All quest XP is multiplied by 10 for 24 hours.",
          }),
        };
      }

      if (key === "judgement_shield") {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "Judgement has raised its shield. Your streak is protected for 7 days.",
          {
            expiresAt,
            days: 7,
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "active"),
          activeEffects: {
            ...activeEffects,
            artifactEffects: [
              createActiveArtifactEffect(key, "streak_shield", expiresAt, {
                days: 7,
              }),
              ...activeEffects.artifactEffects,
            ],
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              "Judgement has raised its shield. Your streak is protected for 7 days.",
          }),
        };
      }

      if (key === "emperor_law") {
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "Quests cancelled by order of the Emperor.",
          {
            date: today,
            dailyQuestOverride: "emperor_cancelled",
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          lastCompletionDate: today,
          streak: Math.max(1, current.streak),
          activeEffects: {
            ...activeEffects,
            dailyQuestOverrides: {
              ...activeEffects.dailyQuestOverrides,
              [today]: "emperor_cancelled",
            },
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              "Quests cancelled by order of the Emperor. No quest rewards were granted.",
          }),
        };
      }

      if (key === "hanged_man_rope") {
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "Time hangs still.",
          {
            date: today,
            dailyQuestOverride: "hanged_man_paused",
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          lastCompletionDate: today,
          streak: Math.max(1, current.streak),
          activeEffects: {
            ...activeEffects,
            dailyQuestOverrides: {
              ...activeEffects.dailyQuestOverrides,
              [today]: "hanged_man_paused",
            },
          },
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              "Time hangs still. The streak is frozen for today; failed-task stat loss can still apply.",
          }),
        };
      }

      if (key === "tower_ruins") {
        const canRecover =
          current.streak === 0 ||
          (current.lastCompletionDate !== today &&
            current.lastCompletionDate !== yesterday);

        if (!canRecover) {
          result = createArtifactActionResult(
            key,
            "activation",
            false,
            "The Tower can only be used after a missed streak."
          );
          return current;
        }

        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "The Tower has collapsed, but your streak rises from the ruins.",
          {
            restoredStreak: Math.max(1, current.streak),
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          streak: Math.max(1, current.streak),
          lastCompletionDate: today,
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              "The Tower has collapsed, but your streak rises from the ruins. Missed quests were not rewarded.",
          }),
        };
      }

      if (key === "wheel_fortune_gamble") {
        const allDailyDone =
          current.quests.length > 0 &&
          current.quests.every((quest) => quest.completed);

        if (!allDailyDone || activeEffects.wheelSpins[today]) {
          result = createArtifactActionResult(
            key,
            "activation",
            false,
            activeEffects.wheelSpins[today]
              ? "Wheel of Fortune has already been spun today."
              : "Complete all daily quests before spinning the Wheel."
          );
          return current;
        }

        const wheelReward = getWheelReward(current.stats);
        const nextStats = addStatRewards(current.stats, wheelReward.statRewards);
        const gainedStats = hasPositiveStatRewards(wheelReward.statRewards);
        const nextEffects: ActiveEffects = {
          ...activeEffects,
          wheelSpins: {
            ...activeEffects.wheelSpins,
            [today]: {
              artifactId: key,
              outcome: wheelReward.outcome,
              xp: wheelReward.xp,
              statRewards: wheelReward.statRewards,
              spunAt: getTimestampString(),
            },
          },
        };
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          `The Wheel has chosen: ${wheelReward.outcome}.`,
          {
            wheelSpin: nextEffects.wheelSpins[today],
            date: today,
          }
        );

        return applyArtifactUnlockRewards({
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          lifetimeXp: (current.lifetimeXp ?? current.totalXp) + wheelReward.xp,
          totalXp: current.totalXp + wheelReward.xp,
          spendableXp: getSpendableXp(current) + wheelReward.xp,
          stats: nextStats,
          history: gainedStats
            ? appendHistoryEntry(current.history, nextStats)
            : current.history,
          activeEffects: nextEffects,
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details: `The Wheel has chosen: ${wheelReward.outcome}. Result saved for ${today}.`,
          }),
        });
      }

      if (key === "justice_balance_scale") {
        const from = getStrongestStatKey(current.stats);
        const to = getWeakestStatKey(current.stats);
        const amount = Math.min(20, current.stats[from]);

        if (from === to || amount <= 0) {
          result = createArtifactActionResult(
            key,
            "activation",
            false,
            "Justice could not find two different stats to rebalance."
          );
          return current;
        }

        const nextStats = {
          ...current.stats,
          [from]: current.stats[from] - amount,
          [to]: current.stats[to] + amount,
        };
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          "Justice restores balance.",
          {
            from,
            to,
            amount,
          }
        );

        return {
          ...current,
          artifacts: consumeArtifactCopy(current.artifacts, key, "used"),
          stats: nextStats,
          history: appendHistoryEntry(current.history, nextStats),
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details: `Justice restores balance. Moved ${amount} point(s) from ${from} to ${to}.`,
          }),
        };
      }

      if (key === "death_transformation") {
        const candidates = current.artifacts.filter(
          (item) =>
            item.quantity > 0 &&
            item.key !== "death_transformation" &&
            item.key !== "fool_last_trick" &&
            (item.rarity === "common" ||
              item.rarity === "rare" ||
              item.rarity === "epic")
        );
        const target = candidates[0];

        if (!target) {
          result = createArtifactActionResult(
            key,
            "activation",
            false,
            "Death could not find an eligible owned artifact to transform."
          );
          return current;
        }

        const roll = Math.random();
        const transformed = current.artifacts.find((item) => {
          if (item.key === "fool_last_trick") return false;
          if (target.rarity === "common") {
            return item.rarity === (roll < 0.5 ? "rare" : "epic");
          }
          if (target.rarity === "rare") return item.rarity === "epic";
          return item.rarity === "legendary";
        });
        const success =
          (target.rarity === "common" && roll <= 0.66) ||
          (target.rarity === "rare" && roll <= 0.355) ||
          (target.rarity === "epic" && roll <= 0.005);
        let nextArtifacts = consumeArtifactCopy(current.artifacts, key, "used");

        if (success && transformed) {
          nextArtifacts = consumeArtifactCopy(nextArtifacts, target.key, "used");
          nextArtifacts = addArtifactCopy(
            nextArtifacts,
            transformed.key,
            "transformation"
          );
        }
        result = createArtifactActionResult(
          key,
          "activation",
          true,
          success && transformed
            ? "Death is not the end. It is transformation."
            : `Death stirred around ${target.title}, but no transformation occurred.`,
          {
            target: target.title,
            transformedInto: success && transformed ? transformed.title : null,
            success: success && Boolean(transformed),
          }
        );

        return {
          ...current,
          artifacts: nextArtifacts,
          log: appendLog(current.log, {
            type: "artifact",
            title: meta.title,
            details:
              success && transformed
                ? `Death is not the end. ${target.title} transformed into ${transformed.title}.`
                : `Death stirred around ${target.title}, but no transformation occurred.`,
          }),
        };
      }

      const genericDurations: Partial<Record<ArtifactKey, number | null>> = {
        strength_lion_heart: 24 * 60 * 60 * 1000,
        hermit_lantern: 24 * 60 * 60 * 1000,
        devil_contract: null,
        world_completion: 30 * 24 * 60 * 60 * 1000,
      };
      const duration = genericDurations[key];
      const expiresAt =
        duration === undefined
          ? null
          : duration === null
          ? null
          : new Date(Date.now() + duration).toISOString();
      result = createArtifactActionResult(
        key,
        "activation",
        true,
        `${meta.title} activated.`,
        {
          expiresAt,
          effectType: meta.type,
        }
      );

      return {
        ...current,
        artifacts: consumeArtifactCopy(current.artifacts, key, "active"),
        activeEffects: {
          ...activeEffects,
          artifactEffects: [
            createActiveArtifactEffect(key, meta.type, expiresAt, {
              title: meta.title,
              ability: meta.ability,
            }),
            ...activeEffects.artifactEffects,
          ],
        },
        log: appendLog(current.log, {
          type: "artifact",
          title: meta.title,
          details: `${meta.title} activated. ${meta.ability}`,
        }),
      };
    });

    return result;
  }

  function createUser(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newUser = createNewUserRecord(trimmed);

    setData((current) => ({
      users: [...current.users, newUser],
      activeUserId: newUser.id,
    }));
  }

  function switchUser(userId: string) {
    setData((current) => ({
      ...current,
      activeUserId: userId,
    }));
  }

  function deleteUser(userId: string) {
    setData((current) => {
      const nextUsers = current.users.filter((user) => user.id !== userId);

      if (nextUsers.length === 0) {
        const fallbackUser = createNewUserRecord("Player 1");
        return {
          users: [fallbackUser],
          activeUserId: fallbackUser.id,
        };
      }

      const nextActiveUserId =
        current.activeUserId === userId
          ? nextUsers[0]?.id ?? null
          : current.activeUserId;

      return {
        users: nextUsers,
        activeUserId: nextActiveUserId,
      };
    });
  }

  function previewSpecialQuests(): SpecialQuestTemplate[] {
    if (!activeUser) return [];
    return getPreviewSpecialQuests(
      activeUser.stats,
      activeUser.profile,
      activeUser.aiAnalysis
    );
  }

  function regenerateSpecialQuest() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();

      if (
        shouldAssignSpecialQuest(today, current.profile) &&
        current.aiAnalysis?.specialQuests?.length
      ) {
        const recentTitles = [
          current.specialQuest.title,
          ...current.log.slice(0, 8).map((entry) => entry.title),
        ];
        const nextIndex = getNextAiQuestIndex(
          current.aiAnalysis,
          current.aiQuestIndex,
          recentTitles,
          current.profile,
          current.specialQuestMemory
        );
        const nextAiQuest = getActiveAiQuest(current.aiAnalysis, nextIndex);

        if (nextAiQuest) {
          const generatedSpecialQuest = createSpecialQuestFromAiSuggestion(
            nextAiQuest,
            today,
            current.profile,
            current.aiAnalysis
          );
          const nextSpecialQuest = shouldUseRecoveryMode(current.dailyHp)
            ? cancelSpecialQuestForRecovery(generatedSpecialQuest)
            : generatedSpecialQuest;

          return {
            ...current,
            aiQuestIndex: nextIndex,
            specialQuest: nextSpecialQuest,
            specialQuestMemory: appendSpecialQuestMemory(
              current.specialQuestMemory,
              nextSpecialQuest
            ),
            log: appendLog(current.log, {
              type: "system_rotation",
              title: nextAiQuest.title,
              details: `System rotated to AI quest slot ${nextIndex + 1}/${current.aiAnalysis.specialQuests.length}.`,
            }),
          };
        }
      }

      const generatedSpecialQuest = createDailySpecialQuest(
        today,
        current.stats,
        current.profile,
        current.aiAnalysis,
        current.specialQuestMemory
      );
      const nextSpecialQuest = shouldUseRecoveryMode(current.dailyHp)
        ? cancelSpecialQuestForRecovery(generatedSpecialQuest)
        : generatedSpecialQuest;

      return {
        ...current,
        specialQuest: nextSpecialQuest,
        specialQuestMemory: appendSpecialQuestMemory(
          current.specialQuestMemory,
          nextSpecialQuest
        ),
        log: appendLog(current.log, {
          type: "system_rotation",
          title: nextSpecialQuest.title,
          details:
            "System rotated to a memory-aware local fallback special quest.",
        }),
      };
    });
  }

  return (
    <AppContext.Provider
      value={{
        isLoaded,
        users: data.users,
        activeUserId: data.activeUserId,
        activeUser,

        quests: activeUser?.quests ?? [],
        streak: activeUser?.streak ?? 0,
        lastCompletionDate: activeUser?.lastCompletionDate ?? null,
        lifetimeXp: activeUser?.lifetimeXp ?? activeUser?.totalXp ?? 0,
        totalXp: activeUser?.totalXp ?? 0,
        spendableXp: activeUser?.spendableXp ?? activeUser?.totalXp ?? 0,
        stats: activeUser?.stats ?? defaultStats,
        history: activeUser?.history ?? [],
        workoutJournal: activeUser?.workoutJournal ?? [],
        workoutProgram: activeUser?.workoutProgram ?? null,
        householdTasks: activeUser?.householdTasks ?? [],
        taskHistory: activeUser?.taskHistory ?? [],
        funSpecialActivities: activeUser?.funSpecialActivities ?? [],
        foodJournal: activeUser?.foodJournal ?? [],
        dietFeedback: activeUser?.dietFeedback ?? [],
        specialQuest: activeUser?.specialQuest ?? null,
        penaltyNotice: activeUser?.penaltyNotice ?? null,
        log: activeUser?.log ?? [],
        profile: activeUser?.profile ?? null,
        aiAnalysis: activeUser?.aiAnalysis ?? null,
        aiWeeklyPlan: activeUser?.aiWeeklyPlan ?? null,
        aiQuestIndex: activeUser?.aiQuestIndex ?? 0,
        artifacts: activeUser?.artifacts ?? [],
        activeEffects: activeUser?.activeEffects ?? createDefaultActiveEffects(),
        artifactHistory: activeUser?.artifactHistory ?? [],
        dailyHp: activeUser?.dailyHp ?? null,
        dailyHpDate: activeUser?.dailyHpDate ?? null,

        toggleQuest,
        completeSpecialQuest,
        acceptSpecialQuest,
        markSpecialQuestUrgent,
        clearPenaltyNotice,
        updateProfile,
        updateAiAnalysis,
        updateAiWeeklyPlan,
        updateDailyHp,
        addWorkoutJournalEntry,
        addHouseholdTask,
        completeHouseholdTask,
        deleteHouseholdTask,
        generateFunSpecialActivity,
        completeFunSpecialActivity,
        addFoodJournalEntry,
        deleteFoodJournalEntry,
        saveDietFeedback,
        activateArtifact,
        purchaseArtifact,
        updateWorkoutProgram,

        createUser,
        switchUser,
        deleteUser,

        previewSpecialQuests,
        regenerateSpecialQuest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}

