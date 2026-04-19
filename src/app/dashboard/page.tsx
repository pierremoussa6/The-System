"use client";

import { useMemo, useState } from "react";
import { useApp } from "../store";
import {
  calculateLevel,
  getBuildFromStats,
  explainSpecialQuestChoice,
  getCompletionRate,
  getDominantStat,
  getStatTotal,
} from "../logic";
import {
  getRankLabel,
  getRankProgress,
  getSystemRank,
} from "../rank-system";
import {
  getPersonalization,
  interestCategoryLabels,
  questRotationPreferenceLabels,
} from "../quest-engine";
import {
  getAchievementSummary,
  getAchievementTierClasses,
  getRecentUnlockedAchievements,
} from "../achievements";
import type { AiWeeklyPlan } from "../types";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import StatCard from "../components/StatCard";
import ActionButton from "../components/ActionButton";

export default function DashboardPage() {
  const {
    isLoaded,
    quests,
    streak,
    totalXp,
    stats,
    specialQuest,
    completeSpecialQuest,
    acceptSpecialQuest,
    markSpecialQuestUrgent,
    penaltyNotice,
    clearPenaltyNotice,
    profile,
    activeUser,
    aiAnalysis,
    aiQuestIndex,
    aiWeeklyPlan,
    previewSpecialQuests,
    regenerateSpecialQuest,
    updateAiWeeklyPlan,
  } = useApp();

  const [isGeneratingWeeklyPlan, setIsGeneratingWeeklyPlan] = useState(false);
  const [weeklyPlanError, setWeeklyPlanError] = useState("");

  const questPreview = useMemo(() => previewSpecialQuests(), [previewSpecialQuests]);

  async function handleGenerateWeeklyPlan() {
    if (!profile || !activeUser || !aiAnalysis) return;

    setIsGeneratingWeeklyPlan(true);
    setWeeklyPlanError("");

    try {
      const response = await fetch("/api/system/weekly-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          aiAnalysis,
          stats,
          streak,
          totalXp,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate weekly plan");
      }

      const data = (await response.json()) as {
        weeklyPlan: AiWeeklyPlan;
      };

      updateAiWeeklyPlan(data.weeklyPlan);
    } catch (error) {
      console.error(error);
      setWeeklyPlanError(
        "The System failed to generate a weekly plan right now."
      );
    } finally {
      setIsGeneratingWeeklyPlan(false);
    }
  }

  if (!isLoaded || !profile || !activeUser || !specialQuest) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Dashboard</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  const { level, currentLevelXp, xpGoal, progressPercent } =
    calculateLevel(totalXp);

  const detectedBuild = getBuildFromStats(stats);
  const specialQuestReason = explainSpecialQuestChoice(profile);
  const dominantStat = getDominantStat(stats);
  const totalStatPoints = getStatTotal(stats);

  const completedDailyQuests = quests.filter((quest) => quest.completed).length;
  const totalDailyQuests = quests.length;
  const dailyCompletionPercent = getCompletionRate(
    completedDailyQuests,
    totalDailyQuests
  );

  const canAcceptSpecialQuest = specialQuest.status === "pending";
  const canMarkSpecialQuestUrgent =
    specialQuest.status !== "urgent" && !specialQuest.completed;
  const canCompleteSpecialQuest =
    !specialQuest.completed && !specialQuest.awardedToday;

  const currentRank = getSystemRank(totalXp, stats);
  const currentRankLabel = getRankLabel(currentRank);
  const rankProgress = getRankProgress(totalXp, stats);

  const achievementSummary = getAchievementSummary(activeUser);
  const recentUnlockedAchievements = getRecentUnlockedAchievements(activeUser);

  const aiQuestCount = aiAnalysis?.specialQuests?.length ?? 0;
  const displayedAiQuestIndex = aiQuestCount > 0 ? aiQuestIndex + 1 : 0;
  const personalization = aiAnalysis
    ? getPersonalization(aiAnalysis, profile)
    : null;
  const interestLabels =
    personalization?.interestCategories
      .map((category) => interestCategoryLabels[category])
      .join(", ") || "No categories inferred yet";

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Dashboard</h1>

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
        <h2 className="mb-2 text-2xl">Level {level}</h2>

        <div className="mb-4 h-4 w-full overflow-hidden rounded bg-zinc-700">
          <div
            className="h-4 rounded bg-blue-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="space-y-1">
          <p>Total XP: {totalXp}</p>
          <p>
            Level XP: {currentLevelXp} / {xpGoal}
          </p>
          <p className="text-orange-400">🔥 Streak: {streak} day(s)</p>
          <p className="text-violet-400">
            Rank: {currentRank} · {currentRankLabel}
          </p>
          <p className="text-zinc-300">
            Daily Progress: {completedDailyQuests}/{totalDailyQuests} completed
          </p>
          <p className="text-zinc-400">
            Completion Rate: {dailyCompletionPercent}%
          </p>
        </div>
      </PanelCard>

      {aiAnalysis && (
        <PanelCard className="border-sky-500">
          <SectionTitle title="System Command Center" colorClass="text-sky-400" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Hunter Classification</p>
              <p className="text-lg text-white">{aiAnalysis.archetype}</p>
              <p className="mt-2 text-zinc-300">{aiAnalysis.playerSummary}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">System Pressure</p>
              <p className="text-white">Tone: {aiAnalysis.recommendedSystemTone}</p>
              <p className="text-white">Primary Focus: {aiAnalysis.primaryFocus}</p>
              <p className="text-white">
                Rotation: {questRotationPreferenceLabels[profile.questRotationPreference]}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Active AI Quest: {displayedAiQuestIndex}/{aiQuestCount || 0}
              </p>
            </div>

            {personalization && (
              <>
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Main Job</p>
                  <p className="text-lg text-white">
                    {personalization.mainJob.title}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {personalization.mainJob.rationale}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Secondary Job</p>
                  <p className="text-lg text-white">
                    {personalization.secondaryJob.title}
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {personalization.secondaryJob.rationale}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 md:col-span-2">
                  <p className="mb-1 text-sm text-zinc-400">
                    Interest Categories
                  </p>
                  <p className="text-zinc-200">{interestLabels}</p>
                </div>
              </>
            )}

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Workout Direction</p>
              <p className="text-zinc-200">{aiAnalysis.workoutDirection}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="mb-1 text-sm text-zinc-400">Diet Direction</p>
              <p className="text-zinc-200">{aiAnalysis.dietDirection}</p>
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 md:col-span-2">
              <p className="mb-1 text-sm text-zinc-400">Weekly Strategy</p>
              <p className="text-zinc-200">{aiAnalysis.weeklyStrategy}</p>
            </div>
          </div>
        </PanelCard>
      )}

      {aiAnalysis && (
        <PanelCard className="border-indigo-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle title="Weekly Planner" colorClass="text-indigo-400" />
            <ActionButton
              onClick={handleGenerateWeeklyPlan}
              variant="blue"
              disabled={isGeneratingWeeklyPlan}
            >
              {isGeneratingWeeklyPlan ? "Generating..." : "Generate Weekly Plan"}
            </ActionButton>
          </div>

          {weeklyPlanError && (
            <p className="text-red-400">{weeklyPlanError}</p>
          )}

          {!aiWeeklyPlan ? (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <p className="text-zinc-300">
                No weekly plan generated yet. Let The System prepare your next 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">Week Objective</p>
                <p className="text-white">{aiWeeklyPlan.weekObjective}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Training Focus</p>
                  <p className="text-zinc-200">{aiWeeklyPlan.trainingFocus}</p>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Nutrition Focus</p>
                  <p className="text-zinc-200">{aiWeeklyPlan.nutritionFocus}</p>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Recovery Focus</p>
                  <p className="text-zinc-200">{aiWeeklyPlan.recoveryFocus}</p>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="mb-1 text-sm text-zinc-400">Pressure Level</p>
                  <p className="text-zinc-200">{aiWeeklyPlan.pressureLevel}</p>
                </div>
              </div>

              <div className="space-y-3">
                {aiWeeklyPlan.missions.map((mission, index) => (
                  <div
                    key={`${mission.title}-${index}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{mission.title}</p>
                      <span className="rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">
                        {mission.day}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">
                      {mission.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                <p className="mb-1 text-sm text-zinc-400">System Warning</p>
                <p className="text-zinc-200">{aiWeeklyPlan.systemWarning}</p>
              </div>
            </div>
          )}
        </PanelCard>
      )}

      <PanelCard className="border-violet-500">
        <SectionTitle title="Rank Progression" colorClass="text-violet-400" />

        <div className="space-y-2">
          <p>
            <span className="text-zinc-400">Current Rank:</span>{" "}
            <span className="text-white">
              {rankProgress.rank} · {currentRankLabel}
            </span>
          </p>

          <p>
            <span className="text-zinc-400">Rank Score:</span>{" "}
            <span className="text-white">{rankProgress.score}</span>
          </p>

          {rankProgress.nextRank ? (
            <>
              <p>
                <span className="text-zinc-400">Next Rank:</span>{" "}
                <span className="text-white">{rankProgress.nextRank}</span>
              </p>

              <div className="mt-2 h-3 w-full overflow-hidden rounded bg-zinc-700">
                <div
                  className="h-3 rounded bg-violet-500"
                  style={{ width: `${rankProgress.progressPercent}%` }}
                />
              </div>

              <p className="text-sm text-zinc-400">
                {rankProgress.remainingScore} score needed to reach{" "}
                {rankProgress.nextRank}
              </p>
              {rankProgress.remainingStats > 0 && (
                <p className="text-sm text-zinc-400">
                  {rankProgress.remainingStats} total stat point(s) also needed
                  for {rankProgress.nextRank}.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-violet-300">Maximum rank reached.</p>
          )}
        </div>
      </PanelCard>

      <PanelCard className="border-emerald-500">
        <SectionTitle title="Achievements" colorClass="text-emerald-400" />

        <div className="space-y-2">
          <p>
            <span className="text-zinc-400">Unlocked:</span>{" "}
            <span className="text-white">
              {achievementSummary.unlockedCount} / {achievementSummary.totalCount}
            </span>
          </p>

          <div className="mt-2 h-3 w-full overflow-hidden rounded bg-zinc-700">
            <div
              className="h-3 rounded bg-emerald-500"
              style={{ width: `${achievementSummary.completionPercent}%` }}
            />
          </div>

          <p className="text-sm text-zinc-400">
            Completion: {achievementSummary.completionPercent}%
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {recentUnlockedAchievements.length > 0 ? (
            recentUnlockedAchievements.map((achievement) => {
              const styles = getAchievementTierClasses(achievement.tier);

              return (
                <div
                  key={achievement.id}
                  className={`rounded-lg border bg-zinc-800 p-4 ${styles.border}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className={`font-medium ${styles.text}`}>
                      {achievement.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${styles.badge}`}
                    >
                      {achievement.tier}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {achievement.description}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 md:col-span-2">
              <p className="text-zinc-300">
                No achievements unlocked yet. Complete quests to trigger your first system milestone.
              </p>
            </div>
          )}
        </div>
      </PanelCard>

      <PanelCard className="border-cyan-500">
        <SectionTitle
          title="User Profile Intelligence"
          colorClass="text-cyan-400"
        />
        <div className="space-y-1">
          <p>
            <span className="text-zinc-400">Active User:</span>{" "}
            <span className="text-white">
              {activeUser.profile.name || "Unnamed User"}
            </span>
          </p>
          <p>
            <span className="text-zinc-400">Main Goal:</span>{" "}
            <span className="text-white">{profile.goal || "No goal set"}</span>
          </p>
          <p>
            <span className="text-zinc-400">Profession:</span>{" "}
            <span className="text-white">
              {profile.profession || personalization?.profession || "Not set"}
            </span>
          </p>
          <p>
            <span className="text-zinc-400">Hobbies:</span>{" "}
            <span className="text-white">
              {profile.hobbies ||
                personalization?.hobbies.join(", ") ||
                "Not set"}
            </span>
          </p>
          <p>
            <span className="text-zinc-400">Difficulty:</span>{" "}
            <span className="text-white">{profile.difficulty}</span>
          </p>
          <p>
            <span className="text-zinc-400">Preferred Build:</span>{" "}
            <span className="text-white">{profile.preferredBuild}</span>
          </p>
          <p>
            <span className="text-zinc-400">Detected Build:</span>{" "}
            <span className="text-white">{detectedBuild}</span>
          </p>
          <p>
            <span className="text-zinc-400">Dominant Stat:</span>{" "}
            <span className="text-white">{dominantStat}</span>
          </p>
          <p>
            <span className="text-zinc-400">Total Stat Points:</span>{" "}
            <span className="text-white">{totalStatPoints}</span>
          </p>
          <p>
            <span className="text-zinc-400">Main Improvement Area:</span>{" "}
            <span className="text-white">{profile.mainImprovementArea}</span>
          </p>
          <p>
            <span className="text-zinc-400">Study Interest:</span>{" "}
            <span className="text-white">{profile.studyInterest}</span>
          </p>
          <p>
            <span className="text-zinc-400">Quest Rotation:</span>{" "}
            <span className="text-white">
              {questRotationPreferenceLabels[profile.questRotationPreference]}
            </span>
          </p>
          {(profile.mainJobOverride || profile.secondaryJobOverride) && (
            <p>
              <span className="text-zinc-400">Identity Overrides:</span>{" "}
              <span className="text-white">
                {[profile.mainJobOverride, profile.secondaryJobOverride]
                  .filter(Boolean)
                  .join(" / ")}
              </span>
            </p>
          )}
        </div>
      </PanelCard>

      <PanelCard className="border-purple-500">
        <div className="flex items-center justify-between gap-4">
          <SectionTitle title="Special Quest" colorClass="text-purple-400" />
          <ActionButton onClick={regenerateSpecialQuest} variant="gray">
            Rotate Quest
          </ActionButton>
        </div>

        <p className="text-lg">{specialQuest.title}</p>
        <p className="text-zinc-300">{specialQuest.description}</p>
        <p className="text-sm text-zinc-400">Reward: +{specialQuest.xp} XP</p>
        <p className="text-sm text-zinc-400">Penalty: {specialQuest.penalty}</p>
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

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <p className="mb-1 text-sm text-zinc-400">Why this quest was chosen</p>
          <p className="text-zinc-200">{specialQuestReason}</p>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
          <p className="mb-1 text-sm text-zinc-400">Quest State</p>
          <p className="text-zinc-200 capitalize">{specialQuest.status}</p>
        </div>

        {aiAnalysis && aiQuestCount > 0 && (
          <div className="rounded-lg border border-sky-700 bg-sky-950/30 p-4">
            <p className="mb-1 text-sm text-sky-300">System Routing</p>
            <p className="text-sky-100">
              This quest is being served from your AI-generated hunter rotation.
            </p>
            <p className="mt-2 text-sm text-sky-300">
              Rotation slot: {displayedAiQuestIndex}/{aiQuestCount}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <ActionButton
            onClick={acceptSpecialQuest}
            disabled={!canAcceptSpecialQuest}
            variant="blue"
          >
            Accept Quest
          </ActionButton>

          <ActionButton
            onClick={markSpecialQuestUrgent}
            disabled={!canMarkSpecialQuestUrgent}
            variant="red"
          >
            Mark Urgent
          </ActionButton>

          <ActionButton
            onClick={completeSpecialQuest}
            disabled={!canCompleteSpecialQuest}
            variant={canCompleteSpecialQuest ? "purple" : "green"}
          >
            {canCompleteSpecialQuest ? "Complete Special Quest" : "Completed"}
          </ActionButton>
        </div>
      </PanelCard>

      <PanelCard className="border-yellow-500">
        <SectionTitle title="Quest Preview" colorClass="text-yellow-400" />
        <p className="text-zinc-400">
          Candidate quests that fit this user profile right now.
        </p>

        <div className="space-y-3">
          {questPreview.map((quest, index) => (
            <div
              key={quest.id}
              className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{quest.title}</p>
                {aiAnalysis && (
                  <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-1 text-xs text-sky-300">
                    {quest.jobFocus && quest.jobFocus !== "None"
                      ? quest.jobFocus
                      : `AI Quest ${index + 1}`}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-zinc-300">{quest.description}</p>
              <p className="mt-1 text-sm text-zinc-500">
                Base reward: +{quest.xp} XP
              </p>
            </div>
          ))}
        </div>
      </PanelCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Strength" value={stats.strength} />
        <StatCard label="Vitality" value={stats.vitality} />
        <StatCard label="Discipline" value={stats.discipline} />
        <StatCard label="Focus" value={stats.focus} />
      </div>
    </div>
  );
}
