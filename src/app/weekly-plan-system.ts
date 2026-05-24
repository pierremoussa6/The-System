import type { AiWeeklyMission, AiWeeklyPlan, UserProfile } from "./types";
import {
  getWeekdayFromText,
  isWorkoutAllowedOnWeekday,
  isWorkoutLikeActivity,
  parsePreferredWorkoutDays,
} from "./schedule";

function createScheduleSwapMission(
  mission: AiWeeklyMission,
  profile: UserProfile
): AiWeeklyMission {
  const preferredDays = parsePreferredWorkoutDays(
    profile.preferredWorkoutDays
  ).join(", ");

  return {
    day: mission.day,
    title: "Recovery / Focus Swap",
    description:
      `No main workout is scheduled for ${mission.day}. Use this slot for ` +
      `study, planning, meal prep, or a calm recovery reset. Main workouts stay on ${preferredDays}.`,
  };
}

export function sanitizeWeeklyPlanForProfile(
  plan: AiWeeklyPlan,
  profile: UserProfile
): AiWeeklyPlan {
  return {
    ...plan,
    missions: plan.missions.map((mission) => {
      const weekday = getWeekdayFromText(mission.day);

      if (
        weekday &&
        isWorkoutLikeActivity(mission) &&
        !isWorkoutAllowedOnWeekday(profile, weekday)
      ) {
        return createScheduleSwapMission(mission, profile);
      }

      return mission;
    }),
  };
}
