import type {
  AiSystemAnalysis,
  AiWeeklyPlan,
  UserProfile,
  UserRecord,
} from "./types";

export type AiProfileContext = {
  identity: {
    name: string;
    goal: string;
    profession: string;
    preferredBuild: string;
    detectedDifficulty: string;
    systemTone: string;
  };
  lifestyle: {
    fitnessLevel: string;
    sleepQuality: string;
    sleepTargetHours: number;
    energyPattern: string;
    stressLevel: string;
    availableMinutesWeekday: number;
    availableMinutesWeekend: number;
  };
  preferences: {
    workoutPreference: string;
    dietStyle: string;
    dietaryRestrictions: string;
    studyInterest: string;
    customInterests: string;
    hobbies: string;
    mainImprovementArea: string;
    motivationStyle: string;
    penaltyStyle: string;
  };
  supportFlags: {
    wantsDietSupport: boolean;
    wantsWorkoutPlan: boolean;
    wantsStudyQuests: boolean;
    wantsLifestyleQuests: boolean;
  };
};

export function buildAiProfileContext(profile: UserProfile): AiProfileContext {
  return {
    identity: {
      name: profile.name,
      goal: profile.goal,
      profession: profile.profession,
      preferredBuild: profile.preferredBuild,
      detectedDifficulty: profile.difficulty,
      systemTone: profile.systemTone,
    },
    lifestyle: {
      fitnessLevel: profile.fitnessLevel,
      sleepQuality: profile.sleepQuality,
      sleepTargetHours: profile.sleepTargetHours,
      energyPattern: profile.energyPattern,
      stressLevel: profile.stressLevel,
      availableMinutesWeekday: profile.availableMinutesWeekday,
      availableMinutesWeekend: profile.availableMinutesWeekend,
    },
    preferences: {
      workoutPreference: profile.workoutPreference,
      dietStyle: profile.dietStyle,
      dietaryRestrictions: profile.dietaryRestrictions,
      studyInterest: profile.studyInterest,
      customInterests: profile.customInterests,
      hobbies: profile.hobbies,
      mainImprovementArea: profile.mainImprovementArea,
      motivationStyle: profile.motivationStyle,
      penaltyStyle: profile.penaltyStyle,
    },
    supportFlags: {
      wantsDietSupport: profile.wantsDietSupport,
      wantsWorkoutPlan: profile.wantsWorkoutPlan,
      wantsStudyQuests: profile.wantsStudyQuests,
      wantsLifestyleQuests: profile.wantsLifestyleQuests,
    },
  };
}

export function buildAiPlannerPayload(user: UserRecord) {
  return {
    profile: buildAiProfileContext(user.profile),
    progression: {
      totalXp: user.totalXp,
      streak: user.streak,
      stats: user.stats,
    },
    recentLog: user.log.slice(0, 10),
    currentSpecialQuest: user.specialQuest,
    aiAnalysis: user.aiAnalysis,
  };
}

export function hasWeeklyPlan(plan: AiWeeklyPlan | null) {
  return !!plan && plan.missions.length > 0;
}

export function getWeeklyPlanHeadline(
  plan: AiWeeklyPlan | null,
  aiAnalysis: AiSystemAnalysis | null
) {
  if (plan?.weekObjective) return plan.weekObjective;
  if (aiAnalysis?.primaryFocus) {
    return `${aiAnalysis.primaryFocus} Week Protocol`;
  }
  return "Weekly Protocol";
}
