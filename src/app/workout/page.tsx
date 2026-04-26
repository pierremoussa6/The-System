"use client";

import { useMemo, useState } from "react";
import { useApp } from "../store";
import { getPersonalization } from "../quest-engine";
import { buildWorkoutProgram } from "../workout-system";
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
    totalXp,
    aiAnalysis,
    aiWeeklyPlan,
    workoutJournal,
    addWorkoutJournalEntry,
    regenerateSpecialQuest,
  } = useApp();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionName, setSessionName] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8-10");
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");

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
  const program = buildWorkoutProgram(profile, totalXp, aiAnalysis);

  function handleSubmitJournal() {
    if (!exerciseName.trim()) return;

    addWorkoutJournalEntry({
      date,
      sessionName: sessionName.trim() || "Workout Session",
      exerciseName: exerciseName.trim(),
      sets: Math.max(1, Number(sets) || 1),
      reps: reps.trim() || "8-10",
      weightKg: weightKg.trim() ? Number(weightKg) : null,
      notes: notes.trim(),
    });

    setExerciseName("");
    setWeightKg("");
    setNotes("");
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Workout</h1>

      <PanelCard className="border-blue-500">
        <SectionTitle title="Training Directive" colorClass="text-blue-400" />
        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="mb-1 text-sm text-zinc-400">Motivation Anchor</p>
            <p className="break-words leading-relaxed text-white">
              {program.motivationAnchor}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Preferred Days</p>
              <p className="text-zinc-200">{program.preferredDays.join(", ")}</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Session Length</p>
              <p className="text-zinc-200">{program.sessionLengthMinutes} min</p>
            </div>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Current Phase</p>
              <p className="text-zinc-200">{program.currentPhaseLabel}</p>
            </div>
          </div>
        </div>
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
        <SectionTitle title="12-Week Program" colorClass="text-purple-400" />
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-200">{program.headline}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {program.progressionCadence}
            </p>
          </div>

          {program.phases.map((phase) => (
            <div
              key={phase.name}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-4"
            >
              <p className="text-lg font-semibold text-white">{phase.name}</p>
              <p className="text-sm text-purple-300">{phase.weeks}</p>
              <p className="mt-2 text-zinc-300">{phase.objective}</p>
              <p className="mt-1 text-sm text-zinc-400">{phase.progression}</p>

              <div className="mt-4 space-y-4">
                {phase.sessions.map((session) => (
                  <div
                    key={`${phase.name}-${session.day}-${session.focus}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">
                        {session.day}: {session.focus}
                      </p>
                      <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-xs text-purple-200">
                        {session.durationMinutes} min
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Warm-up: {session.warmup}
                    </p>
                    <div className="mt-3 space-y-2">
                      {session.exercises.map((item) => (
                        <div
                          key={`${session.day}-${item.name}`}
                          className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                        >
                          <p className="font-medium text-zinc-100">{item.name}</p>
                          <p className="text-sm text-zinc-300">
                            {item.sets} sets x {item.reps} · Rest {item.restSeconds}s
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">{item.notes}</p>
                        </div>
                      ))}
                    </div>
                    {session.finisher && (
                      <p className="mt-3 text-sm text-zinc-300">
                        Finisher: {session.finisher}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-emerald-300">
                      Low-energy option: {session.lowEnergyOption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard className="border-yellow-500">
        <SectionTitle title="Assigned Training Missions" colorClass="text-yellow-400" />

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
              No workout-specific mission has been extracted yet. Generate a weekly plan from Dashboard to sync the weekly schedule with your preferred training days.
            </p>
          </div>
        )}
      </PanelCard>

      <PanelCard className="border-emerald-500">
        <SectionTitle title="Workout Journal" colorClass="text-emerald-400" />
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
            <input
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="Session name"
            />
            <input
              value={exerciseName}
              onChange={(event) => setExerciseName(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="Exercise name"
            />
            <input
              value={sets}
              onChange={(event) => setSets(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="Sets"
            />
            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="Reps"
            />
            <input
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="Weight in kg"
            />
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            placeholder="Notes: effort, pain-free range, progression target, machine used..."
          />
          <ActionButton onClick={handleSubmitJournal} variant="green">
            Save Journal Entry
          </ActionButton>

          {workoutJournal.length > 0 ? (
            <div className="space-y-3">
              {workoutJournal.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-white">{entry.exerciseName}</p>
                    <span className="text-sm text-zinc-400">{entry.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-300">
                    {entry.sessionName} · {entry.sets} sets x {entry.reps}
                    {entry.weightKg !== null ? ` · ${entry.weightKg} kg` : ""}
                  </p>
                  {entry.notes && (
                    <p className="mt-1 text-sm text-zinc-400">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="text-zinc-300">
                No workout entries logged yet. Track your lifts here so your next program change can be based on real progress.
              </p>
            </div>
          )}
        </div>
      </PanelCard>

      <PanelCard className="border-zinc-600">
        <SectionTitle title="System Guidance" colorClass="text-zinc-200" />

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
