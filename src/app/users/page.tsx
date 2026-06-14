"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../store";
import { useAuth } from "../auth-context";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { withTimeout } from "../lib/async-timeout";
import PanelCard from "../components/PanelCard";
import ActionButton from "../components/ActionButton";
import { getSystemRank } from "../rank-system";
import { artifactOrder, getArtifactMeta, normalizeActiveEffects, normalizeArtifacts } from "../artifacts";
import {
  createCreatorAuditEntry,
  normalizeCreatorMediaLibrary,
} from "../creator-media";
import type {
  ActiveArtifactEffect,
  Artifact,
  CreatorMediaScope,
  CreatorMediaTargetType,
  LogEntryType,
  Quest,
  SpecialQuest,
  UserProfile,
  UserRecord,
} from "../types";
import {
  appendHistoryEntry,
  appendLog,
  appendSpecialQuestMemory,
  createDailyQuests,
  createDailySpecialQuest,
  createSpecialQuestFromAiSuggestion,
  getActiveAiQuest,
  getNextAiQuestIndex,
  getTodayString,
  createNewUserRecord,
  normalizeStats,
  normalizeSpecialQuestMemory,
  normalizeUserForToday,
} from "../quest-engine";
import { createCompactAppState } from "../state-persistence";

type RemoteProfile = {
  id: string;
  email: string;
  display_name: string;
  role: "creator" | "admin" | "player";
  account_status: "pending_approval" | "approved" | "rejected" | "blocked";
  timezone: string;
  reminders_enabled: boolean;
  created_at: string;
};

type RemoteUserState = {
  user_id: string;
  total_xp: number;
  lifetime_xp?: number;
  spendable_xp?: number;
  streak: number;
  last_completion_date: string | null;
  strength: number;
  vitality: number;
  discipline: number;
  focus: number;
  intelligence: number;
  agility: number;
  magicResistance: number;
  daily_hp: number | null;
  daily_hp_date: string | null;
  active_effects_json?: UserRecord["activeEffects"] | null;
  artifact_history_json?: UserRecord["artifactHistory"] | null;
  task_history_json?: UserRecord["taskHistory"] | null;
  media_library_json?: UserRecord["mediaLibrary"] | null;
  creator_audit_log_json?: UserRecord["creatorAuditLog"] | null;
  app_state_json?: UserRecord | null;
  updated_at: string;
};

type RemoteAccount = RemoteProfile & {
  state: RemoteUserState | null;
};

type AdminNotification = {
  id: string;
  profile_id: string | null;
  notification_type: string;
  title: string;
  details: string;
  read_at: string | null;
  created_at: string;
};

type EditableStateField =
  | "lifetime_xp"
  | "total_xp"
  | "spendable_xp"
  | "streak"
  | "strength"
  | "vitality"
  | "discipline"
  | "intelligence"
  | "agility"
  | "magicResistance";

const editableStateFields: { key: EditableStateField; label: string }[] = [
  { key: "lifetime_xp", label: "Lifetime XP" },
  { key: "total_xp", label: "Total XP" },
  { key: "spendable_xp", label: "Spendable XP" },
  { key: "streak", label: "Streak" },
  { key: "strength", label: "Strength" },
  { key: "vitality", label: "Vitality" },
  { key: "discipline", label: "Discipline" },
  { key: "intelligence", label: "Intelligence" },
  { key: "agility", label: "Agility" },
  { key: "magicResistance", label: "Magic Resistance" },
];

const profileTextFields: Array<{ key: keyof UserProfile; label: string }> = [
  { key: "name", label: "Profile name" },
  { key: "goal", label: "Goal" },
  { key: "preferredWorkoutDays", label: "Workout days" },
  { key: "dietaryRestrictions", label: "Diet restrictions" },
  { key: "profession", label: "Profession" },
  { key: "hobbies", label: "Hobbies" },
  { key: "customInterests", label: "Custom interests" },
  { key: "rpgIdentityNotes", label: "Injury/limitation/RPG notes" },
];

const mediaTargetOptions: Array<{
  type: CreatorMediaTargetType;
  label: string;
  defaultTargetId: string;
}> = [
  { type: "dashboard_banner", label: "Dashboard banner", defaultTargetId: "default" },
  { type: "quest_banner", label: "Quest page banner", defaultTargetId: "default" },
  { type: "artifact_card", label: "Artifact card image", defaultTargetId: "fool_last_trick" },
  { type: "artifact_activation", label: "Artifact activation animation", defaultTargetId: "fool_last_trick" },
  { type: "workout_banner", label: "Workout banner", defaultTargetId: "default" },
  { type: "exercise_media", label: "Exercise image/video", defaultTargetId: "exercise-name" },
  { type: "diet_banner", label: "Diet banner", defaultTargetId: "default" },
  { type: "progress_banner", label: "Progress banner", defaultTargetId: "default" },
  { type: "rank_icon", label: "Rank icon", defaultTargetId: "E" },
  { type: "profile_avatar", label: "Profile/avatar", defaultTargetId: "avatar" },
];

const primaryCreatorEmail = "pierremoussa6@gmail.com";
const CREATOR_REMOTE_TIMEOUT_MS = 12_000;
const CREATOR_MEDIA_MAX_BYTES = 4_000_000;

type CreatorAccountsResponse = {
  accounts?: RemoteAccount[];
  notifications?: AdminNotification[];
  error?: string;
};

type CreatorMediaResponse = {
  media?: unknown;
  error?: string;
};

type CreatorAccountStateResponse = {
  state?: RemoteUserState | null;
  error?: string;
};

function toSafeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function formatFileSize(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
}

function inferMediaTypeFromUrl(url: string) {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();

  if (/\.(mp4|webm|mov)$/.test(pathname)) return "video/mp4";
  if (pathname.endsWith(".json")) return "application/json";
  if (pathname.endsWith(".gif")) return "image/gif";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".png")) return "image/png";
  if (/\.(jpg|jpeg)$/.test(pathname)) return "image/jpeg";

  return "image/*";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isArtifactMediaTarget(type: CreatorMediaTargetType) {
  return type.startsWith("artifact_");
}

async function getCreatorAuthHeaders() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return null;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function getEditableState(account: RemoteAccount): RemoteUserState {
  const baseState = account.state ?? {
    user_id: account.id,
    total_xp: 0,
    lifetime_xp: 0,
    spendable_xp: 0,
    streak: 0,
    last_completion_date: null,
    strength: 0,
    vitality: 0,
    discipline: 0,
    focus: 0,
    intelligence: 0,
    agility: 0,
    magicResistance: 0,
    daily_hp: null,
    daily_hp_date: null,
    app_state_json: null,
    updated_at: new Date().toISOString(),
  };
  const appStats = normalizeStats(baseState.app_state_json?.stats ?? null);

  return {
    ...baseState,
    lifetime_xp:
      baseState.lifetime_xp ??
      baseState.app_state_json?.lifetimeXp ??
      baseState.total_xp,
    spendable_xp:
      baseState.spendable_xp ??
      baseState.app_state_json?.spendableXp ??
      baseState.total_xp,
    intelligence: appStats.intelligence || baseState.focus,
    agility: appStats.agility,
    magicResistance: appStats.magicResistance,
  };
}

function getStateValue(account: RemoteAccount, key: EditableStateField) {
  return getEditableState(account)[key];
}

function createRemoteAppState(account: RemoteAccount, state: RemoteUserState) {
  const existingRecord = state.app_state_json;
  const baseRecord =
    existingRecord ??
    normalizeUserForToday({
      ...createNewUserRecord(account.display_name || account.email.split("@")[0] || "Player"),
      id: account.id,
    });

  return normalizeUserForToday({
    ...baseRecord,
    id: account.id,
    totalXp: state.total_xp,
    lifetimeXp: state.lifetime_xp ?? state.total_xp,
    spendableXp: state.spendable_xp ?? state.total_xp,
    streak: state.streak,
    lastCompletionDate: state.last_completion_date,
    stats: {
      ...baseRecord.stats,
      strength: state.strength,
      vitality: state.vitality,
      discipline: state.discipline,
      intelligence: state.intelligence,
      agility: state.agility,
      magicResistance: state.magicResistance,
    },
    history: appendHistoryEntry(baseRecord.history, {
      strength: state.strength,
      vitality: state.vitality,
      discipline: state.discipline,
      intelligence: state.intelligence,
      agility: state.agility,
      magicResistance: state.magicResistance,
    }),
    profile: {
      ...baseRecord.profile,
      name: account.display_name || baseRecord.profile.name,
    },
    dailyHp: state.daily_hp,
    dailyHpDate: state.daily_hp_date,
    activeEffects:
      state.active_effects_json ?? baseRecord.activeEffects,
    artifactHistory:
      Array.isArray(state.artifact_history_json) &&
      (state.artifact_history_json.length > 0 ||
        (baseRecord.artifactHistory ?? []).length === 0)
        ? state.artifact_history_json
        : baseRecord.artifactHistory ?? [],
    taskHistory:
      Array.isArray(state.task_history_json) &&
      (state.task_history_json.length > 0 ||
        baseRecord.taskHistory.length === 0)
        ? state.task_history_json
        : baseRecord.taskHistory,
    mediaLibrary: normalizeCreatorMediaLibrary(
      Array.isArray(state.media_library_json) &&
        (state.media_library_json.length > 0 ||
          (baseRecord.mediaLibrary ?? []).length === 0)
        ? state.media_library_json
        : baseRecord.mediaLibrary
    ),
    creatorAuditLog:
      Array.isArray(state.creator_audit_log_json) &&
      (state.creator_audit_log_json.length > 0 ||
        (baseRecord.creatorAuditLog ?? []).length === 0)
        ? state.creator_audit_log_json
        : baseRecord.creatorAuditLog ?? [],
  });
}

function getAccountAppState(account: RemoteAccount) {
  return createRemoteAppState(account, getEditableState(account));
}

function getQuestStatusLabel(completed: boolean) {
  return completed ? "Completed" : "Open";
}

function safeJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJsonOrNull<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function createRandomSpecialQuest(record: UserRecord) {
  const today = getTodayString();

  if (record.aiAnalysis?.specialQuests?.length) {
    const recentTitles = [
      record.specialQuest.title,
      ...record.log.slice(0, 8).map((entry) => entry.title),
    ];
    const nextIndex = getNextAiQuestIndex(
      record.aiAnalysis,
      record.aiQuestIndex,
      recentTitles,
      record.profile,
      record.specialQuestMemory
    );
    const aiQuest = getActiveAiQuest(record.aiAnalysis, nextIndex);

    if (aiQuest) {
      return {
        specialQuest: createSpecialQuestFromAiSuggestion(
          aiQuest,
          today,
          record.profile,
          record.aiAnalysis
        ),
        aiQuestIndex: nextIndex,
      };
    }
  }

  return {
    specialQuest: createDailySpecialQuest(
      today,
      record.stats,
      record.profile,
      record.aiAnalysis,
      record.specialQuestMemory
    ),
    aiQuestIndex: record.aiQuestIndex,
  };
}

export default function UsersPage() {
  const { status, isCreator, user: authUser } = useAuth();
  const {
    isLoaded,
    users,
    activeUserId,
    createUser,
    switchUser,
    deleteUser,
  } = useApp();

  const [newName, setNewName] = useState("");

  const [remoteAccounts, setRemoteAccounts] = useState<RemoteAccount[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [creatorNotice, setCreatorNotice] = useState<string | null>(null);
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>({});
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [loadingAccountStateId, setLoadingAccountStateId] = useState<string | null>(null);
  const [creatorViewMode, setCreatorViewMode] = useState<"player" | "creator">("creator");
  const [mediaDraft, setMediaDraft] = useState<{
    accountId: string | null;
    targetType: CreatorMediaTargetType;
    targetId: string;
    scope: CreatorMediaScope;
    title: string;
    altText: string;
    fileUrl: string;
    fileType: string;
    file: File | null;
    previewUrl: string;
  }>({
    accountId: null,
    targetType: "artifact_card",
    targetId: "fool_last_trick",
    scope: "global",
    title: "",
    altText: "",
    fileUrl: "",
    fileType: "",
    file: null,
    previewUrl: "",
  });

  const loadRemoteAccounts = useCallback(async () => {
    if (status === "unconfigured" || !isCreator) return;

    setRemoteLoading(true);
    setRemoteError(null);

    try {
      const headers = await getCreatorAuthHeaders();
      if (!headers) {
        setRemoteError(
          "Creator tools unavailable — sign in or configure Supabase."
        );
        setRemoteLoading(false);
        return;
      }
      const response = await withTimeout(
        fetch("/api/creator/accounts", {
          headers,
          cache: "no-store",
        }),
        CREATOR_REMOTE_TIMEOUT_MS,
        "Timed out while loading account profiles."
      );

      const body = (await response.json().catch(() => ({}))) as CreatorAccountsResponse;

      if (!response.ok) {
        throw new Error(body.error ?? "The creator account list could not be loaded.");
      }

      const nextAccounts = Array.isArray(body.accounts) ? body.accounts : [];

      setRemoteAccounts((current) => {
        const detailedStateByUserId = new Map(
          current
            .filter((account) => account.state?.app_state_json)
            .map((account) => [account.id, account.state])
        );

        return nextAccounts.map((account) => {
          const detailedState = detailedStateByUserId.get(account.id);

          return detailedState
            ? {
                ...account,
                state: {
                  ...(account.state ?? {}),
                  ...detailedState,
                },
              }
            : account;
        });
      });
      setAdminNotifications(
        Array.isArray(body.notifications) ? body.notifications : []
      );
    } catch (error) {
      setRemoteError(
        getErrorMessage(error, "The creator account list could not be loaded.")
      );
    } finally {
      setRemoteLoading(false);
    }
  }, [isCreator, status]);

  async function loadAccountEditor(account: RemoteAccount) {
    setLoadingAccountStateId(account.id);
    setRemoteError(null);
    setCreatorNotice(null);

    try {
      const headers = await getCreatorAuthHeaders();
      if (!headers) {
        setRemoteError(
          "Creator tools unavailable — sign in or configure Supabase."
        );
        setLoadingAccountStateId(null);
        return;
      }
      const response = await withTimeout(
        fetch(`/api/creator/account-state/${encodeURIComponent(account.id)}`, {
          headers,
          cache: "no-store",
        }),
        CREATOR_REMOTE_TIMEOUT_MS,
        "Timed out while loading this player editor."
      );
      const body = (await response.json().catch(() => ({}))) as CreatorAccountStateResponse;

      if (!response.ok) {
        throw new Error(body.error ?? "The player editor could not be loaded.");
      }

      const loadedState = body.state ?? getEditableState(account);
      const nextState = loadedState.app_state_json
        ? loadedState
        : {
            ...loadedState,
            app_state_json: createRemoteAppState(account, loadedState),
          };

      setRemoteAccounts((current) =>
        current.map((item) =>
          item.id === account.id
            ? {
                ...item,
                state: nextState,
              }
            : item
        )
      );
      setExpandedAccountId(account.id);
    } catch (error) {
      setRemoteError(
        getErrorMessage(error, "The player editor could not be loaded.")
      );
    } finally {
      setLoadingAccountStateId(null);
    }
  }

  async function toggleAccountEditor(account: RemoteAccount) {
    if (expandedAccountId === account.id) {
      setExpandedAccountId(null);
      return;
    }

    if (account.state?.app_state_json) {
      setExpandedAccountId(account.id);
      return;
    }

    await loadAccountEditor(account);
  }

  useEffect(() => {
    const previewUrl = mediaDraft.previewUrl;

    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [mediaDraft.previewUrl]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRemoteAccounts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadRemoteAccounts]);

  async function updateRemoteProfile(
    id: string,
    updates: Partial<
      Pick<
        RemoteProfile,
        "display_name" | "role" | "reminders_enabled" | "account_status"
      >
    >
  ) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setRemoteError(null);
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (error) {
      setRemoteError(error.message);
      return;
    }

    setRemoteAccounts((current) =>
      current.map((account) =>
        account.id === id
          ? {
              ...account,
              ...updates,
              account_status:
                updates.role === "creator"
                  ? "approved"
                  : updates.account_status ?? account.account_status,
            }
          : account
      )
    );
  }

  async function saveAccountState(
    account: RemoteAccount,
    appState: UserRecord,
    logEntry?: {
      title: string;
      details: string;
      type?: LogEntryType;
    }
  ) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return false;

    const nextAppState = logEntry
      ? {
          ...appState,
          log: appendLog(appState.log, {
            type: logEntry.type ?? "system_notice",
            title: logEntry.title,
            details: logEntry.details,
          }),
        }
      : appState;

    setRemoteError(null);
    const updatedAt = new Date().toISOString();
    const compactAppState = createCompactAppState(nextAppState);
    const modernPayload = {
      user_id: account.id,
      total_xp: nextAppState.totalXp,
      lifetime_xp: nextAppState.lifetimeXp,
      spendable_xp: nextAppState.spendableXp,
      streak: nextAppState.streak,
      last_completion_date: nextAppState.lastCompletionDate,
      strength: nextAppState.stats.strength,
      vitality: nextAppState.stats.vitality,
      discipline: nextAppState.stats.discipline,
      focus: nextAppState.stats.intelligence,
      intelligence: nextAppState.stats.intelligence,
      agility: nextAppState.stats.agility,
      magic_resistance: nextAppState.stats.magicResistance,
      daily_hp: nextAppState.dailyHp,
      daily_hp_date: nextAppState.dailyHpDate,
      active_effects_json: compactAppState.activeEffects,
      artifact_history_json: compactAppState.artifactHistory ?? [],
      task_history_json: compactAppState.taskHistory ?? [],
      media_library_json: [],
      creator_audit_log_json: [],
      app_state_json: compactAppState,
      updated_at: updatedAt,
    };
    const compatiblePayload = {
      user_id: account.id,
      total_xp: nextAppState.totalXp,
      streak: nextAppState.streak,
      last_completion_date: nextAppState.lastCompletionDate,
      strength: nextAppState.stats.strength,
      vitality: nextAppState.stats.vitality,
      discipline: nextAppState.stats.discipline,
      focus: nextAppState.stats.intelligence,
      daily_hp: nextAppState.dailyHp,
      daily_hp_date: nextAppState.dailyHpDate,
      app_state_json: compactAppState,
      updated_at: updatedAt,
    };

    const { error: modernError } = await supabase
      .from("user_state")
      .upsert(modernPayload, { onConflict: "user_id" });

    if (modernError) {
      const { error: compatibleError } = await supabase
        .from("user_state")
        .upsert(compatiblePayload, { onConflict: "user_id" });

      if (compatibleError) {
        setRemoteError(compatibleError.message);
        return false;
      }
    }

    if (logEntry) {
      const disableLogs =
        process.env.NEXT_PUBLIC_DISABLE_SYSTEM_LOGS === "1" ||
        process.env.NEXT_PUBLIC_DISABLE_SYSTEM_LOGS === "true";

      if (disableLogs) {
        // Avoid writes to system_logs when disabled (helps reduce Disk IO).
        // eslint-disable-next-line no-console
        console.warn("System logs insertion skipped (DISABLE_SYSTEM_LOGS=true)");
      } else {
        const { error: logError } = await supabase.from("system_logs").insert({
          user_id: account.id,
          log_type: logEntry.type ?? "system_notice",
          title: logEntry.title,
          details: logEntry.details,
        });

        if (logError) {
          setRemoteError(logError.message);
          return false;
        }
      }
    }

    setRemoteAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? {
              ...item,
              state: {
                ...getEditableState(item),
                user_id: account.id,
                total_xp: compactAppState.totalXp,
                lifetime_xp: compactAppState.lifetimeXp,
                spendable_xp: compactAppState.spendableXp,
                streak: compactAppState.streak,
                last_completion_date: compactAppState.lastCompletionDate,
                strength: compactAppState.stats.strength,
                vitality: compactAppState.stats.vitality,
                discipline: compactAppState.stats.discipline,
                focus: compactAppState.stats.intelligence,
                intelligence: compactAppState.stats.intelligence,
                agility: compactAppState.stats.agility,
                magicResistance: compactAppState.stats.magicResistance,
                daily_hp: compactAppState.dailyHp,
                daily_hp_date: compactAppState.dailyHpDate,
                active_effects_json: compactAppState.activeEffects,
                artifact_history_json: compactAppState.artifactHistory ?? [],
                task_history_json: compactAppState.taskHistory ?? [],
                media_library_json: [],
                creator_audit_log_json: [],
                app_state_json: compactAppState,
                updated_at: updatedAt,
              },
            }
          : item
      )
    );

    return true;
  }

  async function saveProfileName(account: RemoteAccount) {
    const displayName = account.display_name.trim() || "Player";
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setRemoteError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", account.id);

    if (error) {
      setRemoteError(error.message);
      return;
    }

    setRemoteAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? {
              ...item,
              display_name: displayName,
            }
          : item
      )
    );

    if (!account.state?.app_state_json) {
      setCreatorNotice(`Saved name for ${displayName}.`);
      return;
    }

    const appState = getAccountAppState({
      ...account,
      display_name: displayName,
    });

    await saveAccountState(
      { ...account, display_name: displayName },
      {
        ...appState,
        profile: {
          ...appState.profile,
          name: displayName,
        },
      },
      {
        title: "Profile Name Updated",
        details: `Creator support changed the display name to ${displayName}.`,
      }
    );
  }

  function updateRemoteStateDraft(
    accountId: string,
    key: EditableStateField,
    value: number
  ) {
    setRemoteAccounts((current) =>
      current.map((account) => {
        if (account.id !== accountId) return account;

        const state = getEditableState(account);

        return {
          ...account,
          state: {
            ...state,
            [key]: toSafeNumber(value),
          },
        };
      })
    );
  }

  function updateAccountAppStateDraft(
    accountId: string,
    updater: (record: UserRecord) => UserRecord
  ) {
    setRemoteAccounts((current) =>
      current.map((account) => {
        if (account.id !== accountId) return account;

        const state = getEditableState(account);
        const record = getAccountAppState(account);
        const nextRecord = normalizeUserForToday(updater(record));

        return {
          ...account,
          state: {
            ...state,
            total_xp: nextRecord.totalXp,
            lifetime_xp: nextRecord.lifetimeXp,
            spendable_xp: nextRecord.spendableXp,
            streak: nextRecord.streak,
            last_completion_date: nextRecord.lastCompletionDate,
            strength: nextRecord.stats.strength,
            vitality: nextRecord.stats.vitality,
            discipline: nextRecord.stats.discipline,
            focus: nextRecord.stats.intelligence,
            intelligence: nextRecord.stats.intelligence,
            agility: nextRecord.stats.agility,
            magicResistance: nextRecord.stats.magicResistance,
            daily_hp: nextRecord.dailyHp,
            daily_hp_date: nextRecord.dailyHpDate,
            app_state_json: nextRecord,
            updated_at: new Date().toISOString(),
          },
        };
      })
    );
  }

  async function saveCreatorEditedState(
    account: RemoteAccount,
    label: string,
    fieldChanged = "creator_view"
  ) {
    const appState = getAccountAppState(account);
    const creatorId = authUser?.id ?? activeUserId ?? "creator";
    const nextState = normalizeUserForToday({
      ...appState,
      creatorAuditLog: [
        createCreatorAuditEntry({
          creatorId,
          affectedUserId: account.id,
          fieldChanged,
          oldValue: "previous saved value",
          newValue: label,
        }),
        ...(appState.creatorAuditLog ?? []),
      ].slice(0, 500),
    });

    await saveAccountState(account, nextState, {
      title: `Creator Edit: ${label}`,
      details: `Creator View saved ${label}.`,
      type: "system_notice",
    });
  }

  async function saveRemoteState(account: RemoteAccount) {
    const state = getEditableState(account);
    const appState = createRemoteAppState(account, state);

    await saveAccountState(account, appState, {
      title: "Support Adjustment Applied",
      details:
        `Creator support updated lifetime XP to ${appState.lifetimeXp}, spendable XP to ${appState.spendableXp}, total XP to ${appState.totalXp}, streak to ${appState.streak}, ` +
        `and stats to STR ${appState.stats.strength}, VIT ${appState.stats.vitality}, ` +
        `DIS ${appState.stats.discipline}, INT ${appState.stats.intelligence}, ` +
        `AGI ${appState.stats.agility}, MR ${appState.stats.magicResistance}.`,
    });
  }

  async function resetDailyQuests(account: RemoteAccount) {
    const appState = getAccountAppState(account);
    const specialQuestMemory = normalizeSpecialQuestMemory(
      appState.specialQuestMemory
    );
    const nextSpecialQuest = createDailySpecialQuest(
      getTodayString(),
      appState.stats,
      appState.profile,
      appState.aiAnalysis,
      specialQuestMemory
    );
    const nextState: UserRecord = {
      ...appState,
      quests: createDailyQuests(
        appState.profile,
        getTodayString(),
        appState.workoutProgram
      ),
      specialQuest: nextSpecialQuest,
      specialQuestMemory: appendSpecialQuestMemory(
        specialQuestMemory,
        nextSpecialQuest
      ),
      lastResetDate: getTodayString(),
    };

    await saveAccountState(account, nextState, {
      title: "Daily Quests Reset",
      details:
        "Creator support reset today's daily quests and special quest for this account.",
      type: "system_rotation",
    });
  }

  async function regenerateSpecialQuest(account: RemoteAccount) {
    const appState = getAccountAppState(account);
    const { specialQuest, aiQuestIndex } = createRandomSpecialQuest(appState);
    const nextState: UserRecord = {
      ...appState,
      specialQuest,
      aiQuestIndex,
      specialQuestMemory: appendSpecialQuestMemory(
        appState.specialQuestMemory,
        specialQuest
      ),
    };

    await saveAccountState(account, nextState, {
      title: `Special Quest Regenerated: ${specialQuest.title}`,
      details:
        "Creator support assigned a new special quest for this account.",
      type: "system_rotation",
    });
  }

  function updateSupportNoteDraft(accountId: string, value: string) {
    setSupportNotes((current) => ({
      ...current,
      [accountId]: value,
    }));
  }

  async function saveSupportNote(account: RemoteAccount) {
    const note = supportNotes[account.id]?.trim();
    if (!note) return;

    const appState = getAccountAppState(account);
    const saved = await saveAccountState(account, appState, {
      title: "Creator Support Note",
      details: note,
      type: "system_notice",
    });

    if (saved) {
      updateSupportNoteDraft(account.id, "");
    }
  }

  function handleMediaFile(file: File | null) {
    if (!file) return;

    setRemoteError(null);

    if (file.size > CREATOR_MEDIA_MAX_BYTES) {
      setMediaDraft((current) => ({
        ...current,
        file: null,
        previewUrl: "",
        fileUrl: "",
        fileType: "",
      }));
      setRemoteError(
        `That file is ${formatFileSize(file.size)}. Creator media uploads are capped at ${formatFileSize(
          CREATOR_MEDIA_MAX_BYTES
        )}. Use an optimized image or short animation.`
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setMediaDraft((current) => ({
      ...current,
      file,
      previewUrl,
      fileUrl: "",
      fileType: file.type || "application/octet-stream",
      title: current.title || file.name,
      altText: current.altText || file.name,
    }));
  }

  async function saveCreatorMedia() {
    if (!mediaDraft.file && !mediaDraft.fileUrl.trim()) return;

    setRemoteError(null);
    setCreatorNotice(null);

    try {
      if (mediaDraft.scope === "user" && !mediaDraft.accountId) {
        throw new Error(
          "Choose a user before saving user-specific media. Global media does not need a selected user."
        );
      }

      const headers = await getCreatorAuthHeaders();
      if (!headers) {
        setRemoteError(
          "Creator tools unavailable — sign in or configure Supabase."
        );
        return;
      }

      const targetId = mediaDraft.targetId.trim() || "default";
      let response: Response;

      if (mediaDraft.file) {
        const formData = new FormData();

        formData.append("file", mediaDraft.file, mediaDraft.file.name);
        formData.append("targetType", mediaDraft.targetType);
        formData.append("targetId", targetId);
        formData.append("scope", mediaDraft.scope);
        formData.append(
          "userId",
          mediaDraft.scope === "user" ? mediaDraft.accountId ?? "" : ""
        );
        formData.append("altText", mediaDraft.altText);
        formData.append("title", mediaDraft.title);

        response = await fetch("/api/creator/media/upload", {
          method: "POST",
          headers,
          body: formData,
        });
      } else {
        response = await fetch("/api/creator/media", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetType: mediaDraft.targetType,
            targetId,
            scope: mediaDraft.scope,
            userId: mediaDraft.scope === "user" ? mediaDraft.accountId : null,
            fileUrl: mediaDraft.fileUrl.trim(),
            fileType:
              mediaDraft.fileType || inferMediaTypeFromUrl(mediaDraft.fileUrl),
            altText: mediaDraft.altText,
            title: mediaDraft.title,
          }),
        });
      }

      const body = (await response.json().catch(() => ({}))) as CreatorMediaResponse;

      if (!response.ok) {
        throw new Error(body.error ?? "Creator media could not be saved.");
      }

      setCreatorNotice(
        `Saved ${mediaDraft.scope} media for ${mediaDraft.targetType}/${targetId}.`
      );
      setMediaDraft((current) => ({
        ...current,
        file: null,
        previewUrl: "",
        fileUrl: "",
        fileType: "",
        title: "",
        altText: "",
      }));
    } catch (error) {
      setRemoteError(
        getErrorMessage(error, "Creator media could not be saved.")
      );
    }
  }

  if (status !== "unconfigured") {
    if (!isCreator) {
      return (
        <div className="max-w-4xl space-y-6">
          <h1 className="mb-6 text-3xl text-blue-400">Users</h1>
          <PanelCard>
            <h2 className="text-xl text-white">Creator Access Required</h2>
            <p className="text-zinc-400">
              This area is reserved for the System Creator account.
            </p>
          </PanelCard>
        </div>
      );
    }

    const pendingAccounts = remoteAccounts.filter(
      (account) => account.account_status === "pending_approval"
    );

    return (
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl text-blue-400">Account Admin</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Manage player access, reminder preferences, and account identity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={() => setCreatorViewMode("player")}
              variant={creatorViewMode === "player" ? "green" : "gray"}
            >
              Player View
            </ActionButton>
            <ActionButton
              onClick={() => setCreatorViewMode("creator")}
              variant={creatorViewMode === "creator" ? "purple" : "gray"}
            >
              Creator View
            </ActionButton>
            <ActionButton onClick={loadRemoteAccounts} variant="blue">
              {remoteLoading ? "Refreshing..." : "Refresh"}
            </ActionButton>
          </div>
        </div>

        {creatorViewMode === "player" && (
          <PanelCard className="border-emerald-500">
            <h2 className="text-xl text-emerald-200">Player View Active</h2>
            <p className="text-zinc-300">
              Use the normal navigation to experience the app as a player. Switch back to Creator View here when you need editing tools.
            </p>
          </PanelCard>
        )}

        {creatorViewMode === "creator" && (
          <PanelCard className="border-purple-500">
            <h2 className="text-xl text-purple-200">Creator Media Uploads</h2>
            <p className="text-sm text-zinc-400">
              Upload artifact and page media without waiting for the player account list. Files are stored in Supabase Storage, and the database only saves the public URL.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm text-zinc-300">
                Scope
                <select
                  value={mediaDraft.scope}
                  onChange={(event) =>
                    setMediaDraft((current) => ({
                      ...current,
                      scope: event.target.value as CreatorMediaScope,
                      accountId:
                        event.target.value === "user" ? current.accountId : null,
                    }))
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value="user">Selected user only</option>
                  <option value="global">Apply globally</option>
                  <option value="fallback">Fallback/default</option>
                </select>
              </label>

              <label className="space-y-1 text-sm text-zinc-300">
                Selected user
                <select
                  value={mediaDraft.accountId ?? ""}
                  onChange={(event) =>
                    setMediaDraft((current) => ({
                      ...current,
                      accountId: event.target.value || null,
                    }))
                  }
                  disabled={mediaDraft.scope !== "user"}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value="">
                    {mediaDraft.scope === "user"
                      ? "Choose user"
                      : "Not needed for global media"}
                  </option>
                  {remoteAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.display_name || account.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm text-zinc-300">
                Target type
                <select
                  value={mediaDraft.targetType}
                  onChange={(event) => {
                    const type = event.target.value as CreatorMediaTargetType;
                    const option = mediaTargetOptions.find((item) => item.type === type);
                    setMediaDraft((current) => ({
                      ...current,
                      targetType: type,
                      targetId: option?.defaultTargetId ?? current.targetId,
                    }));
                  }}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {mediaTargetOptions.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {isArtifactMediaTarget(mediaDraft.targetType) ? (
                <label className="space-y-1 text-sm text-zinc-300">
                  Artifact
                  <select
                    value={mediaDraft.targetId}
                    onChange={(event) =>
                      setMediaDraft((current) => ({
                        ...current,
                        targetId: event.target.value,
                      }))
                    }
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                  >
                    {artifactOrder.map((artifactKey) => (
                      <option key={artifactKey} value={artifactKey}>
                        {getArtifactMeta(artifactKey).title} ({artifactKey})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="space-y-1 text-sm text-zinc-300">
                  Target ID
                  <input
                    value={mediaDraft.targetId}
                    onChange={(event) =>
                      setMediaDraft((current) => ({
                        ...current,
                        targetId: event.target.value,
                      }))
                    }
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                    placeholder="rank, exercise name, default..."
                  />
                </label>
              )}

              <label className="space-y-1 text-sm text-zinc-300">
                Title
                <input
                  value={mediaDraft.title}
                  onChange={(event) =>
                    setMediaDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </label>

              <label className="space-y-1 text-sm text-zinc-300">
                Alt text
                <input
                  value={mediaDraft.altText}
                  onChange={(event) =>
                    setMediaDraft((current) => ({
                      ...current,
                      altText: event.target.value,
                    }))
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </label>

              <label className="space-y-1 text-sm text-zinc-300 md:col-span-2">
                Hosted media URL
                <input
                  value={mediaDraft.fileUrl}
                  onChange={(event) => {
                    const fileUrl = event.target.value;
                    setMediaDraft((current) => ({
                      ...current,
                      file: null,
                      previewUrl: "",
                      fileUrl,
                      fileType: inferMediaTypeFromUrl(fileUrl),
                    }));
                  }}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                  placeholder="https://... or choose a file below"
                />
              </label>
            </div>

            <input
              type="file"
              accept="image/*,video/*,.gif,.json"
              onChange={(event) => handleMediaFile(event.target.files?.[0] ?? null)}
              className="w-full"
            />

            {(mediaDraft.previewUrl || mediaDraft.fileUrl) && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
                <p className="mb-2 text-sm text-zinc-400">Preview before publish</p>
                {mediaDraft.fileType.startsWith("video/") ? (
                  <video
                    src={mediaDraft.previewUrl || mediaDraft.fileUrl}
                    className="max-h-64 w-full rounded object-contain"
                    controls
                  />
                ) : mediaDraft.fileType.includes("json") ? (
                  <pre className="max-h-64 overflow-auto text-xs text-zinc-300">
                    {mediaDraft.file?.name ?? mediaDraft.fileUrl.slice(0, 1200)}
                  </pre>
                ) : (
                  <div className="relative h-64 w-full">
                    <Image
                      src={mediaDraft.previewUrl || mediaDraft.fileUrl}
                      alt={mediaDraft.altText || "Media preview"}
                      fill
                      unoptimized
                      sizes="(min-width: 768px) 720px, 100vw"
                      className="rounded object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <ActionButton
                onClick={saveCreatorMedia}
                variant="purple"
                disabled={!mediaDraft.file && !mediaDraft.fileUrl.trim()}
              >
                Save Media
              </ActionButton>
            </div>
          </PanelCard>
        )}

        {creatorViewMode === "creator" && (
          <>
        {creatorNotice && (
          <PanelCard className="border-emerald-500">
            <p className="text-emerald-200">{creatorNotice}</p>
          </PanelCard>
        )}

        {remoteError && (
          <PanelCard className="border-red-500">
            <p className="text-red-300">{remoteError}</p>
          </PanelCard>
        )}

        {pendingAccounts.length > 0 && (
          <PanelCard className="border-yellow-500">
            <h2 className="text-xl text-yellow-200">
              Pending Approvals: {pendingAccounts.length}
            </h2>
            <p className="text-zinc-300">
              New accounts are blocked from the full app until approved.
            </p>
          </PanelCard>
        )}

        {adminNotifications.length > 0 && (
          <PanelCard className="border-cyan-500">
            <h2 className="text-xl text-cyan-200">Admin Notifications</h2>
            <div className="space-y-3">
              {adminNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="rounded border border-zinc-800 bg-zinc-900 p-3"
                >
                  <p className="font-medium text-white">{notification.title}</p>
                  <p className="text-sm text-zinc-300">
                    {notification.details}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>
        )}

        {remoteLoading && remoteAccounts.length === 0 ? (
          <PanelCard>
            <p>Loading accounts...</p>
          </PanelCard>
        ) : remoteAccounts.length === 0 ? (
          <PanelCard>
            <p className="text-zinc-400">
              No accounts yet. Sign up with your creator email first, then new players will appear here.
            </p>
          </PanelCard>
        ) : (
          <div className="space-y-4">
            {remoteAccounts.map((account) => {
              const editableState = getEditableState(account);
              const stats = normalizeStats({
                strength: editableState.strength,
                vitality: editableState.vitality,
                discipline: editableState.discipline,
                intelligence: editableState.intelligence,
                agility: editableState.agility,
                magicResistance: editableState.magicResistance,
              });
              const rank = getSystemRank(account.state?.total_xp ?? 0, stats);
              const hasDetailedState = Boolean(account.state?.app_state_json);
              const isEditorOpen =
                expandedAccountId === account.id && hasDetailedState;
              const accountAppState = isEditorOpen
                ? getAccountAppState(account)
                : null;
              const completedQuestCount = accountAppState
                ? accountAppState.quests.filter((quest) => quest.completed)
                    .length
                : 0;
              const isPrimaryCreator =
                account.email.toLowerCase() === primaryCreatorEmail;

              return (
                <PanelCard key={account.id}>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">
                          {account.display_name || "Unnamed User"}
                        </p>
                        <p className="text-sm text-zinc-400">{account.email}</p>
                        <p className="mt-2 text-sm text-zinc-400">
                          Rank: {rank} | XP: {account.state?.total_xp ?? 0} | Streak: {account.state?.streak ?? 0}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-wide text-blue-300">
                          {account.role}
                        </span>
                        <span
                          className={`rounded border px-3 py-1 text-xs uppercase tracking-wide ${
                            account.account_status === "approved"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                              : account.account_status === "rejected"
                              ? "border-red-500/40 bg-red-500/10 text-red-300"
                              : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                          }`}
                        >
                          {account.account_status.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                      <input
                        value={account.display_name}
                        onChange={(event) => {
                          const displayName = event.target.value;
                          setRemoteAccounts((current) =>
                            current.map((item) =>
                              item.id === account.id
                                ? { ...item, display_name: displayName }
                                : item
                            )
                          );
                        }}
                        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        placeholder="Display name"
                      />

                      <ActionButton
                        onClick={() => saveProfileName(account)}
                        variant="blue"
                      >
                        Save Name
                      </ActionButton>

                        <select
                          value={account.role}
                          onChange={(event) =>
                            updateRemoteProfile(account.id, {
                              role: event.target.value as RemoteProfile["role"],
                            })
                          }
                          disabled={isPrimaryCreator}
                          className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        >
                          <option value="player">Player</option>
                          <option value="creator">Creator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>

                    <div className="flex flex-wrap gap-2">
                      <ActionButton
                        onClick={() =>
                          updateRemoteProfile(account.id, {
                            account_status: "approved",
                          })
                        }
                        variant="green"
                        disabled={account.account_status === "approved"}
                      >
                        Approve
                      </ActionButton>
                      <ActionButton
                        onClick={() =>
                          updateRemoteProfile(account.id, {
                            account_status: "rejected",
                          })
                        }
                        variant="red"
                        disabled={isPrimaryCreator}
                      >
                        Reject
                      </ActionButton>
                      <ActionButton
                        onClick={() =>
                          updateRemoteProfile(account.id, {
                            account_status: "blocked",
                          })
                        }
                        variant="red"
                        disabled={isPrimaryCreator}
                      >
                        Block
                      </ActionButton>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={account.reminders_enabled}
                        onChange={(event) =>
                          updateRemoteProfile(account.id, {
                            reminders_enabled: event.target.checked,
                          })
                        }
                      />
                      Daily reminders enabled
                    </label>

                    <div className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900 px-3 py-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-zinc-400">
                        Open this player when you need quests, profile fields,
                        artifacts, notes, or advanced JSON.
                      </p>
                      <ActionButton
                        onClick={() => void toggleAccountEditor(account)}
                        variant={isEditorOpen ? "gray" : "blue"}
                        disabled={loadingAccountStateId === account.id}
                      >
                        {loadingAccountStateId === account.id
                          ? "Loading Editor..."
                          : isEditorOpen
                          ? "Hide Editor"
                          : "Open Editor"}
                      </ActionButton>
                    </div>

                    {isEditorOpen && accountAppState ? (
                      <>
                    <div className="border-t border-zinc-800 pt-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                            Quest Status
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            Daily: {completedQuestCount}/{accountAppState.quests.length} complete | Special: {accountAppState.specialQuest.status}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            onClick={() => resetDailyQuests(account)}
                            variant="gray"
                          >
                            Reset Daily
                          </ActionButton>
                          <ActionButton
                            onClick={() => regenerateSpecialQuest(account)}
                            variant="purple"
                          >
                            Regenerate Special
                          </ActionButton>
                          <ActionButton
                            onClick={() =>
                              updateAccountAppStateDraft(account.id, (record) => {
                                const nextId =
                                  Math.max(0, ...record.quests.map((quest) => quest.id)) + 1;
                                const customQuest: Quest = {
                                  id: nextId,
                                  title: "Creator custom quest",
                                  description: "Edited in Creator View.",
                                  xp: 25,
                                  completed: false,
                                  awardedToday: false,
                                  statRewards: { discipline: 1 },
                                };

                                return {
                                  ...record,
                                  quests: [...record.quests, customQuest],
                                };
                              })
                            }
                            variant="blue"
                          >
                            Add Quest
                          </ActionButton>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {accountAppState.quests.map((quest) => (
                          <div
                            key={quest.id}
                            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
                          >
                            <input
                              value={quest.title}
                              onChange={(event) =>
                                updateAccountAppStateDraft(account.id, (record) => ({
                                  ...record,
                                  quests: record.quests.map((item) =>
                                    item.id === quest.id
                                      ? { ...item, title: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm font-semibold text-white"
                            />
                            <textarea
                              value={quest.description ?? ""}
                              onChange={(event) =>
                                updateAccountAppStateDraft(account.id, (record) => ({
                                  ...record,
                                  quests: record.quests.map((item) =>
                                    item.id === quest.id
                                      ? { ...item, description: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                              className="mt-2 min-h-16 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white"
                              placeholder="Quest description"
                            />
                            <p
                              className={`mt-1 text-xs ${
                                quest.completed
                                  ? "text-emerald-300"
                                  : "text-zinc-400"
                              }`}
                            >
                              {getQuestStatusLabel(quest.completed)} | {quest.xp} XP
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <input
                                type="number"
                                min="0"
                                value={quest.xp}
                                onChange={(event) =>
                                  updateAccountAppStateDraft(account.id, (record) => ({
                                    ...record,
                                    quests: record.quests.map((item) =>
                                      item.id === quest.id
                                        ? { ...item, xp: toSafeNumber(Number(event.target.value)) }
                                        : item
                                    ),
                                  }))
                                }
                                className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
                              />
                              <ActionButton
                                onClick={() =>
                                  updateAccountAppStateDraft(account.id, (record) => ({
                                    ...record,
                                    quests: record.quests.map((item) =>
                                      item.id === quest.id
                                        ? {
                                            ...item,
                                            completed: !item.completed,
                                            awardedToday: item.completed
                                              ? false
                                              : item.awardedToday,
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                variant={quest.completed ? "gray" : "green"}
                              >
                                {quest.completed ? "Reopen" : "Complete"}
                              </ActionButton>
                              <ActionButton
                                onClick={() =>
                                  updateAccountAppStateDraft(account.id, (record) => ({
                                    ...record,
                                    quests: record.quests.filter((item) => item.id !== quest.id),
                                  }))
                                }
                                variant="red"
                              >
                                Delete
                              </ActionButton>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2">
                        <input
                          value={accountAppState.specialQuest.title}
                          onChange={(event) =>
                            updateAccountAppStateDraft(account.id, (record) => ({
                              ...record,
                              specialQuest: {
                                ...record.specialQuest,
                                title: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded border border-purple-500/40 bg-zinc-900 px-2 py-1 text-sm font-semibold text-purple-100"
                        />
                        <textarea
                          value={accountAppState.specialQuest.description}
                          onChange={(event) =>
                            updateAccountAppStateDraft(account.id, (record) => ({
                              ...record,
                              specialQuest: {
                                ...record.specialQuest,
                                description: event.target.value,
                              },
                            }))
                          }
                          className="mt-2 min-h-16 w-full rounded border border-purple-500/40 bg-zinc-900 px-2 py-1 text-sm text-purple-100"
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            type="number"
                            min="0"
                            value={accountAppState.specialQuest.xp}
                            onChange={(event) =>
                              updateAccountAppStateDraft(account.id, (record) => ({
                                ...record,
                                specialQuest: {
                                  ...record.specialQuest,
                                  xp: toSafeNumber(Number(event.target.value)),
                                },
                              }))
                            }
                            className="w-24 rounded border border-purple-500/40 bg-zinc-900 px-2 py-1 text-white"
                          />
                          <select
                            value={accountAppState.specialQuest.status}
                            onChange={(event) =>
                              updateAccountAppStateDraft(account.id, (record) => ({
                                ...record,
                                specialQuest: {
                                  ...record.specialQuest,
                                  status: event.target.value as SpecialQuest["status"],
                                  completed: event.target.value === "completed",
                                },
                              }))
                            }
                            className="rounded border border-purple-500/40 bg-zinc-900 px-2 py-1 text-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="urgent">Urgent</option>
                            <option value="completed">Completed</option>
                            <option value="waived">Waived</option>
                          </select>
                          <ActionButton
                            onClick={() =>
                              saveCreatorEditedState(
                                account,
                                "quests and special quest",
                                "quests"
                              )
                            }
                            variant="green"
                          >
                            Save Quests
                          </ActionButton>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                            Profile & Onboarding
                          </p>
                          <p className="text-xs text-zinc-500">
                            Edits here update the same profile used by quests, diet, workout, and AI prompts.
                          </p>
                        </div>
                        <ActionButton
                          onClick={() =>
                            saveCreatorEditedState(
                              account,
                              "profile and onboarding",
                              "profile"
                            )
                          }
                          variant="green"
                        >
                          Save Profile
                        </ActionButton>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {profileTextFields.map((field) => (
                          <label
                            key={String(field.key)}
                            className="space-y-1 text-sm text-zinc-300"
                          >
                            <span>{field.label}</span>
                            <input
                              value={String(accountAppState.profile[field.key] ?? "")}
                              onChange={(event) =>
                                updateAccountAppStateDraft(account.id, (record) => ({
                                  ...record,
                                  profile: {
                                    ...record.profile,
                                    [field.key]: event.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                          </label>
                        ))}

                        {(["age", "heightCm", "weightKg", "availableMinutesWeekday", "availableMinutesWeekend", "sleepTargetHours"] as Array<keyof UserProfile>).map((field) => (
                          <label
                            key={String(field)}
                            className="space-y-1 text-sm text-zinc-300"
                          >
                            <span>{String(field)}</span>
                            <input
                              type="number"
                              value={Number(accountAppState.profile[field] ?? 0)}
                              onChange={(event) =>
                                updateAccountAppStateDraft(account.id, (record) => ({
                                  ...record,
                                  profile: {
                                    ...record.profile,
                                    [field]: Number(event.target.value),
                                  },
                                }))
                              }
                              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={accountAppState.profile.onboardingCompleted}
                            onChange={(event) =>
                              updateAccountAppStateDraft(account.id, (record) => ({
                                ...record,
                                profile: {
                                  ...record.profile,
                                  onboardingCompleted: event.target.checked,
                                },
                              }))
                            }
                          />
                          Onboarding complete
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={accountAppState.profile.wantsWorkoutPlan}
                            onChange={(event) =>
                              updateAccountAppStateDraft(account.id, (record) => ({
                                ...record,
                                profile: {
                                  ...record.profile,
                                  wantsWorkoutPlan: event.target.checked,
                                },
                              }))
                            }
                          />
                          Workout support
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={accountAppState.profile.wantsDietSupport}
                            onChange={(event) =>
                              updateAccountAppStateDraft(account.id, (record) => ({
                                ...record,
                                profile: {
                                  ...record.profile,
                                  wantsDietSupport: event.target.checked,
                                },
                              }))
                            }
                          />
                          Diet support
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                        Support Adjustments
                      </p>

                      <div className="grid gap-3 md:grid-cols-3">
                        {editableStateFields.map((field) => (
                          <label
                            key={field.key}
                            className="space-y-1 text-sm text-zinc-300"
                          >
                            <span>{field.label}</span>
                            <input
                              type="number"
                              min="0"
                              value={getStateValue(account, field.key)}
                              onChange={(event) =>
                                updateRemoteStateDraft(
                                  account.id,
                                  field.key,
                                  Number(event.target.value)
                                )
                              }
                              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <ActionButton
                          onClick={() => saveRemoteState(account)}
                          variant="green"
                        >
                          Save Player State
                        </ActionButton>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                            Artifacts & Active Effects
                          </p>
                          <p className="text-xs text-zinc-500">
                            Inventory, active timers, World progress, and artifact status all save to the same player artifact state.
                          </p>
                        </div>
                        <ActionButton
                          onClick={() =>
                            saveCreatorEditedState(
                              account,
                              "artifact inventory and active effects",
                              "artifacts"
                            )
                          }
                          variant="green"
                        >
                          Save Artifacts
                        </ActionButton>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {artifactOrder.map((artifactKey) => {
                          const artifact = normalizeArtifacts(
                            accountAppState.artifacts
                          ).find((item) => item.key === artifactKey);
                          if (!artifact) return null;

                          return (
                            <div
                              key={artifact.key}
                              className="rounded border border-zinc-800 bg-zinc-900 p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-medium text-white">
                                    {artifact.symbol} {artifact.title}
                                  </p>
                                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                                    {artifact.rarity}
                                  </p>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={artifact.quantity}
                                  onChange={(event) =>
                                    updateAccountAppStateDraft(account.id, (record) => ({
                                      ...record,
                                      artifacts: normalizeArtifacts(record.artifacts).map((item) =>
                                        item.key === artifact.key
                                          ? {
                                              ...item,
                                              quantity: toSafeNumber(Number(event.target.value)),
                                              unlocked: Number(event.target.value) > 0 || item.unlocked,
                                              owned: Number(event.target.value) > 0 || item.owned,
                                            }
                                          : item
                                      ),
                                    }))
                                  }
                                  className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-white"
                                />
                              </div>
                              <select
                                value={artifact.status}
                                onChange={(event) =>
                                  updateAccountAppStateDraft(account.id, (record) => ({
                                    ...record,
                                    artifacts: normalizeArtifacts(record.artifacts).map((item) =>
                                      item.key === artifact.key
                                        ? {
                                            ...item,
                                            status: event.target.value as Artifact["status"],
                                            unlocked: item.unlocked || item.quantity > 0,
                                            owned: item.owned || item.quantity > 0,
                                          }
                                        : item
                                    ),
                                  }))
                                }
                                className="mt-3 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                              >
                                <option value="locked">Locked</option>
                                <option value="available">Available</option>
                                <option value="active">Active</option>
                                <option value="used">Used</option>
                                <option value="expired">Expired</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 space-y-3">
                        {normalizeActiveEffects(accountAppState.activeEffects).artifactEffects.length > 0 ? (
                          normalizeActiveEffects(accountAppState.activeEffects).artifactEffects.map((effect) => {
                            const meta = getArtifactMeta(effect.artifactId);
                            const worldProgress =
                              effect.artifactId === "world_completion"
                                ? Number(effect.metadata.currentProgress ?? 0)
                                : null;
                            const worldRequired =
                              effect.artifactId === "world_completion"
                                ? Number(effect.metadata.requiredProgress ?? 30)
                                : null;

                            return (
                              <div
                                key={effect.id}
                                className="rounded border border-yellow-500/30 bg-yellow-500/10 p-3"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <p className="font-medium text-yellow-100">
                                      {meta.title}
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                      {effect.effectType} | {effect.status}
                                    </p>
                                  </div>
                                  <ActionButton
                                    onClick={() => {
                                      if (!window.confirm(`Remove active effect ${meta.title}?`)) return;
                                      updateAccountAppStateDraft(account.id, (record) => ({
                                        ...record,
                                        activeEffects: {
                                          ...normalizeActiveEffects(record.activeEffects),
                                          artifactEffects: normalizeActiveEffects(record.activeEffects).artifactEffects.filter(
                                            (item) => item.id !== effect.id
                                          ),
                                        },
                                      }));
                                    }}
                                    variant="red"
                                  >
                                    Remove Effect
                                  </ActionButton>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                  <label className="space-y-1 text-sm text-zinc-300">
                                    Status
                                    <select
                                      value={effect.status}
                                      onChange={(event) =>
                                        updateAccountAppStateDraft(account.id, (record) => ({
                                          ...record,
                                          activeEffects: {
                                            ...normalizeActiveEffects(record.activeEffects),
                                            artifactEffects: normalizeActiveEffects(record.activeEffects).artifactEffects.map((item) =>
                                              item.id === effect.id
                                                ? {
                                                    ...item,
                                                    status: event.target.value as ActiveArtifactEffect["status"],
                                                    updatedAt: new Date().toISOString(),
                                                  }
                                                : item
                                            ),
                                          },
                                        }))
                                      }
                                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                    >
                                      <option value="active">Active</option>
                                      <option value="completed">Completed</option>
                                      <option value="failed">Failed</option>
                                      <option value="expired">Expired</option>
                                      <option value="cancelled">Cancelled</option>
                                    </select>
                                  </label>
                                  <label className="space-y-1 text-sm text-zinc-300">
                                    Expires at
                                    <input
                                      value={effect.expiresAt ?? ""}
                                      onChange={(event) =>
                                        updateAccountAppStateDraft(account.id, (record) => ({
                                          ...record,
                                          activeEffects: {
                                            ...normalizeActiveEffects(record.activeEffects),
                                            artifactEffects: normalizeActiveEffects(record.activeEffects).artifactEffects.map((item) =>
                                              item.id === effect.id
                                                ? {
                                                    ...item,
                                                    expiresAt: event.target.value || null,
                                                    updatedAt: new Date().toISOString(),
                                                  }
                                                : item
                                            ),
                                          },
                                        }))
                                      }
                                      className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                    />
                                  </label>
                                  {worldProgress !== null && worldRequired !== null && (
                                    <label className="space-y-1 text-sm text-zinc-300">
                                      World progress
                                      <input
                                        type="number"
                                        min="0"
                                        max={worldRequired}
                                        value={worldProgress}
                                        onChange={(event) =>
                                          updateAccountAppStateDraft(account.id, (record) => ({
                                            ...record,
                                            activeEffects: {
                                              ...normalizeActiveEffects(record.activeEffects),
                                              artifactEffects: normalizeActiveEffects(record.activeEffects).artifactEffects.map((item) =>
                                                item.id === effect.id
                                                  ? {
                                                      ...item,
                                                      metadata: {
                                                        ...item.metadata,
                                                        currentProgress: Math.max(
                                                          0,
                                                          Math.min(
                                                            worldRequired,
                                                            Number(event.target.value)
                                                          )
                                                        ),
                                                        streakDaysCounted: Math.max(
                                                          0,
                                                          Math.min(
                                                            worldRequired,
                                                            Number(event.target.value)
                                                          )
                                                        ),
                                                      },
                                                      updatedAt: new Date().toISOString(),
                                                    }
                                                  : item
                                              ),
                                            },
                                          }))
                                        }
                                        className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
                            No active artifact effects.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                        Support Note
                      </p>
                      <textarea
                        value={supportNotes[account.id] ?? ""}
                        onChange={(event) =>
                          updateSupportNoteDraft(account.id, event.target.value)
                        }
                        className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                        placeholder="Add a note to this player account..."
                      />
                      <div className="mt-3 flex justify-end">
                        <ActionButton
                          onClick={() => saveSupportNote(account)}
                          variant="blue"
                          disabled={!supportNotes[account.id]?.trim()}
                        >
                          Add Support Note
                        </ActionButton>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                            Advanced System Editors
                          </p>
                          <p className="text-xs text-zinc-500">
                            JSON editors for nested systems. Invalid JSON is rejected before it changes the player record.
                          </p>
                        </div>
                        <ActionButton
                          onClick={() =>
                            saveCreatorEditedState(
                              account,
                              "advanced nested data",
                              "advanced_json"
                            )
                          }
                          variant="green"
                        >
                          Save Advanced Data
                        </ActionButton>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {[
                          {
                            label: "Workout plan",
                            value: accountAppState.workoutProgram,
                            apply: (record: UserRecord, parsed: unknown) => ({
                              ...record,
                              workoutProgram: parsed as UserRecord["workoutProgram"],
                            }),
                          },
                          {
                            label: "Tasks and task history",
                            value: {
                              householdTasks: accountAppState.householdTasks,
                              taskHistory: accountAppState.taskHistory,
                            },
                            apply: (record: UserRecord, parsed: unknown) => {
                              const value = parsed as Pick<UserRecord, "householdTasks" | "taskHistory">;
                              return {
                                ...record,
                                householdTasks: Array.isArray(value.householdTasks)
                                  ? value.householdTasks
                                  : record.householdTasks,
                                taskHistory: Array.isArray(value.taskHistory)
                                  ? value.taskHistory
                                  : record.taskHistory,
                              };
                            },
                          },
                          {
                            label: "Diet logs and feedback",
                            value: {
                              foodJournal: accountAppState.foodJournal,
                              dietFeedback: accountAppState.dietFeedback,
                            },
                            apply: (record: UserRecord, parsed: unknown) => {
                              const value = parsed as Pick<UserRecord, "foodJournal" | "dietFeedback">;
                              return {
                                ...record,
                                foodJournal: Array.isArray(value.foodJournal)
                                  ? value.foodJournal
                                  : record.foodJournal,
                                dietFeedback: Array.isArray(value.dietFeedback)
                                  ? value.dietFeedback
                                  : record.dietFeedback,
                              };
                            },
                          },
                          {
                            label: "Workout journal",
                            value: accountAppState.workoutJournal,
                            apply: (record: UserRecord, parsed: unknown) => ({
                              ...record,
                              workoutJournal: Array.isArray(parsed)
                                ? (parsed as UserRecord["workoutJournal"])
                                : record.workoutJournal,
                            }),
                          },
                          {
                            label: "System log",
                            value: accountAppState.log,
                            apply: (record: UserRecord, parsed: unknown) => ({
                              ...record,
                              log: Array.isArray(parsed)
                                ? (parsed as UserRecord["log"])
                                : record.log,
                            }),
                          },
                          {
                            label: "AI analysis and weekly plan",
                            value: {
                              aiAnalysis: accountAppState.aiAnalysis,
                              aiWeeklyPlan: accountAppState.aiWeeklyPlan,
                            },
                            apply: (record: UserRecord, parsed: unknown) => {
                              const value = parsed as Pick<UserRecord, "aiAnalysis" | "aiWeeklyPlan">;
                              return {
                                ...record,
                                aiAnalysis:
                                  "aiAnalysis" in value ? value.aiAnalysis : record.aiAnalysis,
                                aiWeeklyPlan:
                                  "aiWeeklyPlan" in value ? value.aiWeeklyPlan : record.aiWeeklyPlan,
                              };
                            },
                          },
                        ].map((editor) => (
                          <label
                            key={editor.label}
                            className="space-y-2 text-sm text-zinc-300"
                          >
                            <span>{editor.label}</span>
                            <textarea
                              defaultValue={safeJson(editor.value)}
                              onBlur={(event) => {
                                const parsed = parseJsonOrNull(event.target.value);
                                if (parsed === null) {
                                  setRemoteError(`Invalid JSON in ${editor.label}.`);
                                  return;
                                }
                                setRemoteError(null);
                                updateAccountAppStateDraft(account.id, (record) =>
                                  editor.apply(record, parsed)
                                );
                              }}
                              className="min-h-48 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-white"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                      </>
                    ) : (
                      <p className="rounded border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-400">
                        Editor closed. The account list is loaded without full
                        player JSON so creator view stays responsive.
                      </p>
                    )}
                  </div>
                </PanelCard>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Users</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  function handleCreateUser() {
    if (!newName.trim()) return;
    createUser(newName);
    setNewName("");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Users</h1>

      <PanelCard>
        <h2 className="text-xl text-white">Create New User</h2>

        <div className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            placeholder="Enter user name"
          />
          <ActionButton onClick={handleCreateUser} variant="blue">
            Create
          </ActionButton>
        </div>

        <p className="text-sm text-zinc-400">
          New users begin with a default profile and should complete the initiation survey in Profile Setup.
        </p>
      </PanelCard>

      <div className="space-y-4">
        {users.map((user) => {
          const rank = getSystemRank(user.totalXp, user.stats);

          return (
            <PanelCard
              key={user.id}
              className={
                user.id === activeUserId ? "border-green-500" : "border-zinc-700"
              }
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg text-white">
                    {user.profile.name || "Unnamed User"}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Why get better: {user.profile.goal || "No reason set"}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Difficulty: {user.profile.difficulty}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Preferred Build: {user.profile.preferredBuild}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Rank: {rank}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Total XP: {user.totalXp}
                  </p>
                  <p
                    className={`text-sm ${
                      user.profile.onboardingCompleted
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {user.profile.onboardingCompleted
                      ? "Survey completed"
                      : "Survey not completed"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => switchUser(user.id)}
                    variant={user.id === activeUserId ? "green" : "blue"}
                  >
                    {user.id === activeUserId ? "Active" : "Switch"}
                  </ActionButton>

                  <ActionButton
                    onClick={() => deleteUser(user.id)}
                    variant="red"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </PanelCard>
          );
        })}
      </div>
    </div>
  );
}

