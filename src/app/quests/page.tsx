"use client";

import { useState } from "react";
import { useApp } from "../store";
import { calculateLevel } from "../logic";
import type { AgilityActivityType, HouseholdTaskEntry } from "../types";
import { formatRewardText } from "../reward-system";
import {
  getHouseholdTaskDetails,
  getHouseholdTaskRewardText,
} from "../task-system";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";

export default function QuestsPage() {
  const {
    quests,
    isLoaded,
    streak,
    totalXp,
    specialQuest,
    completeSpecialQuest,
    acceptSpecialQuest,
    markSpecialQuestUrgent,
    penaltyNotice,
    clearPenaltyNotice,
    toggleQuest,
    profile,
    dailyHp,
    updateDailyHp,
    householdTasks,
    addHouseholdTask,
    completeHouseholdTask,
    deleteHouseholdTask,
    funSpecialActivities,
    generateFunSpecialActivity,
    completeFunSpecialActivity,
  } = useApp();
  const [newChore, setNewChore] = useState("");
  const [newGrocery, setNewGrocery] = useState("");
  const [newStudyTitle, setNewStudyTitle] = useState("");
  const [newStudyDuration, setNewStudyDuration] = useState("15");
  const [newAgilityType, setNewAgilityType] =
    useState<AgilityActivityType>("Walk");
  const [newAgilityDistance, setNewAgilityDistance] = useState("");
  const [newAgilityDuration, setNewAgilityDuration] = useState("20");

  if (!isLoaded || !specialQuest || !profile) {
    return (
      <div>
        <h1 className="text-3xl text-blue-400 mb-6">Quests</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  const { level, currentLevelXp, xpGoal, progressPercent } =
    calculateLevel(totalXp);

  const completedCount = quests.filter((quest) => quest.completed).length;
  const allCompleted = quests.length > 0 && quests.every((q) => q.completed);
  const recoveryModeActive = typeof dailyHp === "number" && dailyHp < 50;

  function getQuestRewardText(questId: number) {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return "";
    return formatRewardText({
      xp: quest.xp,
      statRewards: quest.statRewards ?? {},
    });
  }

  function handleAddChore() {
    if (!newChore.trim()) return;
    addHouseholdTask("chore", newChore);
    setNewChore("");
  }

  function handleAddGrocery() {
    if (!newGrocery.trim()) return;
    addHouseholdTask("grocery", newGrocery);
    setNewGrocery("");
  }

  function handleAddStudy() {
    if (!newStudyTitle.trim()) return;

    addHouseholdTask("study", {
      title: newStudyTitle,
      durationMinutes: Number(newStudyDuration),
    });
    setNewStudyTitle("");
  }

  function handleAddAgility() {
    const distanceKm = newAgilityDistance.trim()
      ? Number(newAgilityDistance)
      : undefined;
    const durationMinutes = newAgilityDuration.trim()
      ? Number(newAgilityDuration)
      : undefined;
    const detailParts = [
      newAgilityType,
      distanceKm ? `${distanceKm} km` : "",
      durationMinutes ? `${durationMinutes} min` : "",
    ].filter(Boolean);

    addHouseholdTask("agility", {
      title: detailParts.join(" / "),
      activityType: newAgilityType,
      distanceKm,
      durationMinutes,
    });
    setNewAgilityDistance("");
    setNewAgilityDuration(newAgilityType === "Run" ? "" : "20");
  }

  const chores = householdTasks.filter((task) => task.kind === "chore");
  const groceries = householdTasks.filter((task) => task.kind === "grocery");
  const studyTasks = householdTasks.filter((task) => task.kind === "study");
  const agilityTasks = householdTasks.filter((task) => task.kind === "agility");
  const studyDuration = Number(newStudyDuration);
  const agilityDistance = Number(newAgilityDistance);
  const agilityDuration = Number(newAgilityDuration);
  const canAddStudy =
    Boolean(newStudyTitle.trim()) &&
    Number.isFinite(studyDuration) &&
    studyDuration > 0;
  const canAddAgility =
    newAgilityType === "Run"
      ? Number.isFinite(agilityDistance) && agilityDistance >= 1
      : (Number.isFinite(agilityDistance) && agilityDistance > 0) ||
        (Number.isFinite(agilityDuration) && agilityDuration > 0);

  function renderTaskList(
    tasks: HouseholdTaskEntry[],
    emptyLabel: string,
    completeLabel: string,
    variant: "green" | "blue" | "purple"
  ) {
    return (
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-lg border p-4 ${
                task.completed
                  ? "border-emerald-500 bg-emerald-950/30"
                  : "border-zinc-700 bg-zinc-800"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{task.title}</p>
                  <p className="text-sm text-zinc-400">
                    {getHouseholdTaskDetails(task)}
                  </p>
                  <p className="text-sm text-zinc-400">
                    Reward: {getHouseholdTaskRewardText(task)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    onClick={() => completeHouseholdTask(task.id)}
                    variant={task.completed ? "gray" : variant}
                    disabled={task.completed}
                  >
                    {task.completed ? "Done" : completeLabel}
                  </ActionButton>
                  <ActionButton
                    onClick={() => deleteHouseholdTask(task.id)}
                    variant="red"
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-zinc-300">{emptyLabel}</p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-blue-400">Quests</h1>

      <PanelCard className={recoveryModeActive ? "border-emerald-500" : "border-cyan-500"}>
        <SectionTitle title="Daily HP Check" colorClass="text-cyan-400" />
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <input
              type="range"
              min="0"
              max="100"
              value={dailyHp ?? 75}
              onChange={(event) => updateDailyHp(Number(event.target.value))}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={dailyHp ?? ""}
              onChange={(event) => updateDailyHp(Number(event.target.value))}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              placeholder="HP"
            />
          </div>
          {recoveryModeActive && (
            <p className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-200">
              HP below 50. Focus on recovery and the daily quests. The special quest is cancelled for today.
            </p>
          )}
        </div>
      </PanelCard>

      {penaltyNotice && (
        <PanelCard className="border-red-500">
          <SectionTitle title={penaltyNotice.title} colorClass="text-red-400" />
          <p className="text-zinc-300">{penaltyNotice.message}</p>
          <ActionButton onClick={clearPenaltyNotice} variant="red">
            Acknowledge Penalty
          </ActionButton>
        </PanelCard>
      )}

      <PanelCard>
        <h2 className="text-2xl mb-2">Level {level}</h2>

        <div className="w-full bg-zinc-700 h-4 rounded mb-4 overflow-hidden">
          <div
            className="bg-blue-500 h-4 rounded"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="mb-2">Total XP: {totalXp}</p>
        <p className="mb-2">
          Level XP: {currentLevelXp} / {xpGoal}
        </p>
        <p className="mb-2 text-blue-300">Difficulty: {profile.difficulty}</p>
        <p className="text-zinc-400">
          Completed quests: {completedCount} / {quests.length}
        </p>
        <p className="text-orange-400 mt-2">🔥 Streak: {streak} day(s)</p>

        {allCompleted && (
          <p className="text-green-400 mt-2">
            Daily mission complete. +1 Discipline secured.
          </p>
        )}
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Special Quest" colorClass="text-purple-400" />

        <p className="text-lg">{specialQuest.title}</p>
        <p className="text-zinc-300">{specialQuest.description}</p>
        <p className="text-sm text-zinc-400">
          Reward: +{specialQuest.xp} XP
        </p>
        <p className="text-sm text-zinc-400">
          Penalty: {specialQuest.penalty}
        </p>
        {specialQuest.penaltyAction && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="mb-1 text-sm text-red-300">
              Corrective Action: {specialQuest.penaltyAction.title}
            </p>
            <p className="text-sm text-zinc-300">
              {specialQuest.penaltyAction.completionCondition}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-200">
                {specialQuest.penaltyAction.category.replace(/_/g, " ")}
              </span>
              <span className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-300">
                {specialQuest.penaltyAction.intensity}
              </span>
              {specialQuest.penaltyAction.amountSek && (
                <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-200">
                  {specialQuest.penaltyAction.amountSek} SEK savings
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          {specialQuest.jobFocus && specialQuest.jobFocus !== "None" && (
            <span className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-1 text-purple-200">
              {specialQuest.jobFocus}
            </span>
          )}
          {specialQuest.source && (
            <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-200">
              {specialQuest.source.replace("_", " ")}
            </span>
          )}
          {specialQuest.durationMinutes && (
            <span className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-zinc-300">
              {specialQuest.durationMinutes} min
            </span>
          )}
        </div>

        {specialQuest.completionCondition && (
          <p className="text-sm text-zinc-400">
            Completion: {specialQuest.completionCondition}
          </p>
        )}

        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <p className="text-sm text-zinc-400 mb-1">Quest State</p>
          <p className="text-zinc-200 capitalize">{specialQuest.status}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton
            onClick={acceptSpecialQuest}
            disabled={specialQuest.status !== "pending"}
            variant="blue"
          >
            Accept Quest
          </ActionButton>

          <ActionButton
            onClick={markSpecialQuestUrgent}
            disabled={specialQuest.status === "urgent" || specialQuest.completed}
            variant="red"
          >
            Mark Urgent
          </ActionButton>

          <ActionButton
            onClick={completeSpecialQuest}
            disabled={specialQuest.completed || specialQuest.awardedToday}
            variant={
              specialQuest.completed || specialQuest.awardedToday
                ? "green"
                : "purple"
            }
          >
            {specialQuest.completed || specialQuest.awardedToday
              ? "Completed"
              : "Complete Special Quest"}
          </ActionButton>

          <ActionButton onClick={generateFunSpecialActivity} variant="green">
            Generate a fun special activity
          </ActionButton>
        </div>

        {funSpecialActivities.length > 0 && (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="font-medium text-emerald-200">
              Fun Special Activities
            </p>
            {funSpecialActivities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-lg border border-zinc-700 bg-zinc-900 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{activity.title}</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Reward:{" "}
                      {formatRewardText({
                        xp: activity.xp,
                        statRewards: activity.statRewards,
                      })}
                    </p>
                    {activity.completionCondition && (
                      <p className="mt-1 text-sm text-zinc-500">
                        Completion: {activity.completionCondition}
                      </p>
                    )}
                  </div>
                  <ActionButton
                    onClick={() => completeFunSpecialActivity(activity.id)}
                    disabled={activity.completed || activity.awardedToday}
                    variant={activity.completed ? "gray" : "green"}
                  >
                    {activity.completed ? "Completed" : "Complete"}
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard>
        <SectionTitle title="Daily Quests" />

        <div className="space-y-4">
          {quests.map((quest) => (
            <button
              key={quest.id}
              onClick={() => toggleQuest(quest.id)}
              className={`w-full text-left p-4 rounded transition border ${
                quest.completed
                  ? "bg-green-900/40 border-green-500"
                  : "bg-zinc-800 border-zinc-700 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>
                  {quest.completed ? "✅" : "⬜"} {quest.title}
                </span>
                <span className="text-sm text-zinc-300">
                  {getQuestRewardText(quest.id)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </PanelCard>

      <PanelCard className="border-emerald-500">
        <SectionTitle title="Task Journal" colorClass="text-emerald-400" />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                value={newChore}
                onChange={(event) => setNewChore(event.target.value)}
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                placeholder="Add chore"
              />
              <ActionButton onClick={handleAddChore} variant="green">
                Add
              </ActionButton>
            </div>
            {renderTaskList(chores, "No chores added yet.", "Complete", "green")}
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                value={newGrocery}
                onChange={(event) => setNewGrocery(event.target.value)}
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                placeholder="Add grocery item"
              />
              <ActionButton onClick={handleAddGrocery} variant="blue">
                Add
              </ActionButton>
            </div>
            {renderTaskList(
              groceries,
              "No grocery items added yet.",
              "Complete",
              "blue"
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-3">
              <input
                value={newStudyTitle}
                onChange={(event) => setNewStudyTitle(event.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                placeholder="Study session"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  value={newStudyDuration}
                  onChange={(event) => setNewStudyDuration(event.target.value)}
                  className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                  placeholder="Minutes"
                />
                <ActionButton
                  onClick={handleAddStudy}
                  variant="purple"
                  disabled={!canAddStudy}
                >
                  Add
                </ActionButton>
              </div>
            </div>
            {renderTaskList(
              studyTasks,
              "No study sessions added yet.",
              "Complete",
              "purple"
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-3">
              <select
                value={newAgilityType}
                onChange={(event) =>
                  setNewAgilityType(event.target.value as AgilityActivityType)
                }
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              >
                <option value="Walk">Walk</option>
                <option value="Run">Run</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newAgilityDistance}
                  onChange={(event) =>
                    setNewAgilityDistance(event.target.value)
                  }
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                  placeholder="Km"
                />
                <input
                  type="number"
                  min="0"
                  value={newAgilityDuration}
                  onChange={(event) =>
                    setNewAgilityDuration(event.target.value)
                  }
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                  placeholder="Minutes"
                />
              </div>
              <ActionButton
                onClick={handleAddAgility}
                variant="green"
                disabled={!canAddAgility}
                className="w-full"
              >
                Add
              </ActionButton>
            </div>
            {renderTaskList(
              agilityTasks,
              "No agility activities added yet.",
              "Complete",
              "green"
            )}
          </div>
        </div>
      </PanelCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Strength" value="Tracks via quests" />
        <StatCard label="Vitality" value="Tracks via quests" />
        <StatCard label="Discipline" value="Boosted by consistency" />
        <StatCard label="Intelligence" value="Study and strategy quests" />
        <StatCard label="Agility" value="Cardio and movement quests" />
        <StatCard label="Magic Resistance" value="Nutrition protocol quests" />
      </div>
    </div>
  );
}


