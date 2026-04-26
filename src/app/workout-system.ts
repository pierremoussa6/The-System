import { calculateLevel } from "./logic";
import type {
  AiSystemAnalysis,
  UserProfile,
  WorkoutProgram,
  WorkoutProgramExercise,
  WorkoutProgramPhase,
  WorkoutProgramSession,
} from "./types";

const weekdayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const weekdayAliases: Record<string, string> = {
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

function exercise(
  name: string,
  sets: number,
  reps: string,
  restSeconds: number,
  notes: string
): WorkoutProgramExercise {
  return { name, sets, reps, restSeconds, notes };
}

export function parsePreferredWorkoutDays(input: string) {
  const normalized = input
    .split(/[,/\n;&]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => weekdayAliases[item])
    .filter((item): item is string => Boolean(item));

  const unique = Array.from(new Set(normalized));

  if (unique.length > 0) {
    return weekdayOrder.filter((day) => unique.includes(day));
  }

  return ["Monday", "Wednesday", "Friday"];
}

function pickFrequency(profile: UserProfile, preferredDays: string[]) {
  if (preferredDays.length > 0) return Math.min(5, preferredDays.length);
  if (profile.fitnessLevel === "Advanced") return 5;
  if (profile.fitnessLevel === "Intermediate") return 4;
  return 3;
}

function pickSessionLength(profile: UserProfile) {
  const budget =
    profile.availableMinutesWeekday > 0
      ? profile.availableMinutesWeekday
      : 30;

  return Math.max(25, Math.min(75, Math.round(budget)));
}

function buildGymSessions(days: string[], durationMinutes: number) {
  const template: WorkoutProgramSession[] = [
    {
      day: days[0] ?? "Monday",
      focus: "Upper Body Strength",
      durationMinutes,
      warmup: "5-8 minutes easy cardio, shoulder mobility, 2 ramp-up sets.",
      exercises: [
        exercise("Barbell or Dumbbell Bench Press", 4, "5-8", 120, "Add weight only when all sets are clean."),
        exercise("Chest-Supported Row", 4, "8-10", 90, "Pause briefly at the top."),
        exercise("Seated Dumbbell Shoulder Press", 3, "8-10", 90, "Keep 1-2 reps in reserve."),
        exercise("Lat Pulldown or Pull-Up", 3, "8-12", 75, "Use full range of motion."),
        exercise("Cable Lateral Raise", 3, "12-15", 60, "Controlled tempo."),
      ],
      finisher: "5 minutes incline walk or bike cooldown.",
      lowEnergyOption: "Do the first 3 lifts only for 2 work sets each.",
    },
    {
      day: days[1] ?? "Wednesday",
      focus: "Lower Body Strength",
      durationMinutes,
      warmup: "5-8 minutes bike, hip mobility, bodyweight squats, 2 ramp-up sets.",
      exercises: [
        exercise("Back Squat or Leg Press", 4, "5-8", 120, "Keep technique strict."),
        exercise("Romanian Deadlift", 4, "6-10", 120, "Feel the hamstrings; no jerking."),
        exercise("Walking Lunge", 3, "10 each leg", 75, "Short rest and stable steps."),
        exercise("Leg Curl", 3, "10-12", 60, "Smooth tempo."),
        exercise("Standing Calf Raise", 3, "12-15", 45, "Pause at the top."),
      ],
      finisher: "6-8 minutes easy bike or treadmill walk.",
      lowEnergyOption: "Do squat/press, RDL, and one lunge variation only.",
    },
    {
      day: days[2] ?? "Friday",
      focus: "Full Body Progression",
      durationMinutes,
      warmup: "5 minutes cardio, mobility, and ramp-up sets for the first lift.",
      exercises: [
        exercise("Trap Bar Deadlift or Machine Hinge", 4, "4-6", 120, "Explosive but controlled reps."),
        exercise("Incline Dumbbell Press", 3, "8-10", 90, "Stop 1 rep before breakdown."),
        exercise("Single-Arm Cable or Dumbbell Row", 3, "10-12", 75, "Stay stable through the torso."),
        exercise("Split Squat", 3, "8 each leg", 75, "Full depth with control."),
        exercise("Plank or Ab Wheel", 3, "30-45 sec", 45, "Brace hard."),
      ],
      finisher: "Optional 10-minute incline walk if energy is good.",
      lowEnergyOption: "Complete the deadlift, press, and row only.",
    },
  ];

  return template.slice(0, Math.min(days.length, template.length));
}

function buildHomeSessions(days: string[], durationMinutes: number) {
  const template: WorkoutProgramSession[] = [
    {
      day: days[0] ?? "Monday",
      focus: "Push and Core",
      durationMinutes,
      warmup: "5 minutes brisk walking in place, shoulder circles, and bodyweight squats.",
      exercises: [
        exercise("Push-Up", 4, "6-15", 75, "Elevate hands if needed to keep reps clean."),
        exercise("Bulgarian Split Squat", 3, "8-12 each leg", 75, "Slow lowering."),
        exercise("Chair Dip or Band Press", 3, "8-12", 60, "Stay pain-free."),
        exercise("Pike Push-Up or Dumbbell Shoulder Press", 3, "8-10", 60, "Own the range."),
        exercise("Dead Bug", 3, "10 each side", 45, "Keep lower back quiet."),
      ],
      finisher: "5 minutes easy mobility.",
      lowEnergyOption: "Do push-ups, split squats, and dead bugs only.",
    },
    {
      day: days[1] ?? "Wednesday",
      focus: "Pull and Posterior Chain",
      durationMinutes,
      warmup: "5 minutes mobility and band pull-aparts.",
      exercises: [
        exercise("Band Row or Backpack Row", 4, "10-15", 60, "Squeeze shoulder blades."),
        exercise("Hip Hinge with Backpack or Dumbbells", 4, "10-12", 75, "Control the stretch."),
        exercise("Glute Bridge", 3, "12-15", 45, "Pause at lockout."),
        exercise("Reverse Fly or Band Pull-Apart", 3, "12-15", 45, "Light and controlled."),
        exercise("Side Plank", 3, "25-40 sec each side", 30, "Stay stacked."),
      ],
      finisher: "Short walk to bring heart rate down.",
      lowEnergyOption: "Complete rows, hinges, and glute bridges only.",
    },
    {
      day: days[2] ?? "Friday",
      focus: "Full Body Density",
      durationMinutes,
      warmup: "5 minutes mobility and march in place.",
      exercises: [
        exercise("Goblet Squat or Bodyweight Squat", 4, "10-15", 60, "Deep, smooth reps."),
        exercise("Single-Arm Row", 3, "10-12 each arm", 60, "Use a bench or chair support."),
        exercise("Push-Up Variation", 3, "8-12", 60, "Choose the version you can own."),
        exercise("Reverse Lunge", 3, "8 each leg", 60, "Keep balance and posture."),
        exercise("Mountain Climber", 3, "30 sec", 30, "Controlled pace."),
      ],
      finisher: "4 minutes of easy breathing and calf/hip mobility.",
      lowEnergyOption: "Do 2 rounds of the first 4 exercises.",
    },
  ];

  return template.slice(0, Math.min(days.length, template.length));
}

function buildCardioSessions(
  days: string[],
  durationMinutes: number,
  runningFocus: boolean
) {
  const primaryLabel = runningFocus ? "Run" : "Walk / Hike";

  const template: WorkoutProgramSession[] = [
    {
      day: days[0] ?? "Monday",
      focus: `${primaryLabel} Base Session`,
      durationMinutes,
      warmup: "5 minutes easy pace and ankle/hip mobility.",
      exercises: [
        exercise(primaryLabel, 1, `${Math.max(20, durationMinutes - 10)} min`, 0, "Stay conversational for most of the effort."),
        exercise("Bodyweight Squat", 3, "12", 45, "Keep legs strong for durability."),
        exercise("Plank", 3, "30-45 sec", 30, "Brace and breathe."),
      ],
      finisher: "3-5 minutes easy cooldown walking.",
      lowEnergyOption: "Cut the main cardio block to 15-20 minutes.",
    },
    {
      day: days[1] ?? "Wednesday",
      focus: runningFocus ? "Intervals" : "Brisk Walk Intervals",
      durationMinutes,
      warmup: "8 minutes easy pace and mobility.",
      exercises: [
        exercise(
          runningFocus ? "Fast Run Intervals" : "Brisk Walk Intervals",
          6,
          runningFocus ? "1 min hard / 2 min easy" : "2 min brisk / 2 min easy",
          0,
          "Stay controlled; do not sprint all-out."
        ),
        exercise("Walking Lunge", 3, "8 each leg", 45, "Smooth steps."),
        exercise("Calf Raise", 3, "15", 30, "Full range."),
      ],
      finisher: "5 minutes easy pace cooldown.",
      lowEnergyOption: "Do 4 intervals instead of 6.",
    },
    {
      day: days[2] ?? "Saturday",
      focus: "Long Aerobic Session",
      durationMinutes: durationMinutes + 10,
      warmup: "Start slower than you think you need.",
      exercises: [
        exercise(primaryLabel, 1, `${Math.max(30, durationMinutes)} min`, 0, "Sustainable pace the whole time."),
        exercise("Hip Mobility Flow", 2, "5 min", 0, "Use this as the cooldown."),
      ],
      lowEnergyOption: "Swap for a 20-minute easy walk and mobility.",
    },
  ];

  return template.slice(0, Math.min(days.length, template.length));
}

function buildMobilitySessions(days: string[], durationMinutes: number) {
  const template: WorkoutProgramSession[] = [
    {
      day: days[0] ?? "Monday",
      focus: "Full Body Mobility",
      durationMinutes,
      warmup: "2 minutes nasal breathing and easy marching.",
      exercises: [
        exercise("Cat-Cow", 2, "8", 20, "Move segment by segment."),
        exercise("World's Greatest Stretch", 3, "5 each side", 20, "Pause in each position."),
        exercise("90/90 Hip Switch", 3, "8 each side", 20, "Stay tall."),
        exercise("Thoracic Rotation", 3, "8 each side", 20, "Slow and controlled."),
        exercise("Dead Hang or Doorway Stretch", 3, "20-30 sec", 20, "Stay relaxed."),
      ],
      lowEnergyOption: "Complete only the first 3 movements.",
    },
    {
      day: days[1] ?? "Thursday",
      focus: "Recovery and Stability",
      durationMinutes,
      warmup: "Easy walk for 3 minutes.",
      exercises: [
        exercise("Glute Bridge", 3, "12", 30, "Pause at the top."),
        exercise("Bird Dog", 3, "8 each side", 30, "Slow with full control."),
        exercise("Cossack Squat", 3, "6 each side", 30, "Use support if needed."),
        exercise("Shoulder CARs", 2, "5 each side", 20, "Stay pain-free."),
        exercise("Breathing Reset", 1, "5 min", 0, "Long exhale focus."),
      ],
      lowEnergyOption: "Do glute bridges, bird dogs, and breathing reset only.",
    },
  ];

  return template.slice(0, Math.min(days.length, template.length));
}

function buildMixedSessions(
  profile: UserProfile,
  days: string[],
  durationMinutes: number
) {
  return [
    ...buildGymSessions(days.slice(0, 1), durationMinutes),
    ...buildCardioSessions(days.slice(1, 2), durationMinutes, false),
    ...buildHomeSessions(days.slice(2, 3), durationMinutes),
  ].slice(0, pickFrequency(profile, days));
}

function buildSessions(profile: UserProfile, days: string[], durationMinutes: number) {
  if (profile.workoutPreference === "Gym") {
    return buildGymSessions(days, durationMinutes);
  }

  if (profile.workoutPreference === "Home") {
    return buildHomeSessions(days, durationMinutes);
  }

  if (profile.workoutPreference === "Running") {
    return buildCardioSessions(days, durationMinutes, true);
  }

  if (profile.workoutPreference === "Walking") {
    return buildCardioSessions(days, durationMinutes, false);
  }

  if (profile.workoutPreference === "Mobility") {
    return buildMobilitySessions(days, durationMinutes);
  }

  return buildMixedSessions(profile, days, durationMinutes);
}

function buildPhases(
  sessions: WorkoutProgramSession[],
  profile: UserProfile
): WorkoutProgramPhase[] {
  return [
    {
      name: "Phase 1: Foundation",
      weeks: "Weeks 1-4",
      objective: "Learn the movements, keep 2-3 reps in reserve, and build attendance.",
      progression:
        "Add reps before load. The win condition is consistency, not exhaustion.",
      sessions,
    },
    {
      name: "Phase 2: Load Build",
      weeks: "Weeks 5-8",
      objective: "Increase challenge carefully while keeping technique stable.",
      progression:
        profile.workoutPreference === "Gym"
          ? "When all sets hit the top of the rep range, increase load by the smallest practical jump."
          : "Add 1 set or add difficulty to the movement only after all reps feel controlled.",
      sessions,
    },
    {
      name: "Phase 3: Progression Reset",
      weeks: "Weeks 9-12",
      objective: "Push one key metric, then deload slightly during the final week.",
      progression:
        "Week 9-11: progress one variable. Week 12: reduce volume by about one-third before changing the plan.",
      sessions,
    },
  ];
}

export function buildWorkoutProgram(
  profile: UserProfile,
  totalXp: number,
  aiAnalysis: AiSystemAnalysis | null
): WorkoutProgram {
  const preferredDays = parsePreferredWorkoutDays(profile.preferredWorkoutDays);
  const frequency = pickFrequency(profile, preferredDays);
  const sessionLengthMinutes = pickSessionLength(profile);
  const days = preferredDays.slice(0, frequency);
  const sessions = buildSessions(profile, days, sessionLengthMinutes);
  const phases = buildPhases(sessions, profile);
  const level = calculateLevel(totalXp).level;
  const currentPhaseIndex = Math.min(
    phases.length - 1,
    Math.max(0, Math.floor((Math.max(1, level) - 1) / 6))
  );

  return {
    headline:
      aiAnalysis?.workoutDirection ||
      "A realistic multi-month training block built around your schedule.",
    motivationAnchor:
      profile.motivationWhy ||
      profile.goal ||
      "Build a stronger version of yourself through repetition.",
    preferredDays: days,
    frequency,
    sessionLengthMinutes,
    progressionCadence:
      "Run this structure for 12 weeks, then change exercise variations or rep targets based on logged progress.",
    currentPhaseLabel: phases[currentPhaseIndex]?.name ?? phases[0].name,
    phases,
  };
}
