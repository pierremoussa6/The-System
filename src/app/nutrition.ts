import type {
  DietFeedback,
  FoodJournalEntry,
  NutritionSummary,
  NutritionTargets,
  UserProfile,
} from "./types";

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function getActivityMultiplier(profile: UserProfile) {
  switch (profile.activityLevel) {
    case "Low":
      return 1.25;
    case "High":
      return 1.7;
    case "Very High":
      return 1.9;
    case "Moderate":
    default:
      return 1.45;
  }
}

export function getNutritionTargets(profile: UserProfile): NutritionTargets {
  const weightKg =
    typeof profile.weightKg === "number" && Number.isFinite(profile.weightKg)
      ? Math.max(35, profile.weightKg)
      : 75;
  const heightCm =
    typeof profile.heightCm === "number" && Number.isFinite(profile.heightCm)
      ? Math.max(120, profile.heightCm)
      : 175;
  const age =
    typeof profile.age === "number" && Number.isFinite(profile.age)
      ? Math.max(13, profile.age)
      : 30;

  const neutralBmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 80;
  const maintenance = neutralBmr * getActivityMultiplier(profile);
  const calorieAdjustment =
    profile.dietStyle === "Weight-Loss"
      ? -350
      : profile.dietStyle === "Muscle-Gain"
      ? 250
      : 0;
  const calories = Math.max(1400, Math.round(maintenance + calorieAdjustment));
  const proteinMultiplier =
    profile.dietStyle === "High-Protein" || profile.dietStyle === "Muscle-Gain"
      ? 1.8
      : 1.55;
  const protein = Math.round(weightKg * proteinMultiplier);
  const fat = Math.round(Math.max(45, weightKg * 0.8));
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbs = Math.round(Math.max(90, (calories - proteinCalories - fatCalories) / 4));
  const fiber = Math.round(Math.max(22, Math.min(40, calories / 100)));
  const sugar = Math.round(Math.max(35, calories * 0.08 / 4));
  const sodium = 2300;

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
  };
}

export function getNutritionSummary(
  entries: FoodJournalEntry[]
): NutritionSummary {
  return entries.reduce<NutritionSummary>(
    (summary, entry) => ({
      calories: round(summary.calories + entry.calories),
      protein: round(summary.protein + entry.protein),
      carbs: round(summary.carbs + entry.carbs),
      fat: round(summary.fat + entry.fat),
      fiber: round(summary.fiber + (entry.fiber ?? 0)),
      sugar: round(summary.sugar + (entry.sugar ?? 0)),
      sodium: round(summary.sodium + (entry.sodium ?? 0)),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }
  );
}

export function getLocalDietFeedback(
  date: string,
  summary: NutritionSummary,
  targets: NutritionTargets,
  profile: UserProfile
): DietFeedback {
  const messages: string[] = [];
  const suggestedMeals: string[] = [];
  const calorieUpper =
    profile.dietStyle === "Weight-Loss"
      ? targets.calories * 1.05
      : targets.calories * 1.12;

  if (summary.protein < targets.protein * 0.85) {
    messages.push(
      "Protein was low yesterday. Add a clear protein source early tomorrow."
    );
    suggestedMeals.push("Greek yogurt with berries, eggs, chicken, tofu, or tuna.");
  }

  if (summary.calories > calorieUpper) {
    messages.push(
      profile.dietStyle === "Weight-Loss"
        ? "Calories ran high for a weight-loss target. Use smaller portions or swap one dense snack for fruit or vegetables."
        : "Calories ran above target. Keep portions steadier tomorrow."
    );
  } else if (summary.calories < targets.calories * 0.8) {
    messages.push(
      "Calories were low. If energy drops, add a simple meal with protein and carbs."
    );
  }

  if (summary.fiber < targets.fiber * 0.75) {
    messages.push(
      "Fiber was low. Add fruit, vegetables, beans, oats, or whole grains."
    );
    suggestedMeals.push("Oats with fruit, rice bowl with vegetables, or bean chili.");
  }

  if (messages.length === 0) {
    messages.push(
      "Nutrition stayed close to target. Repeat the simplest meals that made this easy."
    );
    suggestedMeals.push("Keep one repeatable protein-and-plants meal ready.");
  }

  return {
    date,
    summary: messages.join(" "),
    suggestedMeals: suggestedMeals.slice(0, 3),
  };
}
