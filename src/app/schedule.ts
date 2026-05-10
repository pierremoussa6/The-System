import type { UserProfile } from "./types";

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const weekdayOrder: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const weekdayAliases: Record<string, Weekday> = {
  mon: "Monday",
  monday: "Monday",
  tue: "Tuesday",
  tues: "Tuesday",
  tuesday: "Tuesday",
  wed: "Wednesday",
  wednesday: "Wednesday",
  thu: "Thursday",
  thur: "Thursday",
  thurs: "Thursday",
  thursday: "Thursday",
  fri: "Friday",
  friday: "Friday",
  sat: "Saturday",
  saturday: "Saturday",
  sun: "Sunday",
  sunday: "Sunday",
};

export function parsePreferredWorkoutDays(input = ""): Weekday[] {
  const normalized = input
    .split(/[,/\n;&]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => weekdayAliases[item])
    .filter((item): item is Weekday => Boolean(item));

  const unique = Array.from(new Set(normalized));

  if (unique.length > 0) {
    return weekdayOrder.filter((day) => unique.includes(day));
  }

  return ["Monday", "Wednesday", "Friday"];
}

export function getWeekdayName(dateString: string): Weekday {
  const date = new Date(`${dateString}T12:00:00`);
  const day = date.getDay();

  if (day === 0) return "Sunday";
  return weekdayOrder[day - 1] ?? "Monday";
}

export function getDayNumberFromDateString(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

export function isWorkoutDay(profile: UserProfile, dateString: string) {
  if (!profile.wantsWorkoutPlan) return false;
  return parsePreferredWorkoutDays(profile.preferredWorkoutDays).includes(
    getWeekdayName(dateString)
  );
}

export function getSpecialQuestIntervalDays(profile: UserProfile) {
  const customInterval = Math.round(profile.customSpecialQuestIntervalDays);

  if (profile.specialQuestFrequency === "every_day") return 1;
  if (profile.specialQuestFrequency === "weekly") return 7;
  if (profile.specialQuestFrequency === "custom") {
    return Math.max(2, Math.min(30, customInterval || 3));
  }

  return 3;
}

export function shouldAssignSpecialQuest(
  dateString: string,
  profile: UserProfile
) {
  const frequency = profile.specialQuestFrequency ?? "every_3_days";

  if (frequency === "every_day") return true;

  if (frequency === "weekly") {
    const preferredDays = parsePreferredWorkoutDays(profile.preferredWorkoutDays);
    const targetDay = preferredDays[0] ?? "Monday";
    return getWeekdayName(dateString) === targetDay;
  }

  const interval = getSpecialQuestIntervalDays(profile);
  return getDayNumberFromDateString(dateString) % interval === 0;
}

export function isWorkoutRelatedText(title: string, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  return (
    text.includes("gym") ||
    text.includes("workout") ||
    text.includes("training") ||
    text.includes("train") ||
    text.includes("lift") ||
    text.includes("strength") ||
    text.includes("conditioning") ||
    text.includes("cardio") ||
    text.includes("mobility") ||
    text.includes("run") ||
    text.includes("walk")
  );
}
