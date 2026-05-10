import { NextResponse } from "next/server";
import type {
  AiSystemAnalysis,
  AiWeeklyPlan,
  Stats,
  UserProfile,
  WorkoutPreference,
} from "../../../types";
import { getOpenAIClient } from "../../../lib/openai";

const workoutPreferences = [
  "Gym",
  "Home",
  "Running",
  "Walking",
  "Mobility",
  "Mixed",
] as const;

const fitnessLevels = ["Beginner", "Intermediate", "Advanced"] as const;

const weeklyPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    weekObjective: { type: "string" },
    trainingFocus: { type: "string" },
    nutritionFocus: { type: "string" },
    recoveryFocus: { type: "string" },
    pressureLevel: {
      type: "string",
      enum: ["Low", "Moderate", "High", "Extreme"],
    },
    systemWarning: { type: "string" },
    missions: {
      type: "array",
      minItems: 5,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["day", "title", "description"],
      },
    },
  },
  required: [
    "weekObjective",
    "trainingFocus",
    "nutritionFocus",
    "recoveryFocus",
    "pressureLevel",
    "systemWarning",
    "missions",
  ],
} as const;

const adjustmentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    response: { type: "string" },
    workoutDirection: { type: "string" },
    profileUpdates: {
      type: "object",
      additionalProperties: false,
      properties: {
        preferredWorkoutDays: { type: ["string", "null"] },
        workoutPreference: {
          type: ["string", "null"],
          enum: [...workoutPreferences, null],
        },
        fitnessLevel: {
          type: ["string", "null"],
          enum: [...fitnessLevels, null],
        },
        availableMinutesWeekday: { type: ["number", "null"] },
        availableMinutesWeekend: { type: ["number", "null"] },
        rpgIdentityNotes: { type: ["string", "null"] },
        wantsWorkoutPlan: { type: ["boolean", "null"] },
      },
      required: [
        "preferredWorkoutDays",
        "workoutPreference",
        "fitnessLevel",
        "availableMinutesWeekday",
        "availableMinutesWeekend",
        "rpgIdentityNotes",
        "wantsWorkoutPlan",
      ],
    },
    weeklyPlan: weeklyPlanSchema,
  },
  required: ["response", "workoutDirection", "profileUpdates", "weeklyPlan"],
} as const;

type RawAdjustment = {
  response: string;
  workoutDirection: string;
  profileUpdates: {
    preferredWorkoutDays: string | null;
    workoutPreference: WorkoutPreference | null;
    fitnessLevel: UserProfile["fitnessLevel"] | null;
    availableMinutesWeekday: number | null;
    availableMinutesWeekend: number | null;
    rpgIdentityNotes: string | null;
    wantsWorkoutPlan: boolean | null;
  };
  weeklyPlan: AiWeeklyPlan;
};

function boundedString(value: unknown, fallback: string, maxLength = 420) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength).trim();
}

function sanitizeMinutes(value: number | null, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(5, Math.min(max, Math.round(value)));
}

function sanitizeAdjustment(raw: RawAdjustment, profile: UserProfile) {
  const profileUpdates: Partial<UserProfile> = {};

  if (raw.profileUpdates.preferredWorkoutDays?.trim()) {
    profileUpdates.preferredWorkoutDays =
      raw.profileUpdates.preferredWorkoutDays.trim();
  }

  if (raw.profileUpdates.workoutPreference) {
    profileUpdates.workoutPreference = raw.profileUpdates.workoutPreference;
  }

  if (raw.profileUpdates.fitnessLevel) {
    profileUpdates.fitnessLevel = raw.profileUpdates.fitnessLevel;
  }

  profileUpdates.availableMinutesWeekday = sanitizeMinutes(
    raw.profileUpdates.availableMinutesWeekday,
    profile.availableMinutesWeekday,
    240
  );
  profileUpdates.availableMinutesWeekend = sanitizeMinutes(
    raw.profileUpdates.availableMinutesWeekend,
    profile.availableMinutesWeekend,
    480
  );

  if (typeof raw.profileUpdates.wantsWorkoutPlan === "boolean") {
    profileUpdates.wantsWorkoutPlan = raw.profileUpdates.wantsWorkoutPlan;
  }

  if (raw.profileUpdates.rpgIdentityNotes?.trim()) {
    profileUpdates.rpgIdentityNotes = boundedString(
      `${profile.rpgIdentityNotes}\nWorkout adjustment: ${raw.profileUpdates.rpgIdentityNotes}`,
      profile.rpgIdentityNotes,
      800
    );
  }

  return {
    response: boundedString(raw.response, "Workout plan updated.", 520),
    workoutDirection: boundedString(
      raw.workoutDirection,
      "Adjusted workout plan around the user's current request.",
      700
    ),
    profileUpdates,
    weeklyPlan: raw.weeklyPlan,
  };
}

function buildPrompt(input: {
  request: string;
  profile: UserProfile;
  aiAnalysis: AiSystemAnalysis | null;
  aiWeeklyPlan: AiWeeklyPlan | null;
  program: unknown;
  stats: Stats;
  totalXp: number;
}) {
  return `
You are The System's workout adjustment engine.

Modify the user's actual training direction, schedule preferences, and weekly missions in response to the request.
Be conservative and safety-aware. Do not diagnose injuries. If pain or injury is mentioned, avoid exercises that stress the stated area and recommend professional guidance for persistent or sharp pain.

User request:
${input.request}

Current profile:
${JSON.stringify(input.profile, null, 2)}

Current AI analysis:
${JSON.stringify(input.aiAnalysis, null, 2)}

Current weekly plan:
${JSON.stringify(input.aiWeeklyPlan, null, 2)}

Current generated workout program:
${JSON.stringify(input.program, null, 2)}

Progress:
${JSON.stringify({ stats: input.stats, totalXp: input.totalXp }, null, 2)}

Rules:
- Return concise user-facing response text.
- If the user moves workout days, update preferredWorkoutDays.
- If the user reports pain, injury, or inability to do an exercise, replace that exercise category with safer alternatives and mention the limitation in rpgIdentityNotes.
- Respect preferred workout days as the source of truth.
- Weekly workout missions must land on selected workout days unless the request explicitly moves one.
- Avoid exercise suggestions that conflict with stated injuries or limitations.
- Keep nutrition and recovery fields coherent with the training adjustment.
- Use low-energy alternatives when the request indicates fatigue.
`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = body?.profile as UserProfile | undefined;
    const inputRequest = body?.request as string | undefined;

    if (!profile || !inputRequest?.trim()) {
      return NextResponse.json(
        { error: "Missing workout adjustment input" },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const response = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You produce structured JSON only. Follow the requested schema exactly.",
        },
        {
          role: "user",
          content: buildPrompt({
            request: inputRequest,
            profile,
            aiAnalysis: (body?.aiAnalysis as AiSystemAnalysis | null) ?? null,
            aiWeeklyPlan: (body?.aiWeeklyPlan as AiWeeklyPlan | null) ?? null,
            program: body?.program,
            stats: body?.stats as Stats,
            totalXp: Number(body?.totalXp ?? 0),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "workout_plan_adjustment",
          strict: true,
          schema: adjustmentSchema,
        },
      },
    });

    const raw = JSON.parse(response.output_text) as RawAdjustment;
    return NextResponse.json(sanitizeAdjustment(raw, profile));
  } catch (error) {
    console.error("adjust-workout-plan error", error);

    return NextResponse.json(
      { error: "Failed to adjust workout plan" },
      { status: 500 }
    );
  }
}
