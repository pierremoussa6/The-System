import { NextResponse } from "next/server";
import type {
  AiSpecialQuestSuggestion,
  AiSystemAnalysis,
  DietRecommendationProfile,
  InterestCategory,
  JobProfile,
  OnboardingAnalysisResult,
  QuestJobFocus,
  QuestPreferenceProfile,
  QuestSource,
  Stats,
  UserProfile,
  WorkoutRecommendationProfile,
} from "../../../types";
import { getOpenAIClient } from "../../../lib/openai";

const interestCategories = [
  "engineering",
  "programming",
  "language_learning",
  "business",
  "design",
  "fitness",
  "creativity",
  "strategy",
  "craftsmanship",
  "music",
  "research",
  "problem_solving",
  "technical_building",
  "adventure_stealth",
  "discipline_habit_building",
  "reading",
  "chess",
  "nutrition",
  "outdoors",
  "other",
] as const;

const questSources = [
  "main_job",
  "secondary_job",
  "interest",
  "workout",
  "diet",
  "recovery",
  "discipline",
  "hybrid",
] as const;

const jobProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    archetype: { type: "string" },
    rationale: { type: "string" },
    questThemes: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    realLifeAnchor: { type: "string" },
  },
  required: ["title", "archetype", "rationale", "questThemes", "realLifeAnchor"],
} as const;

const workoutRecommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    primaryType: { type: "string" },
    intensity: { type: "string", enum: ["Low", "Moderate", "High"] },
    weeklyFrequency: { type: "string" },
    sessionLengthMinutes: { type: "number" },
    lowEnergyFallback: { type: "string" },
    progressionRule: { type: "string" },
  },
  required: [
    "primaryType",
    "intensity",
    "weeklyFrequency",
    "sessionLengthMinutes",
    "lowEnergyFallback",
    "progressionRule",
  ],
} as const;

const dietRecommendationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    style: { type: "string" },
    priorities: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    baselineRule: { type: "string" },
    easyFallback: { type: "string" },
    constraints: {
      type: "array",
      maxItems: 6,
      items: { type: "string" },
    },
  },
  required: ["style", "priorities", "baselineRule", "easyFallback", "constraints"],
} as const;

const questPreferenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    preferredQuestTypes: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" },
    },
    avoidedQuestTypes: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    durationMinutes: { type: "number" },
    difficultyNotes: { type: "string" },
    rotationRule: { type: "string" },
  },
  required: [
    "preferredQuestTypes",
    "avoidedQuestTypes",
    "durationMinutes",
    "difficultyNotes",
    "rotationRule",
  ],
} as const;

const personalizationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    primaryGoals: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" },
    },
    explicitInterests: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    inferredInterests: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" },
    },
    interestCategories: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string", enum: interestCategories },
    },
    profession: { type: "string" },
    hobbies: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    mainJob: jobProfileSchema,
    secondaryJob: jobProfileSchema,
    possibleSecondaryJobThemes: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    workoutRecommendation: workoutRecommendationSchema,
    dietRecommendation: dietRecommendationSchema,
    questPreferences: questPreferenceSchema,
    motivationalStyle: { type: "string" },
    lifestyleNotes: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: [
    "primaryGoals",
    "explicitInterests",
    "inferredInterests",
    "interestCategories",
    "profession",
    "hobbies",
    "mainJob",
    "secondaryJob",
    "possibleSecondaryJobThemes",
    "workoutRecommendation",
    "dietRecommendation",
    "questPreferences",
    "motivationalStyle",
    "lifestyleNotes",
  ],
} as const;

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    archetype: {
      type: "string",
      enum: ["Warrior", "Endurance", "Monk", "Scholar", "Balanced"],
    },
    playerSummary: { type: "string" },
    recommendedSystemTone: {
      type: "string",
      enum: ["Strict", "Balanced", "Intense"],
    },
    primaryFocus: {
      type: "string",
      enum: ["Fitness", "Discipline", "Focus", "Lifestyle", "Balanced"],
    },
    dietDirection: { type: "string" },
    workoutDirection: { type: "string" },
    weeklyStrategy: { type: "string" },
    personalization: personalizationSchema,
    specialQuests: {
      type: "array",
      minItems: 6,
      maxItems: 8,
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
            minItems: 2,
            maxItems: 8,
            items: { type: "string" },
          },
          source: { type: "string", enum: questSources },
          jobFocus: {
            type: "string",
            enum: ["Main Job", "Secondary Job", "Hybrid", "None"],
          },
          durationMinutes: { type: "number" },
          completionCondition: { type: "string" },
          interestCategories: {
            type: "array",
            maxItems: 6,
            items: { type: "string", enum: interestCategories },
          },
        },
        required: [
          "title",
          "description",
          "xp",
          "statRewards",
          "penalty",
          "tags",
          "source",
          "jobFocus",
          "durationMinutes",
          "completionCondition",
          "interestCategories",
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
    "personalization",
    "specialQuests",
  ],
} as const;

type RawStatRewards = {
  strength: number | null;
  vitality: number | null;
  discipline: number | null;
  focus: number | null;
};

type RawAnalysis = Omit<AiSystemAnalysis, "specialQuests" | "personalization"> & {
  personalization: OnboardingAnalysisResult;
  specialQuests: Array<Omit<AiSpecialQuestSuggestion, "statRewards"> & {
    statRewards: RawStatRewards;
    source: QuestSource;
    jobFocus: QuestJobFocus;
    durationMinutes: number;
    completionCondition: string;
    interestCategories: InterestCategory[];
  }>;
};

function buildPrompt(profile: UserProfile) {
  return `
You are "The System", an elite Solo Leveling-inspired life-RPG strategist.

Analyze the onboarding survey and produce reusable structured data for the app.
Be smart, personal, game-like, practical, and safe.
Do not be generic. Do not make medical claims. Do not prescribe unsafe diet or exercise advice.

User profile:
${JSON.stringify(profile, null, 2)}

Core analysis rules:
- Infer the user's goals, interests, challenge preferences, lifestyle patterns, fitness level, diet constraints, real-life profession, and hobbies.
- Combine explicit answers with reasonable inferences. If uncertain, choose useful but conservative defaults.
- Main Job must reflect the user's real-life profession or closest real-life role.
- Secondary Job must be a playful RPG identity grounded in hobbies or side interests.
- Secondary Job examples: programmer hobby -> Hacker, lock picking or stealth hobby -> Thief, fitness -> Warrior, drawing/design -> Artist, music -> Bard, research/reading -> Scholar, business -> Merchant, hiking/outdoors -> Ranger.
- Give both jobs a rationale and quest themes the app can reuse.
- Study interests should be broad and rich. Use predefined interestCategories, but also include explicitInterests and inferredInterests as readable strings.
- Workout recommendation must account for goals, schedule, current fitness, stress, sleep, and preferred workout style.
- Diet recommendation must account for preferences, constraints, lifestyle, and sustainability.
- Recommendations must be realistic, actionable, and useful on a phone.

Special quest rules:
- Return 6 to 8 special quest suggestions.
- Include at least 2 Main Job quests, at least 2 Secondary Job quests, and at least 1 Hybrid quest.
- Include fitness or diet quests only if useful for this profile.
- Quests must be realistic, measurable, and have a clear duration or completion condition.
- Match quest difficulty and XP to available time, stress, fitness level, and chosen difficulty.
- Avoid repeating the same title structure or action pattern.
- XP should usually be between 18 and 65.
- For statRewards, always include all 4 keys: strength, vitality, discipline, focus. Use null for unrewarded stats.
- Penalties should match penaltyStyle and never be humiliating, unsafe, or medically risky.
- Quest tone should feel immersive, like The System is using the player's actual life as the game world.
`;
}

function boundedString(value: string, fallback: string, maxLength = 220) {
  const clean = typeof value === "string" ? value.trim() : "";
  return (clean || fallback).slice(0, maxLength);
}

function sanitizeStringArray(values: string[] | undefined, fallback: string[]) {
  const cleaned = Array.isArray(values)
    ? values
        .map((value) => boundedString(value, "", 80))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeMinutes(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.round(Math.max(5, Math.min(120, value)));
}

function sanitizeInterestCategories(values: InterestCategory[] | undefined) {
  const allowed = new Set<string>(interestCategories);
  const cleaned = (values ?? [])
    .filter((value): value is InterestCategory => allowed.has(value))
    .slice(0, 8);

  return cleaned.length > 0 ? cleaned : (["discipline_habit_building", "other"] as InterestCategory[]);
}

function sanitizeJobProfile(raw: JobProfile, fallbackTitle: string): JobProfile {
  return {
    title: boundedString(raw.title, fallbackTitle, 60),
    archetype: boundedString(raw.archetype, "Adaptive role", 90),
    rationale: boundedString(raw.rationale, "Inferred from onboarding answers.", 240),
    questThemes: sanitizeStringArray(raw.questThemes, ["focused practice", "skill growth"]).slice(0, 6),
    realLifeAnchor: boundedString(raw.realLifeAnchor, fallbackTitle, 120),
  };
}

function sanitizeWorkoutRecommendation(
  raw: WorkoutRecommendationProfile,
  profile: UserProfile
): WorkoutRecommendationProfile {
  return {
    primaryType: boundedString(raw.primaryType, profile.workoutPreference, 80),
    intensity: raw.intensity,
    weeklyFrequency: boundedString(raw.weeklyFrequency, "3 sessions", 80),
    sessionLengthMinutes: sanitizeMinutes(
      raw.sessionLengthMinutes,
      profile.availableMinutesWeekday
    ),
    lowEnergyFallback: boundedString(
      raw.lowEnergyFallback,
      "Walk for 10 minutes or do light mobility.",
      180
    ),
    progressionRule: boundedString(
      raw.progressionRule,
      "Increase one small variable each week.",
      180
    ),
  };
}

function sanitizeDietRecommendation(
  raw: DietRecommendationProfile,
  profile: UserProfile
): DietRecommendationProfile {
  return {
    style: boundedString(raw.style, profile.dietStyle, 80),
    priorities: sanitizeStringArray(raw.priorities, ["protein anchor", "hydration"]),
    baselineRule: boundedString(
      raw.baselineRule,
      "Build one meal around protein, plants, and water.",
      180
    ),
    easyFallback: boundedString(
      raw.easyFallback,
      "Choose the best available meal instead of aiming for perfect.",
      180
    ),
    constraints: sanitizeStringArray(
      raw.constraints,
      profile.dietaryRestrictions ? [profile.dietaryRestrictions] : ["No constraints specified"]
    ),
  };
}

function sanitizeQuestPreferences(
  raw: QuestPreferenceProfile,
  profile: UserProfile
): QuestPreferenceProfile {
  return {
    preferredQuestTypes: sanitizeStringArray(raw.preferredQuestTypes, ["main job", "secondary job"]),
    avoidedQuestTypes: sanitizeStringArray(raw.avoidedQuestTypes, []),
    durationMinutes: sanitizeMinutes(
      raw.durationMinutes,
      profile.availableMinutesWeekday
    ),
    difficultyNotes: boundedString(
      raw.difficultyNotes,
      `Use ${profile.difficulty.toLowerCase()} pressure.`,
      180
    ),
    rotationRule: boundedString(
      raw.rotationRule,
      "Rotate between main job, secondary job, hybrid, workout, and diet quests.",
      180
    ),
  };
}

function sanitizeStatRewards(rewards: RawStatRewards): Partial<Stats> {
  const cleaned: Partial<Stats> = {};

  if (typeof rewards.strength === "number") cleaned.strength = rewards.strength;
  if (typeof rewards.vitality === "number") cleaned.vitality = rewards.vitality;
  if (typeof rewards.discipline === "number") cleaned.discipline = rewards.discipline;
  if (typeof rewards.focus === "number") cleaned.focus = rewards.focus;

  return cleaned;
}

function sanitizeSpecialQuest(
  quest: RawAnalysis["specialQuests"][number],
  profile: UserProfile
): AiSpecialQuestSuggestion {
  return {
    title: boundedString(quest.title, "Personalized Special Quest", 90),
    description: boundedString(
      quest.description,
      "Complete one focused action that supports your current system path.",
      260
    ),
    xp: Math.round(Math.max(10, Math.min(90, quest.xp))),
    statRewards: sanitizeStatRewards(quest.statRewards),
    penalty: boundedString(
      quest.penalty,
      "Complete a small corrective action before entertainment.",
      220
    ),
    tags: sanitizeStringArray(quest.tags, ["personalized", "special"]),
    source: quest.source,
    jobFocus: quest.jobFocus,
    durationMinutes: sanitizeMinutes(quest.durationMinutes, profile.availableMinutesWeekday),
    completionCondition: boundedString(
      quest.completionCondition,
      "Finish the task and record one proof of completion.",
      180
    ),
    interestCategories: sanitizeInterestCategories(quest.interestCategories),
  };
}

function sanitizeAnalysis(raw: RawAnalysis, profile: UserProfile): AiSystemAnalysis {
  const personalization = raw.personalization;

  return {
    archetype: raw.archetype,
    playerSummary: boundedString(raw.playerSummary, "A player ready for calibration.", 320),
    recommendedSystemTone: raw.recommendedSystemTone,
    primaryFocus: raw.primaryFocus,
    dietDirection: boundedString(raw.dietDirection, "Build a simple repeatable food baseline.", 260),
    workoutDirection: boundedString(raw.workoutDirection, "Train consistently with a low-energy fallback.", 260),
    weeklyStrategy: boundedString(raw.weeklyStrategy, "Use small daily wins and steady pressure.", 320),
    personalization: {
      primaryGoals: sanitizeStringArray(personalization.primaryGoals, [profile.goal || "Improve daily life"]),
      explicitInterests: sanitizeStringArray(personalization.explicitInterests, [profile.studyInterest]),
      inferredInterests: sanitizeStringArray(personalization.inferredInterests, ["discipline", "self-development"]),
      interestCategories: sanitizeInterestCategories(personalization.interestCategories),
      profession: boundedString(personalization.profession, profile.profession || "Self-Improver", 80),
      hobbies: sanitizeStringArray(
        personalization.hobbies,
        profile.hobbies ? [profile.hobbies] : ["personal growth"]
      ),
      mainJob: sanitizeJobProfile(personalization.mainJob, profile.profession || "Self-Improver"),
      secondaryJob: sanitizeJobProfile(personalization.secondaryJob, "Adventurer"),
      possibleSecondaryJobThemes: sanitizeStringArray(
        personalization.possibleSecondaryJobThemes,
        ["Adventurer", "Scholar"]
      ),
      workoutRecommendation: sanitizeWorkoutRecommendation(
        personalization.workoutRecommendation,
        profile
      ),
      dietRecommendation: sanitizeDietRecommendation(
        personalization.dietRecommendation,
        profile
      ),
      questPreferences: sanitizeQuestPreferences(
        personalization.questPreferences,
        profile
      ),
      motivationalStyle: boundedString(
        personalization.motivationalStyle,
        profile.motivationStyle,
        120
      ),
      lifestyleNotes: sanitizeStringArray(personalization.lifestyleNotes, [
        `${profile.energyPattern} energy pattern`,
        `${profile.stressLevel} stress`,
      ]),
    },
    specialQuests: raw.specialQuests
      .map((quest) => sanitizeSpecialQuest(quest, profile))
      .slice(0, 8),
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

    const raw = JSON.parse(response.output_text) as RawAnalysis;
    const analysis = sanitizeAnalysis(raw, profile);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("analyze-profile error", error);

    return NextResponse.json(
      { error: "Failed to analyze profile" },
      { status: 500 }
    );
  }
}
