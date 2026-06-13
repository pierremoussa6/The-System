import type {
  AgilityActivityType,
  HouseholdTaskEntry,
  HouseholdTaskInput,
  HouseholdTaskKind,
  SpecialQuest,
  TaskHistoryEntry,
  TaskHistoryKind,
} from "./types";
import type { RewardBundle } from "./reward-system";
import { formatRewardText } from "./reward-system";

const validHouseholdTaskKinds: HouseholdTaskKind[] = [
  "chore",
  "grocery",
  "study",
  "agility",
];

const validTaskHistoryKinds: TaskHistoryKind[] = [
  ...validHouseholdTaskKinds,
  "daily_quest",
  "special_quest",
  "fun_special_activity",
];

export const taskKindLabels: Record<HouseholdTaskKind, string> = {
  chore: "Chore",
  grocery: "Grocery item",
  study: "Study session",
  agility: "Agility activity",
};

function createTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizePositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value * 10) / 10
    : undefined;
}

function sanitizeDuration(value: unknown) {
  const duration = sanitizePositiveNumber(value);
  return duration ? Math.max(1, Math.round(duration)) : undefined;
}

function sanitizeActivityType(value: unknown): AgilityActivityType {
  return value === "Run" ? "Run" : "Walk";
}

export function normalizeHouseholdTasks(
  entries: HouseholdTaskEntry[] | undefined
): HouseholdTaskEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const kind = validHouseholdTaskKinds.includes(entry.kind)
        ? entry.kind
        : ("chore" as const);

      return {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id
            : createTaskId(),
        kind,
        title: typeof entry.title === "string" ? entry.title.trim() : "",
        durationMinutes: sanitizeDuration(entry.durationMinutes),
        activityType:
          kind === "agility"
            ? sanitizeActivityType(entry.activityType)
            : undefined,
        distanceKm:
          kind === "agility"
            ? sanitizePositiveNumber(entry.distanceKm)
            : undefined,
        completed: Boolean(entry.completed),
        awarded: Boolean(entry.awarded),
        createdAt:
          typeof entry.createdAt === "string" && entry.createdAt.trim()
            ? entry.createdAt
            : new Date().toLocaleString(),
        completedAt:
          typeof entry.completedAt === "string" && entry.completedAt.trim()
            ? entry.completedAt
            : null,
      };
    })
    .filter((entry) => entry.title);
}

export function createHouseholdTask(
  kind: HouseholdTaskKind,
  input: string | HouseholdTaskInput,
  createdAt: string
): HouseholdTaskEntry | null {
  const title = typeof input === "string" ? input.trim() : input.title.trim();
  if (!title) return null;

  const durationMinutes =
    typeof input === "string" ? undefined : sanitizeDuration(input.durationMinutes);
  const activityType =
    kind === "agility" && typeof input !== "string"
      ? sanitizeActivityType(input.activityType)
      : undefined;
  const distanceKm =
    kind === "agility" && typeof input !== "string"
      ? sanitizePositiveNumber(input.distanceKm)
      : undefined;

  if (kind === "study" && !durationMinutes) return null;
  if (kind === "agility" && !distanceKm && !durationMinutes) return null;
  if (kind === "agility" && activityType === "Run" && (!distanceKm || distanceKm < 1)) {
    return null;
  }

  return {
    id: createTaskId(),
    kind,
    title,
    durationMinutes,
    activityType,
    distanceKm,
    completed: false,
    awarded: false,
    createdAt,
    completedAt: null,
  };
}

export function getHouseholdTaskReward(task: HouseholdTaskEntry): RewardBundle {
  if (task.kind === "chore") {
    return { xp: 20, statRewards: { discipline: 2 } };
  }

  if (task.kind === "grocery") {
    return { xp: 5, statRewards: {} };
  }

  if (task.kind === "study") {
    const intelligence = (task.durationMinutes ?? 0) >= 15 ? 2 : 1;
    return {
      xp: intelligence === 2 ? 20 : 10,
      statRewards: { intelligence },
    };
  }

  if (task.activityType === "Run") {
    const distanceKm = task.distanceKm ?? 0;
    const agility = distanceKm >= 3 ? 3 : distanceKm >= 1 ? 2 : 0;

    return {
      xp: agility === 3 ? 30 : agility === 2 ? 20 : 0,
      statRewards: agility > 0 ? { agility } : {},
    };
  }

  return { xp: 12, statRewards: { agility: 1 } };
}

export function getHouseholdTaskRewardText(task: HouseholdTaskEntry) {
  return formatRewardText(getHouseholdTaskReward(task));
}

export function getHouseholdTaskDetails(task: HouseholdTaskEntry) {
  if (task.kind === "study") {
    return `${task.durationMinutes ?? 0} min study session`;
  }

  if (task.kind === "agility") {
    const parts: string[] = [task.activityType ?? "Walk"];

    if (task.distanceKm) parts.push(`${task.distanceKm} km`);
    if (task.durationMinutes) parts.push(`${task.durationMinutes} min`);

    return parts.join(" / ");
  }

  return taskKindLabels[task.kind];
}

export function createTaskHistoryEntry(
  task: HouseholdTaskEntry,
  reward: RewardBundle,
  completedAt: string
): TaskHistoryEntry {
  return {
    id: `${task.id}-${completedAt}`,
    taskId: task.id,
    title: task.title,
    kind: task.kind,
    xp: reward.xp,
    statRewards: reward.statRewards,
    completedAt,
    source: task.kind,
    details: getHouseholdTaskDetails(task),
  };
}

export function createQuestTaskHistoryEntry(input: {
  taskId: string;
  title: string;
  description?: string;
  kind: Extract<TaskHistoryKind, "daily_quest" | "special_quest" | "fun_special_activity">;
  reward: RewardBundle;
  completedAt: string;
  source: string;
  artifactName?: string;
}): TaskHistoryEntry {
  const details = [
    input.description,
    `Source: ${input.source}`,
    input.artifactName ? `Generated by ${input.artifactName}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    id: `${input.taskId}-${input.completedAt}`,
    taskId: input.taskId,
    title: input.title,
    description: input.description,
    kind: input.kind,
    xp: input.reward.xp,
    statRewards: input.reward.statRewards,
    completedAt: input.completedAt,
    source: input.source,
    artifactName: input.artifactName,
    details,
  };
}

export function inferSpecialQuestHistorySource(activity: SpecialQuest) {
  const tags = activity.tags.join(" ").toLowerCase();
  const text = `${activity.title} ${activity.description} ${tags}`.toLowerCase();

  if (text.includes("lovers") || text.includes("pact")) {
    return { source: "artifact", artifactName: "The Lovers' Unbreakable Pact" };
  }
  if (text.includes("moon") || text.includes("secret")) {
    return { source: "artifact", artifactName: "The Moon's Secret Path" };
  }
  if (text.includes("devil") || text.includes("contract")) {
    return { source: "artifact", artifactName: "The Devil's Contract" };
  }
  if (activity.source) {
    return { source: activity.source.replace(/_/g, " "), artifactName: undefined };
  }

  return { source: "generated by system", artifactName: undefined };
}

export function normalizeTaskHistory(
  entries: TaskHistoryEntry[] | undefined
): TaskHistoryEntry[] {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const kind = validTaskHistoryKinds.includes(entry.kind)
        ? entry.kind
        : ("chore" as const);

      return {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id
            : `${entry.taskId ?? "task"}-${entry.completedAt ?? Date.now()}`,
        taskId:
          typeof entry.taskId === "string" && entry.taskId.trim()
            ? entry.taskId
            : "",
        title: typeof entry.title === "string" ? entry.title.trim() : "",
        kind,
        description:
          typeof entry.description === "string" ? entry.description.trim() : undefined,
        xp:
          typeof entry.xp === "number" && Number.isFinite(entry.xp)
            ? Math.max(0, Math.round(entry.xp))
            : 0,
        statRewards:
          entry.statRewards && typeof entry.statRewards === "object"
            ? entry.statRewards
            : {},
        completedAt:
          typeof entry.completedAt === "string" && entry.completedAt.trim()
            ? entry.completedAt
            : new Date().toLocaleString(),
        source:
          typeof entry.source === "string" && entry.source.trim()
            ? entry.source
            : kind,
        details: typeof entry.details === "string" ? entry.details.trim() : "",
        artifactName:
          typeof entry.artifactName === "string" ? entry.artifactName : undefined,
      };
    })
    .filter((entry) => entry.title)
    .slice(0, 300);
}
