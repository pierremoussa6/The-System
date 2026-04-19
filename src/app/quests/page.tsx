"use client";

import { useApp } from "../store";
import { calculateLevel } from "../logic";
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
  } = useApp();

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

  function getQuestRewardText(questId: number) {
    const quest = quests.find((q) => q.id === questId);
    const xp = quest?.xp ?? 0;

    switch (questId) {
      case 1:
        return `+${xp} XP • +2 Strength`;
      case 2:
        return `+${xp} XP • +2 Vitality`;
      case 3:
        return `+${xp} XP • +1 Vitality`;
      default:
        return "";
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-blue-400">Quests</h1>

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
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Strength" value="Tracks via quests" />
        <StatCard label="Vitality" value="Tracks via quests" />
        <StatCard label="Discipline" value="Boosted by consistency" />
        <StatCard label="Focus" value="Boosted by special quests" />
      </div>
    </div>
  );
}