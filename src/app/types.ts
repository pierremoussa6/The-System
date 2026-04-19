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

export type EnergyPattern =
  | "Morning"
  | "Afternoon"
  | "Evening"
  | "Unpredictable";

export type StressLevel = "Low" | "Moderate" | "High";

export type ArtifactKey = "rest_day_pass" | "null_sigil" | "xp_rune";

export type Artifact = {
  key: ArtifactKey;
  title: string;
  description: string;
  quantity: number;
  rarity: "common" | "rare" | "epic";
  effectLabel: string;
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
  availableMinutesWeekday: number;
  availableMinutesWeekend: number;
  sleepTargetHours: number;
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
  | "penalty"
  | "special_status"
  | "system_analysis"
  | "weekly_plan"
  | "system_rotation"
  | "system_notice"
  | "artifact";

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
  activateArtifact: (key: ArtifactKey) => void;

  createUser: (name: string) => void;
  switchUser: (userId: string) => void;
  deleteUser: (userId: string) => void;

  previewSpecialQuests: () => SpecialQuestTemplate[];
  regenerateSpecialQuest: () => void;
};

