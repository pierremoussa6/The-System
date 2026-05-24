export type Quest = {
  id: number;
  title: string;
  xp: number;
  completed: boolean;
  awardedToday: boolean;
  statRewards?: Partial<Stats>;
  description?: string;
};

export type Stats = {
  strength: number;
  vitality: number;
  discipline: number;
  intelligence: number;
  agility: number;
  magicResistance: number;
};

export type HistoryEntry = {
  date: string;
  strength: number;
  vitality: number;
  discipline: number;
  intelligence: number;
  agility: number;
  magicResistance: number;
};

export type WorkoutJournalEntry = {
  id: string;
  date: string;
  sessionName: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  notes: string;
};

export type WorkoutProgramExercise = {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
};

export type WorkoutProgramSession = {
  day: string;
  focus: string;
  durationMinutes: number;
  warmup: string;
  exercises: WorkoutProgramExercise[];
  finisher?: string;
  lowEnergyOption: string;
};

export type WorkoutProgramPhase = {
  name: string;
  weeks: string;
  objective: string;
  progression: string;
  sessions: WorkoutProgramSession[];
};

export type WorkoutProgram = {
  headline: string;
  motivationAnchor: string;
  preferredDays: string[];
  frequency: number;
  sessionLengthMinutes: number;
  progressionCadence: string;
  currentPhaseLabel: string;
  phases: WorkoutProgramPhase[];
};

export type BuildType =
  | "Warrior"
  | "Endurance"
  | "Monk"
  | "Scholar"
  | "Balanced";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";

export type SleepQuality = "Poor" | "Average" | "Good";

export type MainImprovementArea =
  | "Fitness"
  | "Discipline"
  | "Intelligence"
  | "Focus"
  | "Lifestyle"
  | "Balanced";

export type StudyInterest =
  | "Programming"
  | "Reading"
  | "Chess"
  | "Language"
  | "Engineering"
  | "Business"
  | "Design"
  | "Fitness"
  | "Creativity"
  | "Strategy"
  | "Craftsmanship"
  | "Music"
  | "Research"
  | "Problem Solving"
  | "Technical Building"
  | "Adventure / Stealth"
  | "Discipline / Habits"
  | "None";

export type PenaltyStyle = "Light" | "Moderate" | "Strict";

export type PenaltyCategory =
  | "financial"
  | "learning"
  | "fitness"
  | "nutrition"
  | "recovery"
  | "environment"
  | "focus"
  | "service"
  | "main_job"
  | "secondary_job"
  | "reflection";

export type PenaltyAction = {
  category: PenaltyCategory;
  title: string;
  description: string;
  intensity: PenaltyStyle;
  completionCondition: string;
  amountSek?: number;
};

export type MotivationStyle =
  | "Challenge"
  | "Discipline"
  | "Story"
  | "Rewards"
  | "Balance";

export type WorkoutPreference =
  | "Gym"
  | "Home"
  | "Running"
  | "Walking"
  | "Mobility"
  | "Mixed";

export type DietStyle =
  | "Flexible"
  | "High-Protein"
  | "Weight-Loss"
  | "Muscle-Gain"
  | "Balanced";

export type ActivityLevel = "Low" | "Moderate" | "High" | "Very High";

export type SpecialQuestFrequency =
  | "every_day"
  | "every_3_days"
  | "weekly"
  | "custom";

export type EnergyPattern =
  | "Morning"
  | "Afternoon"
  | "Evening"
  | "Unpredictable";

export type StressLevel = "Low" | "Moderate" | "High";

export type ArtifactKey =
  | "rest_day_pass"
  | "focus_shard"
  | "xp_rune"
  | "null_sigil"
  | "discipline_core"
  | "victory_seal"
  | "monarch_crown";

export type Artifact = {
  key: ArtifactKey;
  title: string;
  description: string;
  quantity: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  effectLabel: string;
  lore: string;
  unlockHint: string;
  unlocked: boolean;
  discoveredAt: string | null;
  usable: boolean;
};

export type ActiveEffects = {
  doubleDailyXpDate: string | null;
};

export type InterestCategory =
  | "engineering"
  | "programming"
  | "language_learning"
  | "business"
  | "design"
  | "fitness"
  | "creativity"
  | "strategy"
  | "craftsmanship"
  | "music"
  | "research"
  | "problem_solving"
  | "technical_building"
  | "adventure_stealth"
  | "discipline_habit_building"
  | "reading"
  | "chess"
  | "nutrition"
  | "outdoors"
  | "other";

export type QuestSource =
  | "main_job"
  | "secondary_job"
  | "interest"
  | "workout"
  | "diet"
  | "recovery"
  | "discipline"
  | "hybrid";

export type QuestJobFocus = "Main Job" | "Secondary Job" | "Hybrid" | "None";

export type QuestRotationPreference =
  | "Balanced"
  | "Main Job"
  | "Secondary Job"
  | "Fitness"
  | "Diet"
  | "Hybrid";

export type JobProfile = {
  title: string;
  archetype: string;
  rationale: string;
  questThemes: string[];
  realLifeAnchor: string;
};

export type WorkoutRecommendationProfile = {
  primaryType: string;
  intensity: "Low" | "Moderate" | "High";
  weeklyFrequency: string;
  sessionLengthMinutes: number;
  lowEnergyFallback: string;
  progressionRule: string;
};

export type DietRecommendationProfile = {
  style: string;
  priorities: string[];
  baselineRule: string;
  easyFallback: string;
  constraints: string[];
};

export type QuestPreferenceProfile = {
  preferredQuestTypes: string[];
  avoidedQuestTypes: string[];
  durationMinutes: number;
  difficultyNotes: string;
  rotationRule: string;
};

export type OnboardingAnalysisResult = {
  primaryGoals: string[];
  explicitInterests: string[];
  inferredInterests: string[];
  interestCategories: InterestCategory[];
  profession: string;
  hobbies: string[];
  mainJob: JobProfile;
  secondaryJob: JobProfile;
  possibleSecondaryJobThemes: string[];
  workoutRecommendation: WorkoutRecommendationProfile;
  dietRecommendation: DietRecommendationProfile;
  questPreferences: QuestPreferenceProfile;
  motivationalStyle: string;
  lifestyleNotes: string[];
};

export type AiSpecialQuestSuggestion = {
  title: string;
  description: string;
  xp: number;
  statRewards: Partial<Stats>;
  penalty: string;
  penaltyAction?: PenaltyAction;
  tags: string[];
  source?: QuestSource;
  jobFocus?: QuestJobFocus;
  durationMinutes?: number;
  completionCondition?: string;
  interestCategories?: InterestCategory[];
};

export type AiWeeklyMission = {
  day: string;
  title: string;
  description: string;
};

export type AiWeeklyPlan = {
  weekObjective: string;
  trainingFocus: string;
  nutritionFocus: string;
  recoveryFocus: string;
  pressureLevel: "Low" | "Moderate" | "High" | "Extreme";
  systemWarning: string;
  missions: AiWeeklyMission[];
};

export type AiSystemAnalysis = {
  archetype: BuildType;
  playerSummary: string;
  recommendedSystemTone: "Strict" | "Balanced" | "Intense";
  primaryFocus: MainImprovementArea;
  dietDirection: string;
  workoutDirection: string;
  weeklyStrategy: string;
  personalization?: OnboardingAnalysisResult;
  specialQuests: AiSpecialQuestSuggestion[];
};

export type UserProfile = {
  name: string;
  goal: string;
  motivationWhy: string;
  preferredWorkoutDays: string;
  preferredBuild: BuildType;
  difficulty: Difficulty;
  fitnessLevel: FitnessLevel;
  sleepQuality: SleepQuality;
  mainImprovementArea: MainImprovementArea;
  studyInterest: StudyInterest;
  penaltyStyle: PenaltyStyle;
  profession: string;
  hobbies: string;
  customInterests: string;
  mainJobOverride: string;
  secondaryJobOverride: string;
  rpgIdentityNotes: string;
  questRotationPreference: QuestRotationPreference;

  ageRange: "Under 18" | "18-24" | "25-34" | "35-44" | "45+";
  motivationStyle: MotivationStyle;
  workoutPreference: WorkoutPreference;
  dietStyle: DietStyle;
  dietaryRestrictions: string;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  availableMinutesWeekday: number;
  availableMinutesWeekend: number;
  sleepTargetHours: number;
  specialQuestFrequency: SpecialQuestFrequency;
  customSpecialQuestIntervalDays: number;
  energyPattern: EnergyPattern;
  stressLevel: StressLevel;
  wantsDietSupport: boolean;
  wantsWorkoutPlan: boolean;
  wantsStudyQuests: boolean;
  wantsLifestyleQuests: boolean;
  systemTone: "Strict" | "Balanced" | "Intense";
  onboardingCompleted: boolean;
};

export type SpecialQuestTemplate = {
  id: number;
  title: string;
  description: string;
  xp: number;
  statRewards: Partial<Stats>;
  penalty: string;
  penaltyAction?: PenaltyAction;
  preferredBuilds: BuildType[];
  tags: string[];
  minFitness?: FitnessLevel;
  source?: QuestSource;
  jobFocus?: QuestJobFocus;
  durationMinutes?: number;
  completionCondition?: string;
  interestCategories?: InterestCategory[];
};

export type SpecialQuestStatus =
  | "pending"
  | "accepted"
  | "urgent"
  | "completed"
  | "waived";

export type SpecialQuest = SpecialQuestTemplate & {
  completed: boolean;
  awardedToday: boolean;
  assignedDate: string;
  status: SpecialQuestStatus;
};

export type PenaltyNotice = {
  title: string;
  message: string;
  fromDate: string;
} | null;

export type LogEntryType =
  | "daily_quest"
  | "special_quest"
  | "workout_log"
  | "penalty"
  | "special_status"
  | "system_analysis"
  | "weekly_plan"
  | "system_rotation"
  | "system_notice"
  | "artifact"
  | "household_task"
  | "nutrition";

export type LogEntry = {
  id: string;
  type: LogEntryType;
  title: string;
  details: string;
  date: string;
};

export type UserRecord = {
  id: string;
  profile: UserProfile;
  quests: Quest[];
  streak: number;
  lastCompletionDate: string | null;
  totalXp: number;
  stats: Stats;
  history: HistoryEntry[];
  workoutJournal: WorkoutJournalEntry[];
  householdTasks: HouseholdTaskEntry[];
  funSpecialActivities: SpecialQuest[];
  foodJournal: FoodJournalEntry[];
  dietFeedback: DietFeedback[];
  specialQuest: SpecialQuest;
  penaltyNotice: PenaltyNotice;
  log: LogEntry[];
  aiAnalysis: AiSystemAnalysis | null;
  aiWeeklyPlan: AiWeeklyPlan | null;
  aiQuestIndex: number;
  artifacts: Artifact[];
  activeEffects: ActiveEffects;
  lastResetDate: string;
  dailyHp: number | null;
  dailyHpDate: string | null;
  specialQuestMemory?: SpecialQuestMemory;
};

export type SpecialQuestMemory = {
  recentTitles: string[];
  recentSources: QuestSource[];
  recentJobFocuses: QuestJobFocus[];
};

export type MultiUserData = {
  users: UserRecord[];
  activeUserId: string | null;
};

export type AppState = {
  isLoaded: boolean;
  users: UserRecord[];
  activeUserId: string | null;
  activeUser: UserRecord | null;

  quests: Quest[];
  streak: number;
  lastCompletionDate: string | null;
  totalXp: number;
  stats: Stats;
  history: HistoryEntry[];
  workoutJournal: WorkoutJournalEntry[];
  householdTasks: HouseholdTaskEntry[];
  funSpecialActivities: SpecialQuest[];
  foodJournal: FoodJournalEntry[];
  dietFeedback: DietFeedback[];
  specialQuest: SpecialQuest | null;
  penaltyNotice: PenaltyNotice;
  log: LogEntry[];
  profile: UserProfile | null;
  aiAnalysis: AiSystemAnalysis | null;
  aiWeeklyPlan: AiWeeklyPlan | null;
  aiQuestIndex: number;
  artifacts: Artifact[];
  activeEffects: ActiveEffects;
  dailyHp: number | null;
  dailyHpDate: string | null;

  toggleQuest: (id: number) => void;
  completeSpecialQuest: () => void;
  acceptSpecialQuest: () => void;
  markSpecialQuestUrgent: () => void;
  clearPenaltyNotice: () => void;
  updateProfile: (profile: UserProfile) => void;
  updateAiAnalysis: (analysis: AiSystemAnalysis | null) => void;
  updateAiWeeklyPlan: (plan: AiWeeklyPlan | null) => void;
  updateDailyHp: (hp: number) => void;
  addWorkoutJournalEntry: (
    entry: Omit<WorkoutJournalEntry, "id">
  ) => void;
  addHouseholdTask: (
    kind: HouseholdTaskKind,
    task: string | HouseholdTaskInput
  ) => void;
  completeHouseholdTask: (id: string) => void;
  deleteHouseholdTask: (id: string) => void;
  generateFunSpecialActivity: () => void;
  completeFunSpecialActivity: (id: number) => void;
  addFoodJournalEntry: (entry: Omit<FoodJournalEntry, "id">) => void;
  deleteFoodJournalEntry: (id: string) => void;
  saveDietFeedback: (feedback: DietFeedback) => void;
  activateArtifact: (key: ArtifactKey) => void;

  createUser: (name: string) => void;
  switchUser: (userId: string) => void;
  deleteUser: (userId: string) => void;

  previewSpecialQuests: () => SpecialQuestTemplate[];
  regenerateSpecialQuest: () => void;
};

export type HouseholdTaskKind = "chore" | "grocery" | "study" | "agility";

export type AgilityActivityType = "Walk" | "Run";

export type HouseholdTaskInput = {
  title: string;
  durationMinutes?: number;
  activityType?: AgilityActivityType;
  distanceKm?: number;
};

export type HouseholdTaskEntry = {
  id: string;
  kind: HouseholdTaskKind;
  title: string;
  durationMinutes?: number;
  activityType?: AgilityActivityType;
  distanceKm?: number;
  completed: boolean;
  awarded: boolean;
  createdAt: string;
  completedAt: string | null;
};

export type FoodJournalEntry = {
  id: string;
  date: string;
  foodName: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  vitamins?: string;
  minerals?: string;
  sugar?: number;
  sodium?: number;
};

export type NutritionSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

export type DietFeedback = {
  date: string;
  summary: string;
  suggestedMeals: string[];
};

