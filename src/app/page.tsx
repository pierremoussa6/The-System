"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "./store";
import {
  calculateLevel,
  getCompletionRate,
  getDominantStat,
  getStatTotal,
} from "./logic";
import { getPersonalization } from "./quest-engine";
import { getSystemRank, getRankLabel } from "./rank-system";
import {
  getAchievementSummary,
  getRecentUnlockedAchievements,
  getAchievementTierClasses,
} from "./achievements";
import PanelCard from "./components/PanelCard";
import SectionTitle from "./components/SectionTitle";
import ActionButton from "./components/ActionButton";
import StatCard from "./components/StatCard";

export default function HomePage() {
  const {
    isLoaded,
    activeUser,
    profile,
    totalXp,
    streak,
    stats,
    quests,
    specialQuest,
    aiAnalysis,
    aiWeeklyPlan,
    artifacts,
    activeEffects,
    dailyHp,
  } = useApp();

  const achievementSummary = useMemo(() => {
    if (!activeUser) {
      return {
        unlockedCount: 0,
        totalCount: 0,
        completionPercent: 0,
      };
    }

    return getAchievementSummary(activeUser);
  }, [activeUser]);

  const recentAchievements = useMemo(() => {
    if (!activeUser) return [];
    return getRecentUnlockedAchievements(activeUser).slice(0, 3);
  }, [activeUser]);

  if (!isLoaded || !activeUser || !profile || !specialQuest) {
    return (
      <main className="space-y-6">
        <h1 className="text-4xl font-bold text-blue-400">The System</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </main>
    );
  }

  const { level, currentLevelXp, xpGoal, progressPercent } =
    calculateLevel(totalXp);

  const rank = getSystemRank(totalXp, stats);
  const rankLabel = getRankLabel(rank);
  const dominantStat = getDominantStat(stats);
  const totalStatPoints = getStatTotal(stats);

  const completedQuests = quests.filter((quest) => quest.completed).length;
  const dailyCompletionPercent = getCompletionRate(
    completedQuests,
    quests.length
  );

  const artifactCount = artifacts.reduce(
    (sum, artifact) => sum + artifact.quantity,
    0
  );

  const today = new Date().toISOString().split("T")[0];
  const activeRune = activeEffects.doubleDailyXpDate === today;

  const mainRecommendation = aiWeeklyPlan
    ? aiWeeklyPlan.weekObjective
    : aiAnalysis
    ? aiAnalysis.weeklyStrategy
    : "Complete your profile setup so The System can generate your doctrine.";

  const secondaryRecommendation = aiWeeklyPlan
    ? aiWeeklyPlan.systemWarning
    : aiAnalysis
    ? aiAnalysis.playerSummary
    : "No system analysis has been generated yet.";
  const personalization = aiAnalysis ? getPersonalization(aiAnalysis, profile) : null;
  const recoveryModeActive = typeof dailyHp === "number" && dailyHp < 50;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-blue-400">The System</h1>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Central command for your hunter profile, rank progression, active
            protocol, and system-issued recommendations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <ActionButton variant="blue">Open Dashboard</ActionButton>
          </Link>
          <Link href="/quests">
            <ActionButton variant="gray">Open Quests</ActionButton>
          </Link>
          <Link href="/artifacts">
            <ActionButton variant="purple">Artifacts</ActionButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <PanelCard className="border-blue-500">
            <SectionTitle
              title="Hunter Summary"
              colorClass="text-blue-400"
              subtitle="Your real-time command summary."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Username
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {profile.name || "Unnamed User"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Rank
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {rank} · {rankLabel}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Main Job
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {personalization?.mainJob.title || profile.profession || "Unset"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Secondary Job
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {personalization?.secondaryJob.title || "Adventurer"}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Level
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {level}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Streak
                </p>
                <p className="mt-2 text-2xl font-semibold text-orange-400">
                  🔥 {streak} day(s)
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  HP Today
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {dailyHp ?? "Unset"}
                  {typeof dailyHp === "number" ? " / 100" : ""}
                </p>
                {recoveryModeActive && (
                  <p className="mt-2 text-sm text-emerald-300">
                    Recovery mode active. Special quest cancelled.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  XP Progress
                </p>
                <p className="text-sm text-zinc-300">
                  {currentLevelXp} / {xpGoal}
                </p>
              </div>

              <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-4 rounded-full bg-blue-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-zinc-300">Total XP: {totalXp}</p>
            </div>
          </PanelCard>

          <PanelCard className="border-cyan-500">
            <SectionTitle
              title="System Recommendation"
              colorClass="text-cyan-400"
              subtitle="Current guidance based on your profile and weekly doctrine."
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
                <p className="text-white">{mainRecommendation}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  System Note
                </p>
                <p className="mt-2 text-zinc-300">{secondaryRecommendation}</p>
              </div>

              {aiWeeklyPlan && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm uppercase tracking-wide text-zinc-400">
                      Training Focus
                    </p>
                    <p className="mt-2 text-zinc-200">
                      {aiWeeklyPlan.trainingFocus}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <p className="text-sm uppercase tracking-wide text-zinc-400">
                      Nutrition Focus
                    </p>
                    <p className="mt-2 text-zinc-200">
                      {aiWeeklyPlan.nutritionFocus}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </PanelCard>

          <PanelCard className="border-purple-500">
            <SectionTitle
              title="Active Special Quest"
              colorClass="text-purple-400"
              subtitle="Current system-issued priority quest."
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xl font-semibold text-white">
                  {specialQuest.title}
                </p>
                <p className="mt-2 text-zinc-300">{specialQuest.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm uppercase tracking-wide text-zinc-400">
                    Reward
                  </p>
                  <p className="mt-2 text-white">+{specialQuest.xp} XP</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm uppercase tracking-wide text-zinc-400">
                    Status
                  </p>
                  <p className="mt-2 capitalize text-white">
                    {specialQuest.status}
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-sm uppercase tracking-wide text-zinc-400">
                    Penalty
                  </p>
                  <p className="mt-2 text-zinc-300">{specialQuest.penalty}</p>
                  {specialQuest.penaltyAction && (
                    <p className="mt-2 text-sm text-red-300">
                      {specialQuest.penaltyAction.category.replace(/_/g, " ")} /{" "}
                      {specialQuest.penaltyAction.intensity}
                      {specialQuest.penaltyAction.amountSek
                        ? ` / ${specialQuest.penaltyAction.amountSek} SEK savings`
                        : ""}
                    </p>
                  )}
                </div>
              </div>

              <Link href="/dashboard">
                <ActionButton variant="purple">Manage Special Quest</ActionButton>
              </Link>
            </div>
          </PanelCard>

          <PanelCard className="border-emerald-500">
            <SectionTitle
              title="Current Attributes"
              colorClass="text-emerald-400"
              subtitle="Live character state from your real progression."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StatCard label="Strength" value={stats.strength} />
              <StatCard label="Vitality" value={stats.vitality} />
              <StatCard label="Discipline" value={stats.discipline} />
              <StatCard label="Intelligence" value={stats.intelligence} />
              <StatCard label="Agility" value={stats.agility} />
              <StatCard label="Magic Resistance" value={stats.magicResistance} />
            </div>
          </PanelCard>
        </div>

        <div className="space-y-6">
          <PanelCard className="border-yellow-500">
            <SectionTitle
              title="Titles and Badges"
              colorClass="text-yellow-400"
              subtitle="Recently unlocked achievements."
            />

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Progress
                </p>
                <p className="mt-2 text-white">
                  {achievementSummary.unlockedCount} /{" "}
                  {achievementSummary.totalCount}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {achievementSummary.completionPercent}% unlocked
                </p>
              </div>

              {recentAchievements.length > 0 ? (
                recentAchievements.map((achievement) => {
                  const styles = getAchievementTierClasses(achievement.tier);

                  return (
                    <div
                      key={achievement.id}
                      className={`rounded-2xl border bg-zinc-900 p-5 ${styles.border}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className={`font-semibold ${styles.text}`}>
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
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                  <p className="text-zinc-300">
                    No titles or badges unlocked yet.
                  </p>
                </div>
              )}

              <Link href="/progress">
                <ActionButton variant="gray">Open Progress</ActionButton>
              </Link>
            </div>
          </PanelCard>

          <PanelCard className="border-fuchsia-500">
            <SectionTitle
              title="Artifact Vault"
              colorClass="text-fuchsia-400"
              subtitle="Stored consumables and active system effects."
            />

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Stored Artifacts
                </p>
                <p className="mt-2 text-white">{artifactCount}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Active Effect
                </p>
                <p className="mt-2 text-zinc-200">
                  {activeRune
                    ? "XP Rune is active today"
                    : "No artifact effect currently active"}
                </p>
              </div>

              <Link href="/artifacts">
                <ActionButton variant="purple">Open Artifact Vault</ActionButton>
              </Link>
            </div>
          </PanelCard>

          <PanelCard className="border-indigo-500">
            <SectionTitle
              title="Quick Overview"
              colorClass="text-indigo-400"
              subtitle="Useful live system markers."
            />

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Dominant Stat
                </p>
                <p className="mt-2 text-white">{dominantStat}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Total Stat Points
                </p>
                <p className="mt-2 text-white">{totalStatPoints}</p>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Daily Quest Completion
                </p>
                <p className="mt-2 text-white">
                  {completedQuests} / {quests.length}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {dailyCompletionPercent}% complete
                </p>
              </div>
            </div>
          </PanelCard>

          <PanelCard className="border-zinc-700">
            <SectionTitle
              title="Quick Access"
              colorClass="text-zinc-200"
              subtitle="Jump directly into active systems."
            />

            <div className="grid grid-cols-1 gap-3">
              <Link href="/dashboard">
                <ActionButton variant="blue">Dashboard</ActionButton>
              </Link>

              <Link href="/quests">
                <ActionButton variant="gray">Quests</ActionButton>
              </Link>

              <Link href="/workout">
                <ActionButton variant="gray">Workout</ActionButton>
              </Link>

              <Link href="/diet">
                <ActionButton variant="gray">Diet</ActionButton>
              </Link>

              <Link href="/system-log">
                <ActionButton variant="gray">System Log</ActionButton>
              </Link>
            </div>
          </PanelCard>
        </div>
      </div>
    </main>
  );
}

