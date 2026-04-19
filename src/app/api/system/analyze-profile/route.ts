import { NextResponse } from "next/server";
import type { AiSystemAnalysis, UserProfile, Stats } from "../../../types";
import { getOpenAIClient } from "../../../lib/openai";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    archetype: {
      type: "string",
      enum: ["Warrior", "Endurance", "Monk", "Scholar", "Balanced"],
    },
    playerSummary: {
      type: "string",
    },
    recommendedSystemTone: {
      type: "string",
      enum: ["Strict", "Balanced", "Intense"],
    },
    primaryFocus: {
      type: "string",
      enum: ["Fitness", "Discipline", "Focus", "Lifestyle", "Balanced"],
    },
    dietDirection: {
      type: "string",
    },
    workoutDirection: {
      type: "string",
    },
    weeklyStrategy: {
      type: "string",
    },
    specialQuests: {
      type: "array",
      minItems: 5,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          xp: { type: "number" },
          statRewards: {
            type: "object",
            additionalProperties: false,
            properties: {
              strength: { type: ["number", "null"] },
              vitality: { type: ["number", "null"] },
              discipline: { type: ["number", "null"] },
              focus: { type: ["number", "null"] },
            },
            required: ["strength", "vitality", "discipline", "focus"],
          },
          penalty: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "title",
          "description",
          "xp",
          "statRewards",
          "penalty",
          "tags",
        ],
      },
    },
  },
  required: [
    "archetype",
    "playerSummary",
    "recommendedSystemTone",
    "primaryFocus",
    "dietDirection",
    "workoutDirection",
    "weeklyStrategy",
    "specialQuests",
  ],
} as const;

function buildPrompt(profile: UserProfile) {
  return `
You are "The System", an elite Solo Leveling-inspired life-RPG strategist.

Your job:
Analyze the user's profile and produce a personalized system diagnosis.
Be concrete, adaptive, motivating, and realistic.
Do not be generic.
Do not produce medical claims.
Do not prescribe unsafe diet or exercise advice.
Make the output feel like a personalized hunter assessment.

User profile:
${JSON.stringify(profile, null, 2)}

Rules:
- Archetype must reflect the most fitting build for this user.
- Primary focus must reflect the single most important development area right now.
- System tone should fit the user's preference and motivational style.
- Diet direction should be practical and flexible: include a baseline rule, an easier fallback, and one upgrade option.
- Workout direction should adapt to gym/home/running/walking/mobility preferences and include a low-energy fallback.
- Weekly strategy should describe how the next 7 days should feel and how pressure should change if the player is tired.
- Return 5 or 6 special quest suggestions.
- Include a mix of quest types when relevant: workout, diet, recovery, study, discipline, focus, lifestyle.
- Each quest must be realistic for the user's available time, stress, energy pattern, and fitness level.
- XP should usually be between 15 and 55. Harder quests can use higher XP, but avoid cheap high rewards.
- Stat rewards must be modest and believable.
- For statRewards, always include all 4 keys:
  strength, vitality, discipline, focus.
- If a stat is not rewarded, set it to null.
- Penalties should match penaltyStyle and never be humiliating, unsafe, or medically risky.
- Quest tone should feel immersive, varied, and adaptive, like The System is responding to this exact player.
- Avoid repeating the same quest pattern, title structure, or penalty phrasing.
`;
}

function sanitizeStatRewards(rewards: {
  strength: number | null;
  vitality: number | null;
  discipline: number | null;
  focus: number | null;
}): Partial<Stats> {
  const cleaned: Partial<Stats> = {};

  if (rewards.strength !== null) cleaned.strength = rewards.strength;
  if (rewards.vitality !== null) cleaned.vitality = rewards.vitality;
  if (rewards.discipline !== null) cleaned.discipline = rewards.discipline;
  if (rewards.focus !== null) cleaned.focus = rewards.focus;

  return cleaned;
}

function sanitizeAnalysis(raw: {
  archetype: AiSystemAnalysis["archetype"];
  playerSummary: string;
  recommendedSystemTone: AiSystemAnalysis["recommendedSystemTone"];
  primaryFocus: AiSystemAnalysis["primaryFocus"];
  dietDirection: string;
  workoutDirection: string;
  weeklyStrategy: string;
  specialQuests: Array<{
    title: string;
    description: string;
    xp: number;
    statRewards: {
      strength: number | null;
      vitality: number | null;
      discipline: number | null;
      focus: number | null;
    };
    penalty: string;
    tags: string[];
  }>;
}): AiSystemAnalysis {
  return {
    archetype: raw.archetype,
    playerSummary: raw.playerSummary,
    recommendedSystemTone: raw.recommendedSystemTone,
    primaryFocus: raw.primaryFocus,
    dietDirection: raw.dietDirection,
    workoutDirection: raw.workoutDirection,
    weeklyStrategy: raw.weeklyStrategy,
    specialQuests: raw.specialQuests.map((quest) => ({
      ...quest,
      statRewards: sanitizeStatRewards(quest.statRewards),
    })),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = body?.profile as UserProfile | undefined;

    if (!profile) {
      return NextResponse.json({ error: "Missing profile" }, { status: 400 });
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
          content: buildPrompt(profile),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "system_profile_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    });

    const raw = JSON.parse(response.output_text) as {
      archetype: AiSystemAnalysis["archetype"];
      playerSummary: string;
      recommendedSystemTone: AiSystemAnalysis["recommendedSystemTone"];
      primaryFocus: AiSystemAnalysis["primaryFocus"];
      dietDirection: string;
      workoutDirection: string;
      weeklyStrategy: string;
      specialQuests: Array<{
        title: string;
        description: string;
        xp: number;
        statRewards: {
          strength: number | null;
          vitality: number | null;
          discipline: number | null;
          focus: number | null;
        };
        penalty: string;
        tags: string[];
      }>;
    };

    const analysis = sanitizeAnalysis(raw);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("analyze-profile error", error);

    return NextResponse.json(
      { error: "Failed to analyze profile" },
      { status: 500 }
    );
  }
}
