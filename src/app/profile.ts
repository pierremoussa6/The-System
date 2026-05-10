import type { UserProfile } from "./types";

function hasText(value: string | undefined | null) {
  return Boolean(value?.trim());
}

function hasPositiveNumber(value: number | undefined | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getIncompleteProfileReasons(profile: UserProfile | null) {
  if (!profile) return ["No profile exists yet."];

  const reasons: string[] = [];

  if (!profile.onboardingCompleted) {
    reasons.push("System initiation survey has not been completed.");
  }

  if (!hasText(profile.name)) reasons.push("Name is missing.");
  if (!hasText(profile.motivationWhy) && !hasText(profile.goal)) {
    reasons.push("Motivation anchor is missing.");
  }
  if (!hasText(profile.profession)) reasons.push("Profession or role is missing.");
  if (profile.wantsWorkoutPlan && !hasText(profile.preferredWorkoutDays)) {
    reasons.push("Preferred workout days are missing.");
  }
  if (!hasPositiveNumber(profile.age)) reasons.push("Age is missing.");
  if (!hasPositiveNumber(profile.weightKg)) reasons.push("Weight is missing.");
  if (!hasPositiveNumber(profile.heightCm)) reasons.push("Height is missing.");
  if (!hasPositiveNumber(profile.sleepTargetHours)) {
    reasons.push("Target sleep hours are missing.");
  }
  if (!hasPositiveNumber(profile.availableMinutesWeekday)) {
    reasons.push("Weekday availability is missing.");
  }
  if (!hasPositiveNumber(profile.availableMinutesWeekend)) {
    reasons.push("Weekend availability is missing.");
  }

  return reasons;
}

export function isProfileComplete(profile: UserProfile | null) {
  return getIncompleteProfileReasons(profile).length === 0;
}
