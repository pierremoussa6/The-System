import type {
  ActiveEffects,
  AiSpecialQuestSuggestion,
  AiSystemAnalysis,
  BuildType,
  Difficulty,
  FitnessLevel,
  HistoryEntry,
  LogEntry,
  PenaltyNotice,
  Quest,
  SpecialQuest,
  SpecialQuestTemplate,
  Stats,
  UserProfile,
  UserRecord,
} from "./types";
import { createStarterArtifacts, normalizeArtifacts } from "./artifacts";

export const defaultStats: Stats = {
  strength: 0,
  vitality: 0,
  discipline: 0,
  focus: 0,
};

export const defaultProfile: UserProfile = {
  name: "",
  goal: "",
  preferredBuild: "Balanced",
  difficulty: "Medium",
  fitnessLevel: "Beginner",
  sleepQuality: "Average",
  mainImprovementArea: "Balanced",
  studyInterest: "None",
  penaltyStyle: "Moderate",

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
  { id: 1, title: "Gym Workout", baseXp: 50 },
  { id: 2, title: "Eat Clean Meals", baseXp: 30 },
  { id: 3, title: "Drink 2L Water", baseXp: 20 },
];

export const specialQuestPool: SpecialQuestTemplate[] = [
  {
    id: 1,
    title: "Read 10 Pages",
    description: "Read 10 pages of a useful book today.",
    xp: 15,
    statRewards: { focus: 1, discipline: 1 },
    penalty: "No series tonight if ignored.",
    preferredBuilds: ["Scholar", "Monk", "Balanced"],
    tags: ["reading", "focus"],
  },
  {
    id: 2,
    title: "Study Programming for 15 Minutes",
    description: "Spend 15 focused minutes coding or learning programming.",
    xp: 20,
    statRewards: { focus: 1, discipline: 1 },
    penalty: "No YouTube entertainment tonight if ignored.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["programming", "study", "focus"],
  },
  {
    id: 3,
    title: "Play Chess for 10 Minutes",
    description: "Play chess or solve tactical puzzles for 10 minutes.",
    xp: 15,
    statRewards: { focus: 1 },
    penalty: "No social media tonight if ignored.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["chess", "focus"],
  },
  {
    id: 4,
    title: "Stretch for 10 Minutes",
    description: "Do a 10-minute stretching or mobility session.",
    xp: 15,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "Add 15 minutes of walking tomorrow if ignored.",
    preferredBuilds: ["Endurance", "Warrior", "Balanced"],
    tags: ["recovery", "mobility", "lifestyle"],
  },
  {
    id: 5,
    title: "Journal for 5 Minutes",
    description: "Write down your thoughts, goals, or reflections for 5 minutes.",
    xp: 10,
    statRewards: { discipline: 1, focus: 1 },
    penalty: "No gaming tonight if ignored.",
    preferredBuilds: ["Monk", "Scholar", "Balanced"],
    tags: ["reflection", "discipline"],
  },
  {
    id: 6,
    title: "Do 30 Push-Ups",
    description: "Complete 30 push-ups today, broken into sets if needed.",
    xp: 20,
    statRewards: { strength: 1, discipline: 1 },
    penalty: "Add a cold shower tomorrow if ignored.",
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
    penalty: "No snacks tonight if ignored.",
    preferredBuilds: ["Endurance", "Balanced"],
    tags: ["fitness", "lifestyle", "recovery"],
  },
  {
    id: 8,
    title: "Meditate for 5 Minutes",
    description: "Sit quietly and meditate for 5 minutes.",
    xp: 15,
    statRewards: { discipline: 1, focus: 1 },
    penalty: "No music during commute tomorrow if ignored.",
    preferredBuilds: ["Monk", "Balanced"],
    tags: ["discipline", "recovery", "focus"],
  },
  {
    id: 9,
    title: "Practice a Language for 10 Minutes",
    description: "Do 10 minutes of language practice today.",
    xp: 15,
    statRewards: { focus: 1, discipline: 1 },
    penalty: "No casual scrolling tonight if ignored.",
    preferredBuilds: ["Scholar", "Balanced"],
    tags: ["language", "study", "focus"],
  },
  {
    id: 10,
    title: "Sleep Preparation Ritual",
    description: "Do a 15-minute wind-down routine before bed.",
    xp: 15,
    statRewards: { vitality: 1, discipline: 1 },
    penalty: "No caffeine after lunch tomorrow if ignored.",
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
    penalty: "No passive scrolling until a 10-minute walk is completed tomorrow.",
    preferredBuilds: ["Endurance", "Balanced"],
    tags: ["fitness", "recovery", "lifestyle"],
  },
  {
    id: 13,
    title: "Deep Work Gate",
    description:
      "Complete one 25-minute focused block on the most important study or work task.",
    xp: 30,
    statRewards: { focus: 2, discipline: 1 },
    penalty: "Block the most distracting app for the next evening.",
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
    statRewards: { discipline: 1, focus: 1 },
    penalty: "No entertainment until the same space is reset tomorrow.",
    preferredBuilds: ["Monk", "Scholar", "Balanced"],
    tags: ["discipline", "focus", "lifestyle"],
  },
];

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
  const { strength, vitality, discipline, focus } = stats;
  const max = Math.max(strength, vitality, discipline, focus);

  const winners = [
    strength === max ? "Warrior" : null,
    vitality === max ? "Endurance" : null,
    discipline === max ? "Monk" : null,
    focus === max ? "Scholar" : null,
  ].filter(Boolean) as BuildType[];

  if (winners.length !== 1) return "Balanced";
  return winners[0];
}

export function scaleXp(baseXp: number, difficulty: Difficulty) {
  if (difficulty === "Easy") return Math.round(baseXp * 0.8);
  if (difficulty === "Hard") return Math.round(baseXp * 1.3);
  return baseXp;
}

export function scalePenaltyText(basePenalty: string, difficulty: Difficulty) {
  if (difficulty === "Easy") {
    return `${basePenalty} Keep it light: complete a small corrective action before leisure.`;
  }

  if (difficulty === "Hard") {
    return `${basePenalty} Hard mode: remove one convenience tomorrow until the corrective action is done.`;
  }

  return `${basePenalty} Standard penalty: finish the corrective action before entertainment.`;
}

export function createDailyQuests(profile: UserProfile): Quest[] {
  const base = dailyQuestTemplates.map((template) => ({
    id: template.id,
    title: template.title,
    xp: scaleXp(template.baseXp, profile.difficulty),
    completed: false,
    awardedToday: false,
  }));

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
  profile: UserProfile
): SpecialQuestTemplate[] {
  const build = getProfileInfluencedBuild(stats, profile);

  let pool = specialQuestPool.filter((quest) =>
    quest.preferredBuilds.includes(build)
  );

  if (pool.length === 0) {
    pool = specialQuestPool;
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

  if (profile.mainImprovementArea === "Focus") {
    const focus = pool.filter((q) => q.tags.includes("focus"));
    if (focus.length > 0) pool = focus;
  }

  if (profile.mainImprovementArea === "Fitness") {
    const fitness = pool.filter((q) => q.tags.includes("fitness"));
    if (fitness.length > 0) pool = fitness;
  }

  return pool.length > 0 ? pool : specialQuestPool;
}

export function createDailySpecialQuest(
  dateString: string,
  stats: Stats,
  profile: UserProfile
): SpecialQuest {
  const poolToUse = filterQuestPoolForProfile(stats, profile);

  if (poolToUse.length === 0) {
    const fallback = specialQuestPool[0];

    return {
      ...fallback,
      xp: scaleXp(fallback.xp, profile.difficulty),
      penalty: scalePenaltyText(fallback.penalty, profile.difficulty),
      completed: false,
      awardedToday: false,
      assignedDate: dateString,
      status: "pending",
    };
  }

  const dayNumber = getDayNumberFromDate(dateString);
  const safeIndex = Math.abs(dayNumber) % poolToUse.length;
  const template = poolToUse[safeIndex];

  return {
    ...template,
    xp: scaleXp(template.xp, profile.difficulty),
    penalty: scalePenaltyText(template.penalty, profile.difficulty),
    completed: false,
    awardedToday: false,
    assignedDate: dateString,
    status: "pending",
  };
}

export function createSpecialQuestFromAiSuggestion(
  suggestion: AiSpecialQuestSuggestion,
  dateString: string
): SpecialQuest {
  return {
    id: 5000 + Math.floor(Math.random() * 100000),
    title: suggestion.title,
    description: suggestion.description,
    xp: suggestion.xp,
    statRewards: suggestion.statRewards,
    penalty: suggestion.penalty,
    preferredBuilds: ["Balanced", "Warrior", "Endurance", "Monk", "Scholar"],
    tags: suggestion.tags,
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
  currentIndex: number
) {
  if (!aiAnalysis?.specialQuests?.length) return 0;
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
      preferredBuilds: ["Balanced", "Warrior", "Endurance", "Monk", "Scholar"],
      tags: quest.tags,
    }));
  }

  const pool = filterQuestPoolForProfile(stats, profile);
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
    focus: nextStats.focus,
  };

  const lastEntry = currentHistory[currentHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.date === today &&
    lastEntry.strength === newEntry.strength &&
    lastEntry.vitality === newEntry.vitality &&
    lastEntry.discipline === newEntry.discipline &&
    lastEntry.focus === newEntry.focus
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
    focus: currentStats.focus + (rewards.focus ?? 0),
  };
}

export function getQuestStatRewards(questId: number): Partial<Stats> {
  switch (questId) {
    case 1:
      return { strength: 2 };
    case 2:
      return { vitality: 2 };
    case 3:
      return { vitality: 1 };
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

export function createNewUserRecord(name: string): UserRecord {
  const today = getTodayString();
  const profile: UserProfile = {
    ...defaultProfile,
    name,
  };

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
    specialQuest: createDailySpecialQuest(today, defaultStats, profile),
    penaltyNotice: null,
    log: [],
    aiAnalysis: null,
    aiWeeklyPlan: null,
    aiQuestIndex: 0,
    artifacts: createStarterArtifacts(),
    activeEffects,
    lastResetDate: today,
  };
}

export function normalizeUserForToday(user: UserRecord): UserRecord {
  const today = getTodayString();
  const safeProfile: UserProfile = {
    ...defaultProfile,
    ...user.profile,
  };

  const safeEffects: ActiveEffects = {
    doubleDailyXpDate: user.activeEffects?.doubleDailyXpDate ?? null,
  };

  if (user.lastResetDate === today) {
    return {
      ...user,
      profile: safeProfile,
      aiAnalysis: user.aiAnalysis ?? null,
      aiWeeklyPlan: user.aiWeeklyPlan ?? null,
      aiQuestIndex: user.aiQuestIndex ?? 0,
      artifacts: normalizeArtifacts(user.artifacts),
      activeEffects: safeEffects,
    };
  }

  let penaltyNotice = user.penaltyNotice;
  let log = user.log;

  if (!user.specialQuest.completed && user.specialQuest.status !== "waived") {
    penaltyNotice = createPenaltyNotice(user.specialQuest);

    log = appendLog(log, {
      type: "penalty",
      title: `Penalty Triggered: ${user.specialQuest.title}`,
      details: user.specialQuest.penalty,
    });
  }

  return {
    ...user,
    profile: safeProfile,
    quests: createDailyQuests(safeProfile),
    specialQuest: createDailySpecialQuest(today, user.stats, safeProfile),
    penaltyNotice,
    log,
    aiAnalysis: user.aiAnalysis ?? null,
    aiWeeklyPlan: user.aiWeeklyPlan ?? null,
    aiQuestIndex: user.aiQuestIndex ?? 0,
    artifacts: normalizeArtifacts(user.artifacts),
    activeEffects: {
      doubleDailyXpDate: null,
    },
    lastResetDate: today,
  };
}
