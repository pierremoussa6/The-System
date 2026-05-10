"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../store";
import { getPersonalization } from "../quest-engine";
import {
  getLocalDietFeedback,
  getNutritionSummary,
  getNutritionTargets,
} from "../nutrition";
import type { DietFeedback, FoodJournalEntry, NutritionTargets } from "../types";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";

function isDietMission(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  return (
    text.includes("meal") ||
    text.includes("nutrition") ||
    text.includes("protein") ||
    text.includes("diet") ||
    text.includes("snack") ||
    text.includes("water") ||
    text.includes("hydrate") ||
    text.includes("food") ||
    text.includes("calorie") ||
    text.includes("eat")
  );
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}

function offsetDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getStatusColor(
  metric: keyof NutritionTargets,
  consumed: number,
  target: number,
  dietStyle: string
) {
  if (metric === "calories") {
    const lower = target * 0.85;
    const upper = dietStyle === "Weight-Loss" ? target * 1.05 : target * 1.12;
    return consumed >= lower && consumed <= upper ? "#22c55e" : "#ef4444";
  }

  if (metric === "sugar" || metric === "sodium") {
    return consumed <= target ? "#22c55e" : "#ef4444";
  }

  return consumed >= target ? "#22c55e" : "#ef4444";
}

export default function DietPage() {
  const {
    isLoaded,
    profile,
    aiAnalysis,
    aiWeeklyPlan,
    foodJournal,
    dietFeedback,
    addFoodJournalEntry,
    deleteFoodJournalEntry,
    saveDietFeedback,
    regenerateSpecialQuest,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [foodName, setFoodName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [vitamins, setVitamins] = useState("");
  const [minerals, setMinerals] = useState("");
  const [sugar, setSugar] = useState("");
  const [sodium, setSodium] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const dietMissions = useMemo(() => {
    if (!aiWeeklyPlan?.missions) return [];
    return aiWeeklyPlan.missions.filter((mission) =>
      isDietMission(mission.title, mission.description)
    );
  }, [aiWeeklyPlan]);

  if (!isLoaded || !profile) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Diet</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  const personalization = aiAnalysis
    ? getPersonalization(aiAnalysis, profile)
    : null;
  const targets = getNutritionTargets(profile);
  const todaysEntries = foodJournal.filter((entry) => entry.date === selectedDate);
  const summary = getNutritionSummary(todaysEntries);
  const previousDate = offsetDateString(selectedDate, -1);
  const previousEntries = foodJournal.filter((entry) => entry.date === previousDate);
  const previousSummary = getNutritionSummary(previousEntries);
  const savedFeedback = dietFeedback.find((entry) => entry.date === previousDate);

  const chartData = [
    { key: "calories", label: "Calories", consumed: summary.calories, target: targets.calories },
    { key: "protein", label: "Protein", consumed: summary.protein, target: targets.protein },
    { key: "carbs", label: "Carbs", consumed: summary.carbs, target: targets.carbs },
    { key: "fat", label: "Fat", consumed: summary.fat, target: targets.fat },
    { key: "fiber", label: "Fiber", consumed: summary.fiber, target: targets.fiber },
  ] as const;

  function handleAddFood() {
    if (!foodName.trim()) return;

    addFoodJournalEntry({
      date: selectedDate,
      foodName: foodName.trim(),
      quantity: quantity.trim() || "1 portion",
      calories: toNumber(calories),
      protein: toNumber(protein),
      carbs: toNumber(carbs),
      fat: toNumber(fat),
      fiber: toNumber(fiber),
      vitamins: vitamins.trim(),
      minerals: minerals.trim(),
      sugar: toNumber(sugar),
      sodium: toNumber(sodium),
    });

    setFoodName("");
    setQuantity("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFiber("");
    setVitamins("");
    setMinerals("");
    setSugar("");
    setSodium("");
  }

  async function handleGenerateFeedback() {
    if (!profile) return;

    if (previousEntries.length === 0) {
      setFeedbackMessage("Log yesterday's food first so the AI has data to inspect.");
      return;
    }

    setIsGeneratingFeedback(true);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/system/diet-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: previousDate,
          entries: previousEntries,
          summary: previousSummary,
          targets,
          profile,
          aiAnalysis,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate diet feedback");

      const data = (await response.json()) as { feedback: DietFeedback };
      saveDietFeedback(data.feedback);
      setFeedbackMessage(data.feedback.summary);
    } catch (error) {
      console.error(error);
      const fallback = getLocalDietFeedback(
        previousDate,
        previousSummary,
        targets,
        profile
      );
      saveDietFeedback(fallback);
      setFeedbackMessage(fallback.summary);
    } finally {
      setIsGeneratingFeedback(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Diet</h1>

      <PanelCard className="border-emerald-500">
        <SectionTitle
          title="Daily Nutrition Journal"
          colorClass="text-emerald-400"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
          />
          <input
            value={foodName}
            onChange={(event) => setFoodName(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            placeholder="Food name"
          />
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            placeholder="Quantity or portion"
          />
          <input
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            placeholder="Calories"
          />
          <input value={protein} onChange={(event) => setProtein(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Protein g" />
          <input value={carbs} onChange={(event) => setCarbs(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Carbs g" />
          <input value={fat} onChange={(event) => setFat(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Fat g" />
          <input value={fiber} onChange={(event) => setFiber(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Fiber g" />
          <input value={vitamins} onChange={(event) => setVitamins(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Vitamins (optional)" />
          <input value={minerals} onChange={(event) => setMinerals(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Minerals (optional)" />
          <input value={sugar} onChange={(event) => setSugar(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Sugar g" />
          <input value={sodium} onChange={(event) => setSodium(event.target.value)} className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white" placeholder="Sodium mg" />
        </div>
        <ActionButton onClick={handleAddFood} variant="green">
          Add Food
        </ActionButton>
      </PanelCard>

      <PanelCard className="border-cyan-500">
        <SectionTitle title="Daily Nutrition Summary" colorClass="text-cyan-400" />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Calories</p>
            <p className="text-xl text-white">{summary.calories} / {targets.calories}</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Protein</p>
            <p className="text-xl text-white">{summary.protein}g / {targets.protein}g</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Carbs</p>
            <p className="text-xl text-white">{summary.carbs}g / {targets.carbs}g</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Fat</p>
            <p className="text-xl text-white">{summary.fat}g / {targets.fat}g</p>
          </div>
        </div>
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Nutrition Chart" colorClass="text-purple-400" />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#a1a1aa" />
              <YAxis stroke="#a1a1aa" />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #3f3f46",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="target" name="Target" fill="#52525b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumed" name="Consumed" radius={[4, 4, 0, 0]}>
                {chartData.map((item) => (
                  <Cell
                    key={item.key}
                    fill={getStatusColor(
                      item.key,
                      item.consumed,
                      item.target,
                      profile.dietStyle
                    )}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PanelCard>

      <PanelCard className="border-zinc-700">
        <SectionTitle title="Food Entries" colorClass="text-zinc-200" />
        {todaysEntries.length > 0 ? (
          <div className="space-y-3">
            {todaysEntries.map((entry: FoodJournalEntry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{entry.foodName}</p>
                    <p className="text-sm text-zinc-400">{entry.quantity}</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {entry.calories} kcal · P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g
                    </p>
                    {(entry.vitamins || entry.minerals) && (
                      <p className="mt-1 text-sm text-zinc-400">
                        {[entry.vitamins, entry.minerals].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <ActionButton
                    onClick={() => deleteFoodJournalEntry(entry.id)}
                    variant="red"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">No food entries for this day yet.</p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-yellow-500">
        <SectionTitle
          title="AI Diet Feedback"
          colorClass="text-yellow-400"
        />
        <div className="space-y-3">
          <p className="text-zinc-300">
            Previous day analyzed: <span className="text-white">{previousDate}</span>
          </p>
          <ActionButton
            onClick={handleGenerateFeedback}
            variant="blue"
            disabled={isGeneratingFeedback}
          >
            {isGeneratingFeedback ? "Analyzing..." : "Analyze Previous Day"}
          </ActionButton>
          {(feedbackMessage || savedFeedback) && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-yellow-100">
                {feedbackMessage || savedFeedback?.summary}
              </p>
              {(savedFeedback?.suggestedMeals.length ?? 0) > 0 && (
                <div className="mt-3 space-y-1 text-sm text-zinc-300">
                  {savedFeedback?.suggestedMeals.map((meal) => (
                    <p key={meal}>{meal}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PanelCard>

      <PanelCard className="border-emerald-500">
        <SectionTitle title="Personalized Targets" colorClass="text-emerald-400" />
        <div className="space-y-2">
          <p><span className="text-zinc-400">Diet Style:</span> <span className="text-white">{profile.dietStyle}</span></p>
          <p><span className="text-zinc-400">Body Data:</span> <span className="text-white">{profile.age} years · {profile.weightKg} kg · {profile.heightCm} cm · {profile.activityLevel} activity</span></p>
          <p><span className="text-zinc-400">Dietary Restrictions:</span> <span className="text-white">{profile.dietaryRestrictions || "None specified"}</span></p>
          <p><span className="text-zinc-400">Targets:</span> <span className="text-white">{targets.calories} kcal, {targets.protein}g protein, {targets.carbs}g carbs, {targets.fat}g fat</span></p>
        </div>
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Assigned Nutrition Missions" colorClass="text-purple-400" />

        {dietMissions.length > 0 ? (
          <div className="space-y-3">
            {dietMissions.map((mission, index) => (
              <div
                key={`${mission.title}-${index}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{mission.title}</p>
                  <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                    {mission.day}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-300">{mission.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">
              No diet-specific mission has been extracted yet. The System will tighten nutritional control as your weekly protocol evolves.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-zinc-600">
        <SectionTitle title="System Guidance" colorClass="text-zinc-200" />

        {aiAnalysis ? (
          <div className="space-y-3">
            {personalization && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">
                  Diet Recommendation Profile
                </p>
                <p className="break-words leading-relaxed text-zinc-200">
                  {personalization.dietRecommendation.baselineRule}
                </p>
                <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">
                  Priorities: {personalization.dietRecommendation.priorities.join(", ")}
                </p>
                <p className="mt-1 break-words text-sm leading-relaxed text-zinc-400">
                  Fallback: {personalization.dietRecommendation.easyFallback}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Diet Direction</p>
              <p className="break-words leading-relaxed text-zinc-200">{aiAnalysis.dietDirection}</p>
            </div>

            {aiWeeklyPlan && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">System Warning</p>
                <p className="break-words leading-relaxed text-zinc-200">{aiWeeklyPlan.systemWarning}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">
              Complete your profile survey so The System can generate a personalized nutrition doctrine.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-green-500">
        <SectionTitle title="Quick Action" colorClass="text-green-400" />
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={regenerateSpecialQuest} variant="gray">
            Rotate Special Quest
          </ActionButton>
        </div>
      </PanelCard>
    </div>
  );
}
