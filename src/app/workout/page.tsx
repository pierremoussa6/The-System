"use client";

import { useMemo } from "react";
import { useApp } from "../store";
import { getPersonalization } from "../quest-engine";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";

function isWorkoutMission(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();

  return (
    text.includes("gym") ||
    text.includes("workout") ||
    text.includes("train") ||
    text.includes("lift") ||
    text.includes("conditioning") ||
    text.includes("cardio") ||
    text.includes("walk") ||
    text.includes("run") ||
    text.includes("mobility") ||
    text.includes("recovery")
  );
}

export default function WorkoutPage() {
  const {
    isLoaded,
    profile,
    stats,
    aiAnalysis,
    aiWeeklyPlan,
    regenerateSpecialQuest,
  } = useApp();

  const workoutMissions = useMemo(() => {
    if (!aiWeeklyPlan?.missions) return [];
    return aiWeeklyPlan.missions.filter((mission) =>
      isWorkoutMission(mission.title, mission.description)
    );
  }, [aiWeeklyPlan]);

  if (!isLoaded || !profile) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Workout</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  const personalization = aiAnalysis
    ? getPersonalization(aiAnalysis, profile)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Workout</h1>

      <PanelCard className="border-blue-500">
        <SectionTitle title="Training Directive" colorClass="text-blue-400" />

        {aiWeeklyPlan ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Weekly Objective</p>
              <p className="break-words leading-relaxed text-white">{aiWeeklyPlan.weekObjective}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Training Focus</p>
              <p className="break-words leading-relaxed text-zinc-200">{aiWeeklyPlan.trainingFocus}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Pressure Level</p>
              <p className="text-zinc-200">{aiWeeklyPlan.pressureLevel}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">
              No weekly workout directive generated yet. Go to Dashboard and generate a weekly plan to let The System shape your training week.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-cyan-500">
        <SectionTitle title="Current Hunter Physique" colorClass="text-cyan-400" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard label="Strength" value={stats.strength} />
          <StatCard label="Vitality" value={stats.vitality} />
          <StatCard label="Discipline" value={stats.discipline} />
          <StatCard label="Intelligence" value={stats.intelligence} />
          <StatCard label="Agility" value={stats.agility} />
          <StatCard label="Magic Resistance" value={stats.magicResistance} />
        </div>
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Assigned Training Missions" colorClass="text-purple-400" />

        {workoutMissions.length > 0 ? (
          <div className="space-y-3">
            {workoutMissions.map((mission, index) => (
              <div
                key={`${mission.title}-${index}`}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{mission.title}</p>
                  <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
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
              No workout-specific mission has been extracted yet. The System will assign them once your weekly structure becomes more defined.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-yellow-500">
        <SectionTitle title="System Guidance" colorClass="text-yellow-400" />

        {aiAnalysis ? (
          <div className="space-y-3">
            {personalization && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">
                  Workout Recommendation Profile
                </p>
                <p className="break-words leading-relaxed text-zinc-200">
                  {personalization.workoutRecommendation.primaryType} at{" "}
                  {personalization.workoutRecommendation.intensity.toLowerCase()}{" "}
                  intensity, {personalization.workoutRecommendation.weeklyFrequency}.
                </p>
                <p className="mt-2 break-words text-sm leading-relaxed text-zinc-400">
                  Fallback: {personalization.workoutRecommendation.lowEnergyFallback}
                </p>
                <p className="mt-1 break-words text-sm leading-relaxed text-zinc-400">
                  Progression: {personalization.workoutRecommendation.progressionRule}
                </p>
              </div>
            )}

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Workout Direction</p>
              <p className="break-words leading-relaxed text-zinc-200">{aiAnalysis.workoutDirection}</p>
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
              Complete your profile survey so The System can generate a personalized training doctrine.
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

