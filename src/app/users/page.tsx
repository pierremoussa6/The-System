"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "../store";
import { useAuth } from "../auth-context";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import PanelCard from "../components/PanelCard";
import ActionButton from "../components/ActionButton";
import { getSystemRank } from "../rank-system";
import type { LogEntryType, UserRecord } from "../types";
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

type RemoteProfile = {
  id: string;
  email: string;
  display_name: string;
  role: "creator" | "player";
  timezone: string;
  reminders_enabled: boolean;
  created_at: string;
};

type RemoteUserState = {
  user_id: string;
  total_xp: number;
  streak: number;
  last_completion_date: string | null;
  strength: number;
  vitality: number;
  discipline: number;
  focus: number;
  intelligence: number;
  agility: number;
  magicResistance: number;
  app_state_json: UserRecord | null;
  updated_at: string;
};

type RemoteAccount = RemoteProfile & {
  state: RemoteUserState | null;
};

type EditableStateField =
  | "total_xp"
  | "streak"
  | "strength"
  | "vitality"
  | "discipline"
  | "intelligence"
  | "agility"
  | "magicResistance";

const editableStateFields: { key: EditableStateField; label: string }[] = [
  { key: "total_xp", label: "XP" },
  { key: "streak", label: "Streak" },
  { key: "strength", label: "Strength" },
  { key: "vitality", label: "Vitality" },
  { key: "discipline", label: "Discipline" },
  { key: "intelligence", label: "Intelligence" },
  { key: "agility", label: "Agility" },
  { key: "magicResistance", label: "Magic Resistance" },
];

const primaryCreatorEmail = "pierremoussa6@gmail.com";

function toSafeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function getEditableState(account: RemoteAccount): RemoteUserState {
  const baseState = account.state ?? {
    user_id: account.id,
    total_xp: 0,
    streak: 0,
    last_completion_date: null,
    strength: 0,
    vitality: 0,
    discipline: 0,
    focus: 0,
    app_state_json: null,
    updated_at: new Date().toISOString(),
  };
  const appStats = normalizeStats(baseState.app_state_json?.stats ?? null);

  return {
    ...baseState,
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
  });
}

function getAccountAppState(account: RemoteAccount) {
  return createRemoteAppState(account, getEditableState(account));
}

function getQuestStatusLabel(completed: boolean) {
  return completed ? "Completed" : "Open";
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
  const { status, isCreator } = useAuth();
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
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [supportNotes, setSupportNotes] = useState<Record<string, string>>({});

  const loadRemoteAccounts = useCallback(async () => {
    if (status === "unconfigured" || !isCreator) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setRemoteLoading(true);
    setRemoteError(null);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,email,display_name,role,timezone,reminders_enabled,created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      setRemoteError(profilesError.message);
      setRemoteLoading(false);
      return;
    }

    const profileRows = (profiles ?? []) as RemoteProfile[];
    const profileIds = profileRows.map((profile) => profile.id);

    const { data: states, error: statesError } = profileIds.length
      ? await supabase
          .from("user_state")
          .select("user_id,total_xp,streak,last_completion_date,strength,vitality,discipline,focus,app_state_json,updated_at")
          .in("user_id", profileIds)
      : { data: [], error: null };

    if (statesError) {
      setRemoteError(statesError.message);
      setRemoteLoading(false);
      return;
    }

    const stateByUserId = new Map(
      ((states ?? []) as RemoteUserState[]).map((state) => [
        state.user_id,
        state,
      ])
    );

    setRemoteAccounts(
      profileRows.map((profile) => ({
        ...profile,
        state: stateByUserId.get(profile.id) ?? null,
      }))
    );
    setRemoteLoading(false);
  }, [isCreator, status]);

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
    updates: Partial<Pick<RemoteProfile, "display_name" | "role" | "reminders_enabled">>
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

    await loadRemoteAccounts();
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
    const { error } = await supabase.from("user_state").upsert(
      {
        user_id: account.id,
        total_xp: nextAppState.totalXp,
        streak: nextAppState.streak,
        last_completion_date: nextAppState.lastCompletionDate,
        strength: nextAppState.stats.strength,
        vitality: nextAppState.stats.vitality,
        discipline: nextAppState.stats.discipline,
        focus: nextAppState.stats.intelligence,
        app_state_json: nextAppState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      setRemoteError(error.message);
      return false;
    }

    if (logEntry) {
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

    await loadRemoteAccounts();
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

  async function saveRemoteState(account: RemoteAccount) {
    const state = getEditableState(account);
    const appState = createRemoteAppState(account, state);

    await saveAccountState(account, appState, {
      title: "Support Adjustment Applied",
      details:
        `Creator support updated XP to ${appState.totalXp}, streak to ${appState.streak}, ` +
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
      quests: createDailyQuests(appState.profile, getTodayString()),
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

    return (
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl text-blue-400">Account Admin</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Manage player access, reminder preferences, and account identity.
            </p>
          </div>

          <ActionButton onClick={loadRemoteAccounts} variant="blue">
            {remoteLoading ? "Refreshing..." : "Refresh"}
          </ActionButton>
        </div>

        {remoteError && (
          <PanelCard className="border-red-500">
            <p className="text-red-300">{remoteError}</p>
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
              const accountAppState = getAccountAppState(account);
              const completedQuestCount = accountAppState.quests.filter(
                (quest) => quest.completed
              ).length;
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

                      <span className="rounded border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-wide text-blue-300">
                        {account.role}
                      </span>
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

                      <ActionButton
                        onClick={() =>
                          updateRemoteProfile(account.id, {
                            role: account.role === "creator" ? "player" : "creator",
                          })
                        }
                        variant={account.role === "creator" ? "red" : "green"}
                        disabled={isPrimaryCreator}
                      >
                        {isPrimaryCreator
                          ? "Primary Creator"
                          : account.role === "creator"
                          ? "Make Player"
                          : "Make Creator"}
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
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {accountAppState.quests.map((quest) => (
                          <div
                            key={quest.id}
                            className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2"
                          >
                            <p className="text-sm font-semibold text-white">
                              {quest.title}
                            </p>
                            <p
                              className={`mt-1 text-xs ${
                                quest.completed
                                  ? "text-emerald-300"
                                  : "text-zinc-400"
                              }`}
                            >
                              {getQuestStatusLabel(quest.completed)} | {quest.xp} XP
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 rounded border border-purple-500/30 bg-purple-500/10 px-3 py-2">
                        <p className="text-sm font-semibold text-purple-100">
                          {accountAppState.specialQuest.title}
                        </p>
                        <p className="mt-1 text-xs text-purple-200">
                          {accountAppState.specialQuest.status} | {accountAppState.specialQuest.xp} XP
                        </p>
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
                  </div>
                </PanelCard>
              );
            })}
          </div>
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

