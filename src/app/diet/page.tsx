"use client";

import { useMemo } from "react";
import { useApp } from "../store";
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

export default function DietPage() {
  const {
    isLoaded,
    profile,
    aiAnalysis,
    aiWeeklyPlan,
    regenerateSpecialQuest,
  } = useApp();

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

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Diet</h1>

      <PanelCard className="border-emerald-500">
        <SectionTitle title="Nutrition Directive" colorClass="text-emerald-400" />

        {aiWeeklyPlan ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Weekly Objective</p>
              <p className="text-white">{aiWeeklyPlan.weekObjective}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Nutrition Focus</p>
              <p className="text-zinc-200">{aiWeeklyPlan.nutritionFocus}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Recovery Focus</p>
              <p className="text-zinc-200">{aiWeeklyPlan.recoveryFocus}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">
              No weekly diet directive generated yet. Go to Dashboard and generate a weekly plan so The System can establish your food protocol.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-cyan-500">
        <SectionTitle title="Profile Nutrition Settings" colorClass="text-cyan-400" />

        <div className="space-y-2">
          <p>
            <span className="text-zinc-400">Diet Style:</span>{" "}
            <span className="text-white">{profile.dietStyle}</span>
          </p>
          <p>
            <span className="text-zinc-400">Dietary Restrictions:</span>{" "}
            <span className="text-white">
              {profile.dietaryRestrictions || "None specified"}
            </span>
          </p>
          <p>
            <span className="text-zinc-400">Diet Support Enabled:</span>{" "}
            <span className="text-white">
              {profile.wantsDietSupport ? "Yes" : "No"}
            </span>
          </p>
          <p>
            <span className="text-zinc-400">Sleep Quality:</span>{" "}
            <span className="text-white">{profile.sleepQuality}</span>
          </p>
          <p>
            <span className="text-zinc-400">Stress Level:</span>{" "}
            <span className="text-white">{profile.stressLevel}</span>
          </p>
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

      <PanelCard className="border-yellow-500">
        <SectionTitle title="System Guidance" colorClass="text-yellow-400" />

        {aiAnalysis ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Diet Direction</p>
              <p className="text-zinc-200">{aiAnalysis.dietDirection}</p>
            </div>

            {aiWeeklyPlan && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">System Warning</p>
                <p className="text-zinc-200">{aiWeeklyPlan.systemWarning}</p>
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
