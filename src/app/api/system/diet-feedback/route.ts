import { NextResponse } from "next/server";
import type {
  AiSystemAnalysis,
  DietFeedback,
  FoodJournalEntry,
  NutritionSummary,
  NutritionTargets,
  UserProfile,
} from "../../../types";
import { getOpenAIClient } from "../../../lib/openai";

const dietFeedbackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    date: { type: "string" },
    summary: { type: "string" },
    suggestedMeals: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
  },
  required: ["date", "summary", "suggestedMeals"],
} as const;

function boundedString(value: string, fallback: string, maxLength = 600) {
  const clean = typeof value === "string" ? value.trim() : "";
  return (clean || fallback).slice(0, maxLength).trim();
}

function sanitizeFeedback(raw: DietFeedback, date: string): DietFeedback {
  return {
    date,
    summary: boundedString(
      raw.summary,
      "Nutrition logged. Keep protein, hydration, and simple meals steady tomorrow."
    ),
    suggestedMeals: Array.isArray(raw.suggestedMeals)
      ? raw.suggestedMeals
          .map((meal) => boundedString(meal, "", 160))
          .filter(Boolean)
          .slice(0, 4)
      : ["Protein, plants, and water at the first meal."],
  };
}

function buildPrompt(input: {
  date: string;
  entries: FoodJournalEntry[];
  summary: NutritionSummary;
  targets: NutritionTargets;
  profile: UserProfile;
  aiAnalysis: AiSystemAnalysis | null;
}) {
  return `
You are The System's diet feedback engine.

Analyze the user's food journal for the previous day and create practical feedback for tomorrow.
Do not diagnose disease, prescribe extreme diets, or shame the user.
Base every point on actual entries, totals, targets, and the user's goal/profile.

Date analyzed:
${input.date}

Food entries:
${JSON.stringify(input.entries, null, 2)}

Daily totals:
${JSON.stringify(input.summary, null, 2)}

Recommended targets:
${JSON.stringify(input.targets, null, 2)}

Profile and goals:
${JSON.stringify(input.profile, null, 2)}

Current AI analysis:
${JSON.stringify(input.aiAnalysis, null, 2)}

Rules:
- Mention protein if it was under target.
- Mention calories if they were far above or below the user's goal.
- Mention vitamins, minerals, fiber, fruit, or vegetables if micronutrient/fiber signals are weak.
- If the user is weight-loss focused and calories were above range, suggest smaller portions or lower-calorie swaps.
- Keep the tone like The System: direct, supportive, and action-oriented.
- Include 1 to 4 suggested meals or meal patterns for tomorrow.
`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = body?.date as string | undefined;
    const entries = body?.entries as FoodJournalEntry[] | undefined;
    const profile = body?.profile as UserProfile | undefined;

    if (!date || !Array.isArray(entries) || !profile) {
      return NextResponse.json(
        { error: "Missing diet feedback input" },
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
            date,
            entries,
            summary: body?.summary as NutritionSummary,
            targets: body?.targets as NutritionTargets,
            profile,
            aiAnalysis: (body?.aiAnalysis as AiSystemAnalysis | null) ?? null,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "diet_feedback",
          strict: true,
          schema: dietFeedbackSchema,
        },
      },
    });

    const raw = JSON.parse(response.output_text) as DietFeedback;
    return NextResponse.json({ feedback: sanitizeFeedback(raw, date) });
  } catch (error) {
    console.error("diet-feedback error", error);

    return NextResponse.json(
      { error: "Failed to generate diet feedback" },
      { status: 500 }
    );
  }
}
