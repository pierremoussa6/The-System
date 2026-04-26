import { NextResponse } from "next/server";
import type {
  AiSystemAnalysis,
  AiWeeklyPlan,
  Stats,
  UserProfile,
} from "../../../types";
import { getOpenAIClient } from "../../../lib/openai";

const weeklyPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    weekObjective: {
      type: "string",
    },
    trainingFocus: {
      type: "string",
    },
    nutritionFocus: {
      type: "string",
    },
    recoveryFocus: {
      type: "string",
    },
    pressureLevel: {
      type: "string",
      enum: ["Low", "Moderate", "High", "Extreme"],
    },
    systemWarning: {
      type: "string",
    },
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

function buildWeeklyPrompt(input: {
  profile: UserProfile;
  aiAnalysis: AiSystemAnalysis;
  stats: Stats;
  streak: number;
  totalXp: number;
}) {
  return `
You are "The System", a Solo Leveling-inspired weekly planner.

Create a 7-day weekly plan for this player.
Be adaptive, realistic, intense when appropriate, but not unsafe.
Do not make medical claims.
Do not give dangerous diet or workout instructions.
Be specific and immersive.

Player profile:
${JSON.stringify(input.profile, null, 2)}

Current AI diagnosis:
${JSON.stringify(input.aiAnalysis, null, 2)}

Progression state:
${JSON.stringify(
  {
    stats: input.stats,
    streak: input.streak,
    totalXp: input.totalXp,
  },
  null,
  2
)}

Rules:
- weekObjective should be one clear mission statement.
- trainingFocus should summarize the physical focus for the week.
- nutritionFocus should summarize the food direction for the week.
- recoveryFocus should summarize sleep/recovery management.
- pressureLevel should reflect current difficulty, stress, and available time.
- systemWarning should feel like The System is cautioning the player.
- Create 5 to 7 missions.
- Each mission should be realistic for the user's time and energy.
- Missions should be spread across the week and feel like progression, not random tasks.
- Include flexible alternatives inside mission descriptions when useful, such as gym/home swaps, low-energy versions, or dietary fallback choices.
- Use personalization.mainJob and personalization.secondaryJob when present.
- Include at least one mission that supports the Main Job path and at least one mission that supports the Secondary Job path.
- Training and nutrition focus should respect workoutRecommendation and dietRecommendation when present.
- Use motivationWhy as the emotional anchor for the week.
- Respect preferredWorkoutDays when assigning workout missions. If specific days are listed, place the main sessions on those days unless recovery or schedule constraints make that unrealistic.
- Do not repeat the same structure every day. Mix training, diet, recovery, discipline, and intelligence work based on the profile.
- If the player prefers gym and the plan calls for several weekly gym sessions, place harder gym work on only some days and use walks, mobility, or recovery on the other days.
- When assigning workouts, prefer detailed exercise language with sets, reps, or duration so the player can act on it immediately.
- Cardio, running, walking, hiking, mobility, and conditioning support Agility.
- Hydration supports Vitality. Protein, vitamins, minerals, and diet adherence support Magic Resistance.
- Make the plan useful on a phone at the gym: concrete, short enough to act on, and clear about what to do today.
`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const profile = body?.profile as UserProfile | undefined;
    const aiAnalysis = body?.aiAnalysis as AiSystemAnalysis | undefined;
    const stats = body?.stats as Stats | undefined;
    const streak = body?.streak as number | undefined;
    const totalXp = body?.totalXp as number | undefined;

    if (
      !profile ||
      !aiAnalysis ||
      !stats ||
      streak === undefined ||
      totalXp === undefined
    ) {
      return NextResponse.json(
        { error: "Missing weekly planner input" },
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
          content: buildWeeklyPrompt({
            profile,
            aiAnalysis,
            stats,
            streak,
            totalXp,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "system_weekly_plan",
          strict: true,
          schema: weeklyPlanSchema,
        },
      },
    });

    const weeklyPlan = JSON.parse(response.output_text) as AiWeeklyPlan;

    return NextResponse.json({ weeklyPlan });
  } catch (error) {
    console.error("weekly-plan error", error);

    return NextResponse.json(
      { error: "Failed to generate weekly plan" },
      { status: 500 }
    );
  }
}

