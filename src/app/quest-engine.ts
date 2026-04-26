import type {
  ActiveEffects,
  AiSpecialQuestSuggestion,
  AiSystemAnalysis,
  BuildType,
  Difficulty,
  FitnessLevel,
  HistoryEntry,
  InterestCategory,
  OnboardingAnalysisResult,
  LogEntry,
  PenaltyAction,
  PenaltyNotice,
  PenaltyStyle,
  QuestJobFocus,
  QuestSource,
  Quest,
  QuestRotationPreference,
  SpecialQuestMemory,
  SpecialQuest,
  SpecialQuestTemplate,
  Stats,
  UserProfile,
  UserRecord,
  WorkoutJournalEntry,
} from "./types";
import { createStarterArtifacts, normalizeArtifacts } from "./artifacts";

export const defaultStats: Stats = {
  strength: 0,
  vitality: 0,
  discipline: 0,
  intelligence: 0,
  agility: 0,
  magicResistance: 0,
};

type LegacyStats = Partial<Stats> & {
  focus?: number;
  magic_resistance?: number;
};

function toStatNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}

export function normalizeStats(stats?: LegacyStats | null): Stats {
  return {
    strength: toStatNumber(stats?.strength),
    vitality: toStatNumber(stats?.vitality),
    discipline: toStatNumber(stats?.discipline),
    intelligence: toStatNumber(stats?.intelligence ?? stats?.focus),
    agility: toStatNumber(stats?.agility),
    magicResistance: toStatNumber(
      stats?.magicResistance ?? stats?.magic_resistance
    ),
  };
}

function normalizeWorkoutJournalEntries(
  entries: WorkoutJournalEntry[] | undefined
) {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id:
        typeof entry.id === "string" && entry.id.trim()
          ? entry.id
          : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date:
        typeof entry.date === "string" && entry.date.trim()
          ? entry.date
          : getTodayString(),
      sessionName:
        typeof entry.sessionName === "string" ? entry.sessionName.trim() : "",
      exerciseName:
        typeof entry.exerciseName === "string"
          ? entry.exerciseName.trim()
          : "",
      sets:
        typeof entry.sets === "number" && Number.isFinite(entry.sets)
          ? Math.max(1, Math.round(entry.sets))
          : 1,
      reps: typeof entry.reps === "string" ? entry.reps.trim() : "",
      weightKg:
        typeof entry.weightKg === "number" && Number.isFinite(entry.weightKg)
          ? Math.max(0, Math.round(entry.weightKg * 10) / 10)
          : null,
      notes: typeof entry.notes === "string" ? entry.notes.trim() : "",
    }))
    .filter((entry) => entry.exerciseName);
}

export const defaultProfile: UserProfile = {
  name: "",
  goal: "",
  motivationWhy: "",
  preferredWorkoutDays: "",
  preferredBuild: "Balanced",
  difficulty: "Medium",
  fitnessLevel: "Beginner",
  sleepQuality: "Average",
  mainImprovementArea: "Balanced",
  studyInterest: "None",
  penaltyStyle: "Moderate",
  profession: "",
  hobbies: "",
  customInterests: "",
  mainJobOverride: "",
  secondaryJobOverride: "",
  rpgIdentityNotes: "",
  questRotationPreference: "Balanced",

  ageRange: "25-34",
  motivationStyle: "Balance",
  workoutPreference: "Mixed",
  dietStyle: "Balanced",
  dietaryRestrictions: "",
  availableMinutesWeekday: 30,
  availableMinutesWeekend: 60,
  sleepTargetHours: 8,
  energyPattern: "Evening",
  stressLevel: "Moderate",
  wantsDietSupport: true,
  wantsWorkoutPlan: true,
  wantsStudyQuests: true,
  wantsLifestyleQuests: true,
  systemTone: "Balanced",
  onboardingCompleted: false,
};

export const dailyQuestTemplates = [
  { id: 1, title: "Training Protocol", baseXp: 35 },
  { id: 2, title: "Nutrition Protocol", baseXp: 30 },
  { id: 3, title: "Drink 2L Water", baseXp: 20 },
];

export const specialQuestPool: SpecialQuestTemplate[] = [
  {
    id: 1,
    title: "Read 10 Pages",
    description: "Read 10 pages of a useful book today.",
    xp: 15,
    statRewards: { intelligence: 1, discipline: 1 },
    penalty: "Read 5 pages and write one useful note before leisure.",
    preferredBuilds: ["Scholar", "Monk", "Balanced"],
    tags: ["reading", "focus"],
  },
  {
    id: 2,
    title: "Study Programming for 15 Minutes",
    description: "Spend 15 focused minutes coding or learning programming.",
    xp: 20,
    statRewards: { intelligence: 1, discipline: 1 },
    penalty: "Do a 10-minute learning repair block before entertainment.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["programming", "study", "focus"],
  },
  {
    id: 3,
    title: "Play Chess for 10 Minutes",
    description: "Play chess or solve tactical puzzles for 10 minutes.",
    xp: 15,
    statRewards: { intelligence: 1 },
    penalty: "Solve one tactical puzzle and write the missed pattern.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["chess", "focus"],
  },
  {
    id: 4,
    title: "Stretch for 10 Minutes",
    description: "Do a 10-minute stretching or mobility session.",
    xp: 15,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "Complete 10 minutes of mobility before passive scrolling.",
    preferredBuilds: ["Endurance", "Warrior", "Balanced"],
    tags: ["recovery", "mobility", "lifestyle"],
  },
  {
    id: 5,
    title: "Journal for 5 Minutes",
    description: "Write down your thoughts, goals, or reflections for 5 minutes.",
    xp: 10,
    statRewards: { discipline: 1, intelligence: 1 },
    penalty: "Write a 5-minute after-action note before gaming or scrolling.",
    preferredBuilds: ["Monk", "Scholar", "Balanced"],
    tags: ["reflection", "discipline"],
  },
  {
    id: 6,
    title: "Do 30 Push-Ups",
    description: "Complete 30 push-ups today, broken into sets if needed.",
    xp: 20,
    statRewards: { strength: 1, discipline: 1 },
    penalty: "Complete one safe low-intensity strength set before leisure.",
    preferredBuilds: ["Warrior", "Balanced"],
    tags: ["fitness", "strength"],
    minFitness: "Intermediate",
  },
  {
    id: 7,
    title: "Walk for 20 Minutes",
    description: "Take a focused 20-minute walk today.",
    xp: 15,
    statRewards: { vitality: 1 },
    penalty: "Take a 10-minute walk and prepare water before snacks.",
    preferredBuilds: ["Endurance", "Balanced"],
    tags: ["fitness", "lifestyle", "recovery"],
  },
  {
    id: 8,
    title: "Meditate for 5 Minutes",
    description: "Sit quietly and meditate for 5 minutes.",
    xp: 15,
    statRewards: { discipline: 1, intelligence: 1 },
    penalty: "Complete a 3-minute breathing reset before the next screen session.",
    preferredBuilds: ["Monk", "Balanced"],
    tags: ["discipline", "recovery", "focus"],
  },
  {
    id: 9,
    title: "Practice a Language for 10 Minutes",
    description: "Do 10 minutes of language practice today.",
    xp: 15,
    statRewards: { intelligence: 1, discipline: 1 },
    penalty: "Complete 10 minutes of language repair before casual scrolling.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["language", "study", "focus"],
  },
  {
    id: 10,
    title: "Sleep Preparation Ritual",
    description: "Do a 15-minute wind-down routine before bed.",
    xp: 15,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "Prepare tomorrow's sleep trigger before entertainment.",
    preferredBuilds: ["Endurance", "Monk", "Balanced"],
    tags: ["sleep", "recovery", "lifestyle"],
  },
  {
    id: 11,
    title: "Protein Anchor",
    description:
      "Build one meal around a clear protein source and a simple fruit or vegetable side.",
    xp: 20,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "Prepare tomorrow's first meal before entertainment time.",
    preferredBuilds: ["Warrior", "Endurance", "Balanced"],
    tags: ["diet", "discipline", "lifestyle"],
  },
  {
    id: 12,
    title: "Zone 2 Walk",
    description:
      "Take a steady 25-minute walk where breathing stays controlled and sustainable.",
    xp: 25,
    statRewards: { vitality: 2 },
    penalty: "Complete a 10-minute walk before passive scrolling tomorrow.",
    preferredBuilds: ["Endurance", "Balanced"],
    tags: ["fitness", "recovery", "lifestyle"],
  },
  {
    id: 13,
    title: "Deep Work Gate",
    description:
      "Complete one 25-minute focused block on the most important study or work task.",
    xp: 30,
    statRewards: { intelligence: 2, discipline: 1 },
    penalty: "Block the most distracting app until one focus block is completed.",
    preferredBuilds: ["Scholar", "Monk", "Balanced"],
    tags: ["focus", "study", "discipline"],
  },
  {
    id: 14,
    title: "Mobility Checkpoint",
    description:
      "Do 12 minutes of mobility for hips, ankles, shoulders, or the area that feels stiffest.",
    xp: 20,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "Start tomorrow with a 5-minute mobility warm-up before screens.",
    preferredBuilds: ["Warrior", "Endurance", "Balanced"],
    tags: ["recovery", "mobility", "fitness"],
  },
  {
    id: 15,
    title: "Room Reset",
    description:
      "Clear one visible space for 10 minutes so your environment stops draining attention.",
    xp: 15,
    statRewards: { discipline: 1, intelligence: 1 },
    penalty: "Reset one visible space for 10 minutes before entertainment.",
    preferredBuilds: ["Monk", "Scholar", "Balanced"],
    tags: ["discipline", "focus", "lifestyle"],
  },
];

export const interestCategoryLabels: Record<InterestCategory, string> = {
  engineering: "Engineering",
  programming: "Programming",
  language_learning: "Language Learning",
  business: "Business",
  design: "Design",
  fitness: "Fitness",
  creativity: "Creativity",
  strategy: "Strategy",
  craftsmanship: "Craftsmanship",
  music: "Music",
  research: "Research",
  problem_solving: "Problem Solving",
  technical_building: "Technical Building",
  adventure_stealth: "Adventure / Stealth",
  discipline_habit_building: "Discipline / Habits",
  reading: "Reading",
  chess: "Chess",
  nutrition: "Nutrition",
  outdoors: "Outdoors",
  other: "Other",
};

export const questRotationPreferenceLabels: Record<
  QuestRotationPreference,
  string
> = {
  Balanced: "Balanced Rotation",
  "Main Job": "Main Job Priority",
  "Secondary Job": "Secondary Job Priority",
  Fitness: "Fitness Priority",
  Diet: "Diet Priority",
  Hybrid: "Hybrid Priority",
};

const studyInterestToCategory: Partial<
  Record<UserProfile["studyInterest"], InterestCategory>
> = {
  Programming: "programming",
  Reading: "reading",
  Chess: "chess",
  Language: "language_learning",
  Engineering: "engineering",
  Business: "business",
  Design: "design",
  Fitness: "fitness",
  Creativity: "creativity",
  Strategy: "strategy",
  Craftsmanship: "craftsmanship",
  Music: "music",
  Research: "research",
  "Problem Solving": "problem_solving",
  "Technical Building": "technical_building",
  "Adventure / Stealth": "adventure_stealth",
  "Discipline / Habits": "discipline_habit_building",
};

function splitListText(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function asPositiveMinutes(value: number, fallback: number) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.round(Math.max(5, Math.min(120, value)));
}

function pickStatReward(source: QuestSource): Partial<Stats> {
  if (source === "main_job") return { intelligence: 2, discipline: 1 };
  if (source === "secondary_job") return { intelligence: 1, discipline: 1 };
  if (source === "workout") return { strength: 1, agility: 1 };
  if (source === "diet") return { magicResistance: 1, vitality: 1 };
  if (source === "recovery") return { vitality: 2 };
  if (source === "discipline") return { discipline: 2 };
  return { intelligence: 1, discipline: 1 };
}

const penaltyAmountByStyle: Record<PenaltyStyle, number> = {
  Light: 50,
  Moderate: 150,
  Strict: 500,
};

function getPenaltyIntensity(profile: UserProfile): PenaltyStyle {
  return profile.penaltyStyle ?? "Moderate";
}

function createPenaltyAction(
  input: Omit<PenaltyAction, "intensity">,
  profile: UserProfile
): PenaltyAction {
  const intensity = getPenaltyIntensity(profile);

  return {
    ...input,
    intensity,
  };
}

function getPenaltyActionForQuest(
  quest: Pick<
    SpecialQuestTemplate,
    "title" | "source" | "jobFocus" | "tags" | "penaltyAction"
  >,
  profile: UserProfile,
  personalization?: OnboardingAnalysisResult
): PenaltyAction {
  if (quest.penaltyAction) {
    const intensity = getPenaltyIntensity(profile);
    const amountSek =
      quest.penaltyAction.category === "financial"
        ? Math.min(
            quest.penaltyAction.amountSek ?? penaltyAmountByStyle[intensity],
            intensity === "Strict" ? 1000 : intensity === "Moderate" ? 300 : 100
          )
        : undefined;

    return {
      category: quest.penaltyAction.category,
      title: quest.penaltyAction.title,
      description: quest.penaltyAction.description,
      intensity,
      completionCondition: quest.penaltyAction.completionCondition,
      ...(amountSek ? { amountSek } : {}),
    };
  }

  const source = quest.source ?? inferQuestSource(quest as SpecialQuestTemplate);
  const mainJob = personalization?.mainJob.title || profile.profession || "Main Job";
  const secondaryJob = personalization?.secondaryJob.title || "Secondary Job";
  const savingsAmount = penaltyAmountByStyle[getPenaltyIntensity(profile)];
  const wantsDiet =
    quest.tags.includes("diet") || quest.tags.includes("nutrition");
  const wantsWorkout =
    quest.tags.includes("fitness") ||
    quest.tags.includes("workout") ||
    quest.tags.includes("mobility");

  if (source === "main_job" || quest.jobFocus === "Main Job") {
    return createPenaltyAction(
      {
        category: "main_job",
        title: `${mainJob} Repair Block`,
        description:
          "Spend a focused block repairing the exact path this missed quest was meant to support.",
        completionCondition:
          "Complete 15 focused minutes and record one sentence of progress.",
      },
      profile
    );
  }

  if (source === "secondary_job" || quest.jobFocus === "Secondary Job") {
    return createPenaltyAction(
      {
        category: "secondary_job",
        title: `${secondaryJob} Recovery Drill`,
        description:
          "Do a short practice round for the hobby identity instead of letting the missed quest disappear.",
        completionCondition:
          "Complete 15 minutes of practice or produce one small proof of work.",
      },
      profile
    );
  }

  if (source === "hybrid" || quest.jobFocus === "Hybrid") {
    return createPenaltyAction(
      {
        category: "reflection",
        title: "After-Action Report",
        description:
          "Write down why the quest broke, then choose the smallest next action that would prevent the same miss.",
        completionCondition:
          "Write three bullet points and complete one 10-minute repair action.",
      },
      profile
    );
  }

  if (source === "diet" || wantsDiet) {
    return createPenaltyAction(
      {
        category: "nutrition",
        title: "Nutrition Reset",
        description:
          "Prepare tomorrow's easiest healthy anchor so the next day starts with less friction.",
        completionCondition:
          "Prepare one protein, hydration, or simple meal choice before leisure.",
      },
      profile
    );
  }

  if (source === "recovery" || quest.tags.includes("recovery")) {
    return createPenaltyAction(
      {
        category: "recovery",
        title: "Recovery Reset",
        description:
          "Repair the missed recovery signal with a small action that calms the system down.",
        completionCondition:
          "Complete 5 minutes of breathing, stretching, or sleep preparation.",
      },
      profile
    );
  }

  if (source === "workout" || wantsWorkout) {
    return createPenaltyAction(
      {
        category: "fitness",
        title: "Movement Debt",
        description:
          "Pay back momentum with a short walk, mobility session, or low-intensity bodyweight block.",
        completionCondition:
          "Complete 15 minutes of safe movement before passive entertainment.",
      },
      profile
    );
  }

  if (quest.tags.includes("reading") || quest.tags.includes("study")) {
    return createPenaltyAction(
      {
        category: "learning",
        title: "Knowledge Repair",
        description:
          "Do a smaller learning rep so the missed quest still produces useful progress.",
        completionCondition:
          "Read, study, or summarize one concept for 10 minutes.",
      },
      profile
    );
  }

  if (profile.penaltyStyle === "Strict") {
    return createPenaltyAction(
      {
        category: "financial",
        title: "Savings Tribute",
        description:
          "Move money from impulse territory into future-you territory. This is a savings transfer, not a loss.",
        completionCondition:
          "Transfer the set amount to savings and log it in The System.",
        amountSek: savingsAmount,
      },
      profile
    );
  }

  return createPenaltyAction(
    {
      category: "environment",
      title: "Environment Reset",
      description:
        "Clean one visible space so the missed quest turns into a lower-friction tomorrow.",
      completionCondition:
        "Reset one desk, bag, kitchen area, or training area for 10 minutes.",
    },
    profile
  );
}

function formatPenaltyAction(action: PenaltyAction) {
  const amountText =
    action.category === "financial" && action.amountSek
      ? ` Transfer ${action.amountSek} SEK to savings.`
      : "";

  return `${action.title}: ${action.description}${amountText} Completion: ${action.completionCondition}`;
}

function getFallbackJobFromProfile(profile: UserProfile): {
  mainJobTitle: string;
  secondaryJobTitle: string;
  secondaryArchetype: string;
} {
  const profession = profile.profession.trim();
  const hobbies = `${profile.hobbies} ${profile.customInterests} ${profile.studyInterest}`.toLowerCase();

  let secondaryJobTitle = "Adventurer";
  let secondaryArchetype = "Versatile side-identity";

  if (hobbies.includes("program") || hobbies.includes("code")) {
    secondaryJobTitle = "Hacker";
    secondaryArchetype = "Technical infiltrator";
  } else if (hobbies.includes("lock") || hobbies.includes("stealth")) {
    secondaryJobTitle = "Thief";
    secondaryArchetype = "Stealth specialist";
  } else if (hobbies.includes("gym") || hobbies.includes("fitness")) {
    secondaryJobTitle = "Warrior";
    secondaryArchetype = "Physical challenger";
  } else if (hobbies.includes("draw") || hobbies.includes("design")) {
    secondaryJobTitle = "Artist";
    secondaryArchetype = "Creative maker";
  } else if (hobbies.includes("music") || hobbies.includes("instrument")) {
    secondaryJobTitle = "Bard";
    secondaryArchetype = "Rhythm and expression specialist";
  } else if (hobbies.includes("research") || hobbies.includes("read")) {
    secondaryJobTitle = "Scholar";
    secondaryArchetype = "Knowledge seeker";
  } else if (hobbies.includes("business") || hobbies.includes("entrepreneur")) {
    secondaryJobTitle = "Merchant";
    secondaryArchetype = "Opportunity hunter";
  } else if (hobbies.includes("hiking") || hobbies.includes("outdoor")) {
    secondaryJobTitle = "Ranger";
    secondaryArchetype = "Outdoor scout";
  }

  return {
    mainJobTitle: profession || "Self-Improver",
    secondaryJobTitle,
    secondaryArchetype,
  };
}

export function getPersonalization(
  aiAnalysis: AiSystemAnalysis | null | undefined,
  profile: UserProfile
): OnboardingAnalysisResult {
  if (aiAnalysis?.personalization) {
    return applyIdentityOverrides(aiAnalysis.personalization, profile);
  }

  const categories: InterestCategory[] = [];
  const mappedStudyInterest = studyInterestToCategory[profile.studyInterest];

  if (mappedStudyInterest) {
    categories.push(mappedStudyInterest);
  }

  if (profile.wantsWorkoutPlan) categories.push("fitness");
  if (profile.wantsDietSupport) categories.push("nutrition");
  if (profile.mainImprovementArea === "Discipline") {
    categories.push("discipline_habit_building");
  }

  const fallbackJob = getFallbackJobFromProfile(profile);
  const weekdayMinutes = asPositiveMinutes(profile.availableMinutesWeekday, 25);
  const hobbies = splitListText(profile.hobbies);
  const interests = splitListText(profile.customInterests);

  return applyIdentityOverrides({
    primaryGoals: [
      profile.motivationWhy || profile.goal || "Build a stronger daily system",
    ],
    explicitInterests: [
      profile.studyInterest !== "None" ? profile.studyInterest : "",
      ...interests,
    ].filter(Boolean),
    inferredInterests: categories.map((category) => interestCategoryLabels[category]),
    interestCategories: Array.from(new Set(categories)).slice(0, 8),
    profession: profile.profession || fallbackJob.mainJobTitle,
    hobbies,
    mainJob: {
      title: fallbackJob.mainJobTitle,
      archetype: "Real-life role",
      rationale:
        "Fallback role based on the profession entered in profile setup.",
      questThemes: ["skill practice", "focused work", "professional growth"],
      realLifeAnchor: profile.profession || "current responsibilities",
    },
    secondaryJob: {
      title: fallbackJob.secondaryJobTitle,
      archetype: fallbackJob.secondaryArchetype,
      rationale:
        "Fallback side identity inferred from hobbies, study interest, and custom interests.",
      questThemes: hobbies.length > 0 ? hobbies : ["practice", "craft", "exploration"],
      realLifeAnchor: hobbies[0] ?? profile.studyInterest,
    },
    possibleSecondaryJobThemes: hobbies.length > 0 ? hobbies : interests,
    workoutRecommendation: {
      primaryType: profile.workoutPreference,
      intensity:
        profile.difficulty === "Hard"
          ? "High"
          : profile.difficulty === "Easy"
          ? "Low"
          : "Moderate",
      weeklyFrequency: profile.wantsWorkoutPlan ? "3-4 sessions" : "Optional",
      sessionLengthMinutes: weekdayMinutes,
      lowEnergyFallback: "Take a 10-minute walk or do light mobility.",
      progressionRule: "Add a small amount of time, load, or consistency each week.",
    },
    dietRecommendation: {
      style: profile.dietStyle,
      priorities: profile.wantsDietSupport
        ? ["protein anchor", "hydration", "simple repeatable meals"]
        : ["keep food choices steady"],
      baselineRule: "Build one daily meal around protein, plants, and water.",
      easyFallback: "Choose the best available meal instead of aiming for perfect.",
      constraints: profile.dietaryRestrictions
        ? [profile.dietaryRestrictions]
        : ["No constraints specified"],
    },
    questPreferences: {
      preferredQuestTypes: [
        profile.wantsStudyQuests ? "study" : "",
        profile.wantsWorkoutPlan ? "workout" : "",
        profile.wantsDietSupport ? "diet" : "",
        profile.wantsLifestyleQuests ? "lifestyle" : "",
      ].filter(Boolean),
      avoidedQuestTypes: [],
      durationMinutes: weekdayMinutes,
      difficultyNotes: `Use ${profile.difficulty.toLowerCase()} pressure with ${profile.stressLevel.toLowerCase()} stress accounted for.`,
      rotationRule:
        "Rotate between main job, secondary job, fitness, diet, and discipline quests.",
    },
    motivationalStyle: profile.motivationStyle,
    lifestyleNotes: [
      `${profile.energyPattern} energy pattern`,
      `${profile.stressLevel} stress`,
      `${profile.sleepQuality} sleep quality`,
    ],
  }, profile);
}

function applyIdentityOverrides(
  personalization: OnboardingAnalysisResult,
  profile: UserProfile
): OnboardingAnalysisResult {
  const mainJobOverride = profile.mainJobOverride.trim();
  const secondaryJobOverride = profile.secondaryJobOverride.trim();
  const identityNotes = profile.rpgIdentityNotes.trim();

  if (!mainJobOverride && !secondaryJobOverride && !identityNotes) {
    return personalization;
  }

  return {
    ...personalization,
    mainJob: {
      ...personalization.mainJob,
      title: mainJobOverride || personalization.mainJob.title,
      rationale: mainJobOverride
        ? `Player-selected Main Job. ${personalization.mainJob.rationale}`
        : personalization.mainJob.rationale,
    },
    secondaryJob: {
      ...personalization.secondaryJob,
      title: secondaryJobOverride || personalization.secondaryJob.title,
      rationale: secondaryJobOverride
        ? `Player-selected Secondary Job. ${personalization.secondaryJob.rationale}`
        : personalization.secondaryJob.rationale,
    },
    lifestyleNotes: identityNotes
      ? [...personalization.lifestyleNotes, `Identity note: ${identityNotes}`]
      : personalization.lifestyleNotes,
  };
}

function createDynamicQuest(
  id: number,
  input: {
    title: string;
    description: string;
    xp: number;
    source: QuestSource;
    jobFocus: QuestJobFocus;
    durationMinutes: number;
    completionCondition: string;
    tags: string[];
    categories: InterestCategory[];
    preferredBuilds?: BuildType[];
  }
): SpecialQuestTemplate {
  return {
    id,
    title: input.title,
    description: input.description,
    xp: input.xp,
    statRewards: pickStatReward(input.source),
    penalty:
      "If ignored, complete a profile-relevant corrective action before leisure.",
    preferredBuilds: input.preferredBuilds ?? [
      "Balanced",
      "Warrior",
      "Endurance",
      "Monk",
      "Scholar",
    ],
    tags: input.tags,
    source: input.source,
    jobFocus: input.jobFocus,
    durationMinutes: input.durationMinutes,
    completionCondition: input.completionCondition,
    interestCategories: input.categories,
  };
}

function createPersonalizedQuestTemplates(
  profile: UserProfile,
  aiAnalysis?: AiSystemAnalysis | null
): SpecialQuestTemplate[] {
  const personalization = getPersonalization(aiAnalysis, profile);
  const mainJob = personalization.mainJob.title || "Main Job";
  const secondaryJob = personalization.secondaryJob.title || "Secondary Job";
  const duration = asPositiveMinutes(
    personalization.questPreferences.durationMinutes,
    profile.availableMinutesWeekday
  );
  const shortDuration = Math.max(10, Math.min(25, duration));
  const categories: InterestCategory[] = personalization.interestCategories.length
    ? personalization.interestCategories
    : ["other"];
  const mainTheme = personalization.mainJob.questThemes[0] ?? "skill work";
  const sideTheme =
    personalization.secondaryJob.questThemes[0] ??
    personalization.hobbies[0] ??
    "side practice";

  return [
    createDynamicQuest(9001, {
      title: `${mainJob} Advancement Block`,
      description: `Spend ${shortDuration} minutes on one concrete ${mainTheme} task that supports your real-life ${mainJob} path.`,
      xp: 30,
      source: "main_job",
      jobFocus: "Main Job",
      durationMinutes: shortDuration,
      completionCondition: `Complete ${shortDuration} focused minutes and write one sentence about what moved forward.`,
      tags: ["main-job", "focus", "discipline", ...categories],
      categories,
      preferredBuilds: ["Scholar", "Monk", "Balanced"],
    }),
    createDynamicQuest(9002, {
      title: `${secondaryJob} Side Path Drill`,
      description: `Train the ${secondaryJob} identity for ${shortDuration} minutes through ${sideTheme}. Keep it playful, but make the result real.`,
      xp: 30,
      source: "secondary_job",
      jobFocus: "Secondary Job",
      durationMinutes: shortDuration,
      completionCondition: `Finish one measurable ${secondaryJob} practice block.`,
      tags: ["secondary-job", "hobby", "practice", ...categories],
      categories,
      preferredBuilds: ["Scholar", "Monk", "Balanced", "Warrior"],
    }),
    createDynamicQuest(9003, {
      title: "Body Protocol Calibration",
      description: `${personalization.workoutRecommendation.primaryType}: complete ${shortDuration} minutes at ${personalization.workoutRecommendation.intensity.toLowerCase()} intensity, or use the fallback: ${personalization.workoutRecommendation.lowEnergyFallback}`,
      xp: 25,
      source: "workout",
      jobFocus: "None",
      durationMinutes: shortDuration,
      completionCondition: `Complete the session or the low-energy fallback.`,
      tags: ["fitness", "workout", "vitality"],
      categories: ["fitness"],
      preferredBuilds: ["Warrior", "Endurance", "Balanced"],
    }),
    createDynamicQuest(9004, {
      title: "Nutrition Anchor",
      description: personalization.dietRecommendation.baselineRule,
      xp: 20,
      source: "diet",
      jobFocus: "None",
      durationMinutes: 10,
      completionCondition: "Complete one meal or snack using the nutrition baseline rule.",
      tags: ["diet", "nutrition", "discipline"],
      categories: ["nutrition"],
      preferredBuilds: ["Endurance", "Warrior", "Balanced"],
    }),
    createDynamicQuest(9005, {
      title: `${mainJob} x ${secondaryJob} Hybrid Mission`,
      description: `Combine your real role and side identity: spend ${shortDuration} minutes creating, studying, planning, or practicing something that links ${mainJob} with ${secondaryJob}.`,
      xp: 35,
      source: "hybrid",
      jobFocus: "Hybrid",
      durationMinutes: shortDuration,
      completionCondition: "Produce one small visible result: notes, reps, sketch, code, plan, or practice log.",
      tags: ["hybrid", "main-job", "secondary-job", ...categories],
      categories,
    }),
  ];
}

export function normalizeSpecialQuestMemory(
  memory?: SpecialQuestMemory | null
): SpecialQuestMemory {
  return {
    recentTitles: Array.isArray(memory?.recentTitles)
      ? memory.recentTitles.slice(0, 12)
      : [],
    recentSources: Array.isArray(memory?.recentSources)
      ? memory.recentSources.slice(0, 12)
      : [],
    recentJobFocuses: Array.isArray(memory?.recentJobFocuses)
      ? memory.recentJobFocuses.slice(0, 12)
      : [],
  };
}

function inferQuestSource(quest: SpecialQuestTemplate): QuestSource {
  if (quest.source) return quest.source;
  if (quest.tags.includes("fitness")) return "workout";
  if (quest.tags.includes("diet") || quest.tags.includes("nutrition")) {
    return "diet";
  }
  if (quest.tags.includes("recovery") || quest.tags.includes("sleep")) {
    return "recovery";
  }
  if (quest.tags.includes("discipline")) return "discipline";
  if (
    quest.tags.includes("study") ||
    quest.tags.includes("programming") ||
    quest.tags.includes("reading") ||
    quest.tags.includes("language") ||
    quest.tags.includes("chess")
  ) {
    return "interest";
  }
  return "interest";
}

function getQuestJobFocus(quest: SpecialQuestTemplate): QuestJobFocus {
  return quest.jobFocus ?? "None";
}

function getPreferredSources(
  profile: UserProfile,
  memory: SpecialQuestMemory,
  pool: SpecialQuestTemplate[]
): QuestSource[] {
  const preference = profile.questRotationPreference;

  if (preference === "Main Job") return ["main_job"];
  if (preference === "Secondary Job") return ["secondary_job"];
  if (preference === "Fitness") return ["workout"];
  if (preference === "Diet") return ["diet"];
  if (preference === "Hybrid") return ["hybrid"];

  const rotationOrder: QuestSource[] = [
    "main_job",
    "secondary_job",
    "hybrid",
    "workout",
    "diet",
    "interest",
    "discipline",
    "recovery",
  ];

  const availableSources = new Set(pool.map((quest) => inferQuestSource(quest)));
  const sourceCounts = rotationOrder.map((source) => ({
    source,
    count: memory.recentSources.filter((item) => item === source).length,
  }));

  return sourceCounts
    .filter((item) => availableSources.has(item.source))
    .sort((a, b) => a.count - b.count)
    .map((item) => item.source);
}

function selectQuestTemplateForRotation(
  pool: SpecialQuestTemplate[],
  profile: UserProfile,
  memory?: SpecialQuestMemory | null,
  seed = 0
): SpecialQuestTemplate {
  const safeMemory = normalizeSpecialQuestMemory(memory);
  const recentTitles = new Set(
    safeMemory.recentTitles.map((title) => title.trim().toLowerCase())
  );
  const preferredSources = getPreferredSources(profile, safeMemory, pool);
  const primaryPreferredSource = preferredSources[0];
  const fallback = pool[Math.abs(seed) % pool.length];

  const ranked = pool
    .map((quest, index) => {
      const source = inferQuestSource(quest);
      const jobFocus = getQuestJobFocus(quest);
      let score = 0;

      if (!recentTitles.has(quest.title.trim().toLowerCase())) score += 80;
      if (source === primaryPreferredSource) score += 45;
      if (preferredSources.includes(source)) score += 20;
      if (!safeMemory.recentSources.slice(0, 3).includes(source)) score += 15;
      if (!safeMemory.recentJobFocuses.slice(0, 3).includes(jobFocus)) score += 10;
      if (quest.jobFocus === profile.questRotationPreference) score += 15;

      return {
        quest,
        score,
        stableTieBreaker: Math.abs(seed + index * 17) % 97,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.stableTieBreaker - b.stableTieBreaker
    );

  return ranked[0]?.quest ?? fallback;
}

export function appendSpecialQuestMemory(
  memory: SpecialQuestMemory | null | undefined,
  quest: SpecialQuestTemplate
): SpecialQuestMemory {
  const safeMemory = normalizeSpecialQuestMemory(memory);
  const source = inferQuestSource(quest);
  const jobFocus = getQuestJobFocus(quest);

  return {
    recentTitles: [
      quest.title,
      ...safeMemory.recentTitles.filter((title) => title !== quest.title),
    ].slice(0, 12),
    recentSources: [source, ...safeMemory.recentSources].slice(0, 12),
    recentJobFocuses: [jobFocus, ...safeMemory.recentJobFocuses].slice(0, 12),
  };
}

export function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export function getTimestampString() {
  return new Date().toLocaleString();
}

export function getYesterdayString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

export function getDayNumberFromDate(dateString: string) {
  const date = new Date(dateString);
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

export function getBuildFromStats(stats: Stats): BuildType {
  const { strength, vitality, discipline, intelligence } = stats;
  const max = Math.max(strength, vitality, discipline, intelligence);

  const winners = [
    strength === max ? "Warrior" : null,
    vitality === max ? "Endurance" : null,
    discipline === max ? "Monk" : null,
    intelligence === max ? "Scholar" : null,
  ].filter(Boolean) as BuildType[];

  if (winners.length !== 1) return "Balanced";
  return winners[0];
}

export function scaleXp(baseXp: number, difficulty: Difficulty) {
  if (difficulty === "Easy") return Math.round(baseXp * 0.8);
  if (difficulty === "Hard") return Math.round(baseXp * 1.3);
  return baseXp;
}

export function scalePenaltyText(
  basePenalty: string,
  difficulty: Difficulty,
  penaltyAction?: PenaltyAction
) {
  if (penaltyAction) {
    const actionText = formatPenaltyAction(penaltyAction);

    if (difficulty === "Easy") {
      return `${actionText} Keep it light and finish it before leisure.`;
    }

    if (difficulty === "Hard") {
      return `${actionText} Hard mode: finish it before the next comfort activity.`;
    }

    return `${actionText} Standard mode: finish it before entertainment.`;
  }

  if (difficulty === "Easy") {
    return `${basePenalty} Keep it light: complete a useful corrective action before leisure.`;
  }

  if (difficulty === "Hard") {
    return `${basePenalty} Hard mode: finish a meaningful repair action before the next comfort activity.`;
  }

  return `${basePenalty} Standard mode: finish the corrective action before entertainment.`;
}

function isStrengthTrainingDay(dateString = getTodayString()) {
  const day = new Date(`${dateString}T12:00:00`).getDay();
  return day === 1 || day === 3 || day === 5;
}

function getDailyTrainingQuest(profile: UserProfile, dateString = getTodayString()): Quest {
  const prefersCardio =
    profile.workoutPreference === "Running" ||
    profile.workoutPreference === "Walking" ||
    profile.customInterests.toLowerCase().includes("hiking") ||
    profile.hobbies.toLowerCase().includes("hiking");
  const prefersGym = profile.workoutPreference === "Gym";
  const strengthDay = isStrengthTrainingDay(dateString);
  const preferredDaysNote = profile.preferredWorkoutDays.trim()
    ? ` Preferred workout days: ${profile.preferredWorkoutDays.trim()}.`
    : "";

  if (prefersGym && strengthDay) {
    return {
      id: 1,
      title: "Gym Strength Session",
      description:
        `Complete the planned gym session from your weekly protocol, or do the smallest safe strength version if time is tight.${preferredDaysNote}`,
      xp: scaleXp(50, profile.difficulty),
      completed: false,
      awardedToday: false,
      statRewards: { strength: 2, discipline: 1 },
    };
  }

  if (prefersCardio) {
    return {
      id: 1,
      title:
        profile.workoutPreference === "Running"
          ? "Cardio Run Protocol"
          : "Cardio Walk / Hike Protocol",
      description:
        `Complete a sustainable run, walk, or hike that matches your current energy.${preferredDaysNote}`,
      xp: scaleXp(35, profile.difficulty),
      completed: false,
      awardedToday: false,
      statRewards: { agility: 2, vitality: 1 },
    };
  }

  return {
    id: 1,
    title: prefersGym ? "Recovery Walk or Mobility" : "Training Protocol",
    description: prefersGym
      ? `Non-gym day: keep momentum with walking, mobility, or easy conditioning.${preferredDaysNote}`
      : `Complete the movement plan that fits today: gym, home training, cardio, or mobility.${preferredDaysNote}`,
    xp: scaleXp(prefersGym ? 25 : 35, profile.difficulty),
    completed: false,
    awardedToday: false,
    statRewards: prefersGym
      ? { agility: 1, vitality: 1 }
      : { strength: 1, agility: 1 },
  };
}

export function normalizePartialStats(
  rewards?: (Partial<Stats> & { focus?: number; magic_resistance?: number }) | null
): Partial<Stats> {
  if (!rewards) return {};

  const cleaned: Partial<Stats> = {};
  if (typeof rewards.strength === "number") cleaned.strength = rewards.strength;
  if (typeof rewards.vitality === "number") cleaned.vitality = rewards.vitality;
  if (typeof rewards.discipline === "number") cleaned.discipline = rewards.discipline;
  if (typeof (rewards.intelligence ?? rewards.focus) === "number") {
    cleaned.intelligence = rewards.intelligence ?? rewards.focus;
  }
  if (typeof rewards.agility === "number") cleaned.agility = rewards.agility;
  if (typeof (rewards.magicResistance ?? rewards.magic_resistance) === "number") {
    cleaned.magicResistance =
      rewards.magicResistance ?? rewards.magic_resistance;
  }

  return cleaned;
}

export function createDailyQuests(
  profile: UserProfile,
  dateString = getTodayString()
): Quest[] {
  const base: Quest[] = [
    getDailyTrainingQuest(profile, dateString),
    {
      id: 2,
      title: "Nutrition Protocol",
      description:
        "Follow the diet direction: protein, vitamins, minerals, and a meal choice that supports your goal.",
      xp: scaleXp(30, profile.difficulty),
      completed: false,
      awardedToday: false,
      statRewards: { magicResistance: 2, vitality: 1 },
    },
    {
      id: 3,
      title: "Drink 2L Water",
      description: "Hydrate across the day. This is the main Vitality anchor.",
      xp: scaleXp(20, profile.difficulty),
      completed: false,
      awardedToday: false,
      statRewards: { vitality: 2 },
    },
  ];

  if (!profile.wantsDietSupport) {
    return base.filter((quest) => quest.id !== 2);
  }

  return base;
}

export function getProfileInfluencedBuild(
  stats: Stats,
  profile: UserProfile
): BuildType {
  if (profile.preferredBuild !== "Balanced") {
    return profile.preferredBuild;
  }

  switch (profile.mainImprovementArea) {
    case "Fitness":
      return "Warrior";
    case "Lifestyle":
      return "Endurance";
    case "Discipline":
      return "Monk";
    case "Intelligence":
    case "Focus":
      return "Scholar";
    default:
      return getBuildFromStats(stats);
  }
}

export function fitnessRank(level: FitnessLevel) {
  if (level === "Beginner") return 1;
  if (level === "Intermediate") return 2;
  return 3;
}

export function filterQuestPoolForProfile(
  stats: Stats,
  profile: UserProfile,
  aiAnalysis?: AiSystemAnalysis | null
): SpecialQuestTemplate[] {
  const build = getProfileInfluencedBuild(stats, profile);
  const dynamicQuests = createPersonalizedQuestTemplates(profile, aiAnalysis);
  const completePool = [...specialQuestPool, ...dynamicQuests];

  let pool = completePool.filter((quest) =>
    quest.preferredBuilds.includes(build)
  );

  if (pool.length === 0) {
    pool = completePool;
  }

  pool = pool.filter((quest) => {
    if (!quest.minFitness) return true;
    return fitnessRank(profile.fitnessLevel) >= fitnessRank(quest.minFitness);
  });

  if (!profile.wantsStudyQuests) {
    pool = pool.filter(
      (q) =>
        !q.tags.includes("study") &&
        !q.tags.includes("programming") &&
        !q.tags.includes("reading") &&
        !q.tags.includes("language") &&
        !q.tags.includes("chess")
    );
  }

  if (!profile.wantsLifestyleQuests) {
    pool = pool.filter(
      (q) =>
        !q.tags.includes("lifestyle") &&
        !q.tags.includes("sleep") &&
        !q.tags.includes("recovery")
    );
  }

  if (profile.studyInterest === "Programming") {
    const tagged = pool.filter((q) => q.tags.includes("programming"));
    if (tagged.length > 0) pool = tagged;
  } else if (profile.studyInterest === "Reading") {
    const tagged = pool.filter((q) => q.tags.includes("reading"));
    if (tagged.length > 0) pool = tagged;
  } else if (profile.studyInterest === "Chess") {
    const tagged = pool.filter((q) => q.tags.includes("chess"));
    if (tagged.length > 0) pool = tagged;
  } else if (profile.studyInterest === "Language") {
    const tagged = pool.filter((q) => q.tags.includes("language"));
    if (tagged.length > 0) pool = tagged;
  } else {
    const interestCategory = studyInterestToCategory[profile.studyInterest];
    if (interestCategory) {
      const tagged = pool.filter(
        (q) =>
          q.tags.includes(interestCategory) ||
          q.interestCategories?.includes(interestCategory)
      );
      if (tagged.length > 0) pool = tagged;
    }
  }

  if (profile.sleepQuality === "Poor") {
    const recovery = pool.filter(
      (q) => q.tags.includes("sleep") || q.tags.includes("recovery")
    );
    if (recovery.length > 0) pool = recovery;
  }

  if (profile.mainImprovementArea === "Lifestyle") {
    const lifestyle = pool.filter(
      (q) => q.tags.includes("lifestyle") || q.tags.includes("recovery")
    );
    if (lifestyle.length > 0) pool = lifestyle;
  }

  if (profile.mainImprovementArea === "Discipline") {
    const discipline = pool.filter((q) => q.tags.includes("discipline"));
    if (discipline.length > 0) pool = discipline;
  }

  if (
    profile.mainImprovementArea === "Intelligence" ||
    profile.mainImprovementArea === "Focus"
  ) {
    const intelligence = pool.filter((q) => q.tags.includes("focus"));
    if (intelligence.length > 0) pool = intelligence;
  }

  if (profile.mainImprovementArea === "Fitness") {
    const fitness = pool.filter((q) => q.tags.includes("fitness"));
    if (fitness.length > 0) pool = fitness;
  }

  return pool.length > 0 ? pool : completePool;
}

export function createDailySpecialQuest(
  dateString: string,
  stats: Stats,
  profile: UserProfile,
  aiAnalysis?: AiSystemAnalysis | null,
  memory?: SpecialQuestMemory | null
): SpecialQuest {
  const poolToUse = filterQuestPoolForProfile(stats, profile, aiAnalysis);
  const personalization = getPersonalization(aiAnalysis, profile);

  if (poolToUse.length === 0) {
    const fallback = specialQuestPool[0];
    const fallbackPenaltyAction = getPenaltyActionForQuest(
      fallback,
      profile,
      personalization
    );

    return {
      ...fallback,
      xp: scaleXp(fallback.xp, profile.difficulty),
      penalty: scalePenaltyText(
        fallback.penalty,
        profile.difficulty,
        fallbackPenaltyAction
      ),
      penaltyAction: fallbackPenaltyAction,
      completed: false,
      awardedToday: false,
      assignedDate: dateString,
      status: "pending",
    };
  }

  const dayNumber = getDayNumberFromDate(dateString);
  const template = selectQuestTemplateForRotation(
    poolToUse,
    profile,
    memory,
    dayNumber
  );
  const penaltyAction = getPenaltyActionForQuest(
    template,
    profile,
    personalization
  );

  return {
    ...template,
    xp: scaleXp(template.xp, profile.difficulty),
    penalty: scalePenaltyText(
      template.penalty,
      profile.difficulty,
      penaltyAction
    ),
    penaltyAction,
    completed: false,
    awardedToday: false,
    assignedDate: dateString,
    status: "pending",
  };
}

export function createSpecialQuestFromAiSuggestion(
  suggestion: AiSpecialQuestSuggestion,
  dateString: string,
  profile?: UserProfile,
  aiAnalysis?: AiSystemAnalysis | null
): SpecialQuest {
  const template: SpecialQuestTemplate = {
    id: 5000 + Math.floor(Math.random() * 100000),
    title: suggestion.title,
    description: suggestion.description,
    xp: suggestion.xp,
    statRewards: normalizePartialStats(suggestion.statRewards),
    penalty: suggestion.penalty,
    penaltyAction: suggestion.penaltyAction,
    preferredBuilds: ["Balanced", "Warrior", "Endurance", "Monk", "Scholar"],
    tags: suggestion.tags,
    source: suggestion.source,
    jobFocus: suggestion.jobFocus,
    durationMinutes: suggestion.durationMinutes,
    completionCondition: suggestion.completionCondition,
    interestCategories: suggestion.interestCategories,
  };
  const penaltyAction =
    template.penaltyAction || !profile
      ? template.penaltyAction
      : getPenaltyActionForQuest(
          template,
          profile,
          getPersonalization(aiAnalysis, profile)
        );

  return {
    ...template,
    penalty: penaltyAction
      ? scalePenaltyText(template.penalty, profile?.difficulty ?? "Medium", penaltyAction)
      : template.penalty,
    penaltyAction,
    completed: false,
    awardedToday: false,
    assignedDate: dateString,
    status: "pending",
  };
}

export function getActiveAiQuest(
  aiAnalysis: AiSystemAnalysis | null,
  aiQuestIndex: number
): AiSpecialQuestSuggestion | null {
  if (!aiAnalysis?.specialQuests?.length) return null;
  const safeIndex =
    ((aiQuestIndex % aiAnalysis.specialQuests.length) +
      aiAnalysis.specialQuests.length) %
    aiAnalysis.specialQuests.length;
  return aiAnalysis.specialQuests[safeIndex] ?? null;
}

export function getNextAiQuestIndex(
  aiAnalysis: AiSystemAnalysis | null,
  currentIndex: number,
  recentTitles: string[] = [],
  profile?: UserProfile,
  memory?: SpecialQuestMemory | null
) {
  if (!aiAnalysis?.specialQuests?.length) return 0;
  const normalizedRecentTitles = recentTitles
    .map((title) => title.trim().toLowerCase())
    .filter(Boolean);
  const safeMemory = normalizeSpecialQuestMemory(memory);

  if (profile) {
    const questPool: SpecialQuestTemplate[] = aiAnalysis.specialQuests.map((quest, index) => ({
      id: 10000 + index,
      title: quest.title,
      description: quest.description,
      xp: quest.xp,
      statRewards: quest.statRewards,
      penalty: quest.penalty,
      penaltyAction: quest.penaltyAction,
      preferredBuilds: ["Balanced", "Warrior", "Endurance", "Monk", "Scholar"],
      tags: quest.tags,
      source: quest.source,
      jobFocus: quest.jobFocus,
      durationMinutes: quest.durationMinutes,
      completionCondition: quest.completionCondition,
      interestCategories: quest.interestCategories,
    }));
    const preferredSources = getPreferredSources(profile, safeMemory, questPool);
    const primaryPreferredSource = preferredSources[0];
    const ranked = aiAnalysis.specialQuests
      .map((quest, index) => {
        const source = quest.source ?? "interest";
        const jobFocus = quest.jobFocus ?? "None";
        let score = index === currentIndex ? -100 : 0;

        if (!normalizedRecentTitles.includes(quest.title.trim().toLowerCase())) {
          score += 80;
        }
        if (source === primaryPreferredSource) score += 45;
        if (preferredSources.includes(source)) score += 20;
        if (!safeMemory.recentSources.slice(0, 3).includes(source)) score += 15;
        if (!safeMemory.recentJobFocuses.slice(0, 3).includes(jobFocus)) {
          score += 10;
        }
        if (jobFocus === profile.questRotationPreference) score += 15;

        return { index, score };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index);

    if (ranked[0]) return ranked[0].index;
  }

  for (let offset = 1; offset <= aiAnalysis.specialQuests.length; offset += 1) {
    const candidateIndex = (currentIndex + offset) % aiAnalysis.specialQuests.length;
    const candidate = aiAnalysis.specialQuests[candidateIndex];

    if (
      candidate &&
      !normalizedRecentTitles.includes(candidate.title.trim().toLowerCase())
    ) {
      return candidateIndex;
    }
  }

  return (currentIndex + 1) % aiAnalysis.specialQuests.length;
}

export function getPreviewSpecialQuests(
  stats: Stats,
  profile: UserProfile,
  aiAnalysis?: AiSystemAnalysis | null
): SpecialQuestTemplate[] {
  if (aiAnalysis?.specialQuests?.length) {
    return aiAnalysis.specialQuests.slice(0, 6).map((quest, index) => ({
      id: 1000 + index,
      title: quest.title,
      description: quest.description,
      xp: quest.xp,
      statRewards: quest.statRewards,
      penalty: quest.penalty,
      penaltyAction: quest.penaltyAction,
      preferredBuilds: ["Balanced", "Warrior", "Endurance", "Monk", "Scholar"],
      tags: quest.tags,
      source: quest.source,
      jobFocus: quest.jobFocus,
      durationMinutes: quest.durationMinutes,
      completionCondition: quest.completionCondition,
      interestCategories: quest.interestCategories,
    }));
  }

  const pool = filterQuestPoolForProfile(stats, profile, aiAnalysis);
  return pool.slice(0, 6);
}

export function appendHistoryEntry(
  currentHistory: HistoryEntry[],
  nextStats: Stats
): HistoryEntry[] {
  const today = getTodayString();

  const newEntry: HistoryEntry = {
    date: today,
    strength: nextStats.strength,
    vitality: nextStats.vitality,
    discipline: nextStats.discipline,
    intelligence: nextStats.intelligence,
    agility: nextStats.agility,
    magicResistance: nextStats.magicResistance,
  };

  const lastEntry = currentHistory[currentHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.date === today &&
    lastEntry.strength === newEntry.strength &&
    lastEntry.vitality === newEntry.vitality &&
    lastEntry.discipline === newEntry.discipline &&
    lastEntry.intelligence === newEntry.intelligence &&
    lastEntry.agility === newEntry.agility &&
    lastEntry.magicResistance === newEntry.magicResistance
  ) {
    return currentHistory;
  }

  if (lastEntry && lastEntry.date === today) {
    return [...currentHistory.slice(0, -1), newEntry];
  }

  return [...currentHistory, newEntry];
}

export function appendLog(
  currentLog: LogEntry[],
  entry: Omit<LogEntry, "id" | "date">
): LogEntry[] {
  const newEntry: LogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: getTimestampString(),
  };

  return [newEntry, ...currentLog].slice(0, 100);
}

export function addStatRewards(
  currentStats: Stats,
  rewards: Partial<Stats>
): Stats {
  return {
    strength: currentStats.strength + (rewards.strength ?? 0),
    vitality: currentStats.vitality + (rewards.vitality ?? 0),
    discipline: currentStats.discipline + (rewards.discipline ?? 0),
    intelligence: currentStats.intelligence + (rewards.intelligence ?? 0),
    agility: currentStats.agility + (rewards.agility ?? 0),
    magicResistance:
      currentStats.magicResistance + (rewards.magicResistance ?? 0),
  };
}

export function subtractStatPenalty(
  currentStats: Stats,
  penalties: Partial<Stats>
): Stats {
  return {
    strength: Math.max(0, currentStats.strength - (penalties.strength ?? 0)),
    vitality: Math.max(0, currentStats.vitality - (penalties.vitality ?? 0)),
    discipline: Math.max(
      0,
      currentStats.discipline - (penalties.discipline ?? 0)
    ),
    intelligence: Math.max(
      0,
      currentStats.intelligence - (penalties.intelligence ?? 0)
    ),
    agility: Math.max(0, currentStats.agility - (penalties.agility ?? 0)),
    magicResistance: Math.max(
      0,
      currentStats.magicResistance - (penalties.magicResistance ?? 0)
    ),
  };
}

function getMissedDailyPenalty(user: UserRecord): Partial<Stats> {
  const penalties = user.quests
    .filter((quest) => !quest.completed)
    .reduce<Partial<Stats>>((accumulator, quest) => {
      const rewards = getQuestStatRewards(quest.id, quest);

      Object.entries(rewards).forEach(([key, value]) => {
        if (typeof value !== "number" || value <= 0) return;
        const statKey = key as keyof Stats;
        accumulator[statKey] = Math.max(accumulator[statKey] ?? 0, 1);
      });

      return accumulator;
    }, {});

  if (user.quests.some((quest) => !quest.completed)) {
    penalties.discipline = Math.max(1, penalties.discipline ?? 0);
  }

  return penalties;
}

function getMissedSpecialQuestPenalty(user: UserRecord): Partial<Stats> {
  if (user.specialQuest.completed || user.specialQuest.status === "waived") {
    return {};
  }

  const penalties: Partial<Stats> = { discipline: 1 };

  Object.entries(user.specialQuest.statRewards).forEach(([key, value]) => {
    if (typeof value !== "number" || value <= 0) return;
    const statKey = key as keyof Stats;
    penalties[statKey] = Math.max(penalties[statKey] ?? 0, 1);
  });

  return penalties;
}

function describePenaltyStats(penalties: Partial<Stats>) {
  return (
    Object.entries(penalties)
      .filter(([, value]) => typeof value === "number" && value > 0)
      .map(([key, value]) => `${key} -${value}`)
      .join(", ") || "discipline -1"
  );
}

export function getQuestStatRewards(
  questId: number,
  quest?: Quest
): Partial<Stats> {
  if (quest?.statRewards) return quest.statRewards;

  switch (questId) {
    case 1:
      return { strength: 2 };
    case 2:
      return { magicResistance: 2, vitality: 1 };
    case 3:
      return { vitality: 2 };
    default:
      return {};
  }
}

export function createPenaltyNotice(
  specialQuest: SpecialQuest
): PenaltyNotice {
  return {
    title: `Penalty Triggered: ${specialQuest.title}`,
    message: specialQuest.penalty,
    fromDate: specialQuest.assignedDate,
  };
}

export function shouldUseRecoveryMode(hp: number | null | undefined) {
  return typeof hp === "number" && hp < 50;
}

export function cancelSpecialQuestForRecovery(
  specialQuest: SpecialQuest
): SpecialQuest {
  return {
    ...specialQuest,
    completed: true,
    awardedToday: true,
    status: "waived",
  };
}

export function createNewUserRecord(name: string): UserRecord {
  const today = getTodayString();
  const profile: UserProfile = {
    ...defaultProfile,
    name,
  };
  const specialQuestMemory = normalizeSpecialQuestMemory();
  const specialQuest = createDailySpecialQuest(
    today,
    defaultStats,
    profile,
    null,
    specialQuestMemory
  );

  const activeEffects: ActiveEffects = {
    doubleDailyXpDate: null,
  };

  return {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    profile,
    quests: createDailyQuests(profile),
    streak: 0,
    lastCompletionDate: null,
    totalXp: 0,
    stats: defaultStats,
    history: [],
    workoutJournal: [],
    specialQuest,
    penaltyNotice: null,
    log: [],
    aiAnalysis: null,
    aiWeeklyPlan: null,
    aiQuestIndex: 0,
    artifacts: createStarterArtifacts(),
    activeEffects,
    lastResetDate: today,
    dailyHp: null,
    dailyHpDate: null,
    specialQuestMemory: appendSpecialQuestMemory(
      specialQuestMemory,
      specialQuest
    ),
  };
}

export function normalizeUserForToday(user: UserRecord): UserRecord {
  const today = getTodayString();
  const safeStats = normalizeStats(user.stats as LegacyStats);
  const safeProfile: UserProfile = {
    ...defaultProfile,
    ...user.profile,
    goal:
      user.profile?.goal ??
      user.profile?.motivationWhy ??
      defaultProfile.goal,
    motivationWhy:
      user.profile?.motivationWhy ??
      user.profile?.goal ??
      defaultProfile.motivationWhy,
    mainImprovementArea:
      user.profile?.mainImprovementArea === "Focus"
        ? "Intelligence"
        : user.profile?.mainImprovementArea ?? defaultProfile.mainImprovementArea,
  };

  const safeEffects: ActiveEffects = {
    doubleDailyXpDate: user.activeEffects?.doubleDailyXpDate ?? null,
  };
  const safeSpecialQuestMemory = normalizeSpecialQuestMemory(
    user.specialQuestMemory
  );
  const safeWorkoutJournal = normalizeWorkoutJournalEntries(user.workoutJournal);

  if (user.lastResetDate === today) {
    return {
      ...user,
      profile: safeProfile,
      stats: safeStats,
      workoutJournal: safeWorkoutJournal,
      dailyHp: user.dailyHpDate === today ? user.dailyHp ?? null : null,
      dailyHpDate: user.dailyHpDate === today ? user.dailyHpDate ?? null : null,
      aiAnalysis: user.aiAnalysis ?? null,
      aiWeeklyPlan: user.aiWeeklyPlan ?? null,
      aiQuestIndex: user.aiQuestIndex ?? 0,
      artifacts: normalizeArtifacts(user.artifacts),
      activeEffects: safeEffects,
      specialQuestMemory: safeSpecialQuestMemory,
    };
  }

  let penaltyNotice = user.penaltyNotice;
  let log = user.log;
  let nextStats = safeStats;
  let nextHistory = user.history;
  let nextStreak = user.streak;

  const missedDailyPenalty = getMissedDailyPenalty(user);
  const hasMissedDailyQuests = user.quests.some((quest) => !quest.completed);

  if (hasMissedDailyQuests) {
    nextStats = subtractStatPenalty(nextStats, missedDailyPenalty);
    nextHistory = appendHistoryEntry(nextHistory, nextStats);
    log = appendLog(log, {
      type: "system_notice",
      title: "Consistency Penalty Applied",
      details: `Daily protocol was not completed. Attributes reduced: ${describePenaltyStats(
        missedDailyPenalty
      )}.`,
    });
  }

  if (!user.specialQuest.completed && user.specialQuest.status !== "waived") {
    const missedSpecialPenalty = getMissedSpecialQuestPenalty(user);

    nextStats = subtractStatPenalty(nextStats, missedSpecialPenalty);
    nextHistory = appendHistoryEntry(nextHistory, nextStats);
    penaltyNotice = createPenaltyNotice(user.specialQuest);

    log = appendLog(log, {
      type: "penalty",
      title: `Penalty Triggered: ${user.specialQuest.title}`,
      details: user.specialQuest.penalty,
    });

    log = appendLog(log, {
      type: "system_notice",
      title: "Special Quest Failure Registered",
      details: `Attributes reduced: ${describePenaltyStats(
        missedSpecialPenalty
      )}.`,
    });
  }

  if (user.lastCompletionDate !== getYesterdayString()) {
    nextStreak = 0;
  }

  const nextSpecialQuest = createDailySpecialQuest(
    today,
    nextStats,
    safeProfile,
    user.aiAnalysis,
    safeSpecialQuestMemory
  );

  return {
    ...user,
    profile: safeProfile,
    quests: createDailyQuests(safeProfile),
    stats: nextStats,
    history: nextHistory,
    workoutJournal: safeWorkoutJournal,
    specialQuest: nextSpecialQuest,
    penaltyNotice,
    log,
    streak: nextStreak,
    aiAnalysis: user.aiAnalysis ?? null,
    aiWeeklyPlan: user.aiWeeklyPlan ?? null,
    aiQuestIndex: user.aiQuestIndex ?? 0,
    artifacts: normalizeArtifacts(user.artifacts),
    activeEffects: {
      doubleDailyXpDate: null,
    },
    lastResetDate: today,
    dailyHp: null,
    dailyHpDate: null,
    specialQuestMemory: appendSpecialQuestMemory(
      safeSpecialQuestMemory,
      nextSpecialQuest
    ),
  };
}


