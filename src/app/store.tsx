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
  ArtifactKey,
  MultiUserData,
  SpecialQuestTemplate,
  Stats,
  UserProfile,
  UserRecord,
} from "./types";

import { getArtifactMeta } from "./artifacts";

import {
  addStatRewards,
  appendHistoryEntry,
  appendLog,
  appendSpecialQuestMemory,
  createDailyQuests,
  createDailySpecialQuest,
  createNewUserRecord,
  createSpecialQuestFromAiSuggestion,
  defaultStats,
  getActiveAiQuest,
  getNextAiQuestIndex,
  getPreviewSpecialQuests,
  getQuestStatRewards,
  getTodayString,
  getYesterdayString,
  normalizeSpecialQuestMemory,
  normalizeUserForToday,
} from "./quest-engine";
import { useAuth } from "./auth-context";
import { getSupabaseBrowserClient } from "./lib/supabase/client";

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
  });
}

function getUserStatePayload(user: UserRecord) {
  return {
    user_id: user.id,
    total_xp: user.totalXp,
    streak: user.streak,
    last_completion_date: user.lastCompletionDate,
    strength: user.stats.strength,
    vitality: user.stats.vitality,
    discipline: user.stats.discipline,
    focus: user.stats.focus,
    ai_analysis_json: user.aiAnalysis,
    ai_weekly_plan_json: user.aiWeeklyPlan,
    ai_quest_index: user.aiQuestIndex,
    active_effects_json: user.activeEffects,
    app_state_json: user,
    updated_at: new Date().toISOString(),
  };
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
      const hasDoubleXp = current.activeEffects.doubleDailyXpDate === today;

      let xpToAdd = 0;
      let statRewards: Partial<Stats> = {};
      let loggedQuestTitle = "";

      const nextQuests = current.quests.map((quest) => {
        if (quest.id !== id) return quest;

        if (!quest.completed) {
          if (!quest.awardedToday) {
            xpToAdd = hasDoubleXp ? quest.xp * 2 : quest.xp;
            statRewards = getQuestStatRewards(quest.id);
            loggedQuestTitle = quest.title;
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

      const gainedDirectStats =
        (statRewards.strength ?? 0) > 0 ||
        (statRewards.vitality ?? 0) > 0 ||
        (statRewards.discipline ?? 0) > 0 ||
        (statRewards.focus ?? 0) > 0;

      if (gainedDirectStats) {
        nextHistory = appendHistoryEntry(nextHistory, nextStats);
        nextLog = appendLog(nextLog, {
          type: "daily_quest",
          title: loggedQuestTitle,
          details: `Completed for +${xpToAdd} XP${hasDoubleXp ? " with XP Rune bonus" : ""}`,
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

      return {
        ...current,
        quests: nextQuests,
        totalXp: current.totalXp + xpToAdd,
        streak: nextStreak,
        lastCompletionDate: nextLastCompletionDate,
        stats: nextStats,
        history: nextHistory,
        log: nextLog,
      };
    });
  }

  function completeSpecialQuest() {
    if (!activeUser) return;

    updateActiveUser((current) => {
      if (current.specialQuest.completed || current.specialQuest.awardedToday) {
        return current;
      }

      const nextStats = addStatRewards(
        current.stats,
        current.specialQuest.statRewards
      );

      const nextHistory = appendHistoryEntry(current.history, nextStats);
      const nextLog = appendLog(current.log, {
        type: "special_quest",
        title: current.specialQuest.title,
        details: `Completed for +${current.specialQuest.xp} XP`,
      });

      return {
        ...current,
        totalXp: current.totalXp + current.specialQuest.xp,
        stats: nextStats,
        history: nextHistory,
        log: nextLog,
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
      const nextSpecialQuest = createDailySpecialQuest(
        getTodayString(),
        current.stats,
        safeProfile,
        current.aiAnalysis,
        safeMemory
      );

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
        quests: createDailyQuests(safeProfile),
        specialQuest: nextSpecialQuest,
        specialQuestMemory: appendSpecialQuestMemory(
          safeMemory,
          nextSpecialQuest
        ),
        log: nextLog,
      };
    });
  }

  function updateAiAnalysis(analysis: AiSystemAnalysis | null) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const firstAiQuest = getActiveAiQuest(analysis, 0);
      const nextSpecialQuest = firstAiQuest
        ? createSpecialQuestFromAiSuggestion(
            firstAiQuest,
            today,
            current.profile,
            analysis
          )
        : current.specialQuest;

      let nextLog = current.log;

      if (analysis) {
        nextLog = appendLog(nextLog, {
          type: "system_analysis",
          title: "System Diagnosis Complete",
          details:
            `Archetype: ${analysis.archetype}. Focus: ${analysis.primaryFocus}. ` +
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

      return {
        ...current,
        aiAnalysis: analysis,
        aiQuestIndex: 0,
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

      if (plan) {
        nextLog = appendLog(nextLog, {
          type: "weekly_plan",
          title: "Weekly Protocol Generated",
          details: `Objective: ${plan.weekObjective} Pressure level: ${plan.pressureLevel}. Missions issued: ${plan.missions.length}.`,
        });

        nextLog = appendLog(nextLog, {
          type: "system_notice",
          title: "System Warning Issued",
          details: plan.systemWarning,
        });
      }

      return {
        ...current,
        aiWeeklyPlan: plan,
        log: nextLog,
      };
    });
  }

  function activateArtifact(key: ArtifactKey) {
    if (!activeUser) return;

    updateActiveUser((current) => {
      const today = getTodayString();
      const yesterday = getYesterdayString();

      const artifact = current.artifacts.find((item) => item.key === key);

      if (!artifact || artifact.quantity <= 0) {
        return current;
      }

      if (key === "xp_rune" && current.activeEffects.doubleDailyXpDate === today) {
        return current;
      }

      if (
        key === "null_sigil" &&
        (!current.specialQuest ||
          current.specialQuest.completed ||
          current.specialQuest.awardedToday)
      ) {
        return current;
      }

      if (key === "rest_day_pass" && current.lastCompletionDate === today) {
        return current;
      }

      const nextArtifacts = current.artifacts.map((item) =>
        item.key === key
          ? { ...item, quantity: Math.max(0, item.quantity - 1) }
          : item
      );

      const meta = getArtifactMeta(key);

      if (key === "xp_rune") {
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
            details: "XP Rune activated. Daily quests completed today now grant double XP.",
          }),
        };
      }

      if (key === "null_sigil") {
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
            details: "Null Sigil activated. Today’s special quest has been waived without reward or penalty.",
          }),
        };
      }

      if (key === "rest_day_pass") {
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
            details: "Rest Day Pass activated. Daily protocol suspended and streak protected for today.",
          }),
        };
      }

      return current;
    });
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

      if (current.aiAnalysis?.specialQuests?.length) {
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
          const nextSpecialQuest = createSpecialQuestFromAiSuggestion(
            nextAiQuest,
            today,
            current.profile,
            current.aiAnalysis
          );

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

      const nextSpecialQuest = createDailySpecialQuest(
        today,
        current.stats,
        current.profile,
        current.aiAnalysis,
        current.specialQuestMemory
      );

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
        totalXp: activeUser?.totalXp ?? 0,
        stats: activeUser?.stats ?? defaultStats,
        history: activeUser?.history ?? [],
        specialQuest: activeUser?.specialQuest ?? null,
        penaltyNotice: activeUser?.penaltyNotice ?? null,
        log: activeUser?.log ?? [],
        profile: activeUser?.profile ?? null,
        aiAnalysis: activeUser?.aiAnalysis ?? null,
        aiWeeklyPlan: activeUser?.aiWeeklyPlan ?? null,
        aiQuestIndex: activeUser?.aiQuestIndex ?? 0,
        artifacts: activeUser?.artifacts ?? [],
        activeEffects: activeUser?.activeEffects ?? {
          doubleDailyXpDate: null,
        },

        toggleQuest,
        completeSpecialQuest,
        acceptSpecialQuest,
        markSpecialQuestUrgent,
        clearPenaltyNotice,
        updateProfile,
        updateAiAnalysis,
        updateAiWeeklyPlan,
        activateArtifact,

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
