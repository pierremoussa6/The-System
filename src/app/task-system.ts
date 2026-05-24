import type {
  AgilityActivityType,
  HouseholdTaskEntry,
  HouseholdTaskInput,
  HouseholdTaskKind,
} from "./types";
import type { RewardBundle } from "./reward-system";
import { formatRewardText } from "./reward-system";

const validTaskKinds: HouseholdTaskKind[] = [
  "chore",
  "grocery",
  "study",
  "agility",
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
      const kind = validTaskKinds.includes(entry.kind)
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
    return { xp: 8, statRewards: { discipline: 1, vitality: 1 } };
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
