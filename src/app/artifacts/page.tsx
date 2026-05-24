"use client";

import { useApp } from "../store";
import {
  getArtifactRarityClasses,
  getArtifactUnlockProgress,
} from "../artifacts";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";

export default function ArtifactsPage() {
  const {
    isLoaded,
    artifacts,
    activeUser,
    activeEffects,
    specialQuest,
    lastCompletionDate,
    log,
    activateArtifact,
  } = useApp();

  if (!isLoaded) {
    return (
      <div>
        <h1 className="mb-6 text-3xl text-blue-400">Artifacts</h1>
        <PanelCard>
          <p>Loading The System...</p>
        </PanelCard>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const latestArtifactUnlock = log.find(
    (entry) =>
      entry.type === "artifact" && entry.title.startsWith("Artifact Unlocked:")
  );

  function isDisabled(key: string, quantity: number, usable: boolean, unlocked: boolean) {
    if (!unlocked || !usable || quantity <= 0) return true;

    if (key === "xp_rune") {
      return activeEffects.doubleDailyXpDate === today;
    }

    if (key === "null_sigil") {
      return !specialQuest || specialQuest.completed || specialQuest.awardedToday;
    }

    if (key === "rest_day_pass") {
      return lastCompletionDate === today;
    }

    return false;
  }

  function getButtonText(
    key: string,
    quantity: number,
    usable: boolean,
    unlocked: boolean
  ) {
    if (!unlocked) return "Locked";
    if (!usable) return "Relic";
    if (quantity <= 0) return "Empty";

    if (key === "xp_rune" && activeEffects.doubleDailyXpDate === today) {
      return "Activated Today";
    }

    if (key === "null_sigil" && specialQuest?.completed) {
      return "Quest Already Closed";
    }

    if (key === "rest_day_pass" && lastCompletionDate === today) {
      return "Day Already Cleared";
    }

    return "Use Artifact";
  }

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-3xl text-blue-400">Artifacts</h1>

      <PanelCard className="border-cyan-500">
        <SectionTitle title="System Relics Inventory" colorClass="text-cyan-400" />
        <p className="text-zinc-300">
          Artifacts are rare consumables that can bend the normal rules of The System for a limited time.
        </p>
      </PanelCard>

      <PanelCard className="border-blue-500">
        <SectionTitle title="How to Unlock Artifacts" colorClass="text-blue-400" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="font-medium text-white">Progress sources</p>
            <p className="mt-1 text-sm text-zinc-300">
              Artifacts unlock from completed daily quests, special quests, streaks, XP, and total stat growth.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="font-medium text-white">Unlock feedback</p>
            <p className="mt-1 text-sm text-zinc-300">
              When a relic unlocks, The System records it here and in the System Log.
            </p>
          </div>
        </div>
        {latestArtifactUnlock && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">Latest unlock</p>
            <p className="font-medium text-white">{latestArtifactUnlock.title}</p>
            <p className="mt-1 text-sm text-zinc-300">
              {latestArtifactUnlock.details}
            </p>
          </div>
        )}
      </PanelCard>

      {artifacts.length === 0 ? (
        <PanelCard>
          <p>No artifacts stored.</p>
        </PanelCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {artifacts.map((artifact) => {
            const styles = getArtifactRarityClasses(artifact.rarity);
            const unlockProgress = activeUser
              ? getArtifactUnlockProgress(activeUser, artifact.key)
              : null;
            const disabled = isDisabled(
              artifact.key,
              artifact.quantity,
              artifact.usable,
              artifact.unlocked
            );

            return (
              <PanelCard
                key={artifact.key}
                className={`${artifact.unlocked ? styles.border : "border-zinc-800"} border`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={artifact.unlocked ? "" : "opacity-60"}>
                    <h2 className={`text-xl font-semibold ${styles.text}`}>
                      {artifact.unlocked ? artifact.title : "Undiscovered Artifact"}
                    </h2>
                    <p className="mt-1 text-zinc-300">
                      {artifact.unlocked
                        ? artifact.description
                        : unlockProgress?.condition ?? artifact.unlockHint}
                    </p>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${styles.badge}`}
                  >
                    {artifact.unlocked ? artifact.rarity : "locked"}
                  </span>
                </div>

                <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                  <div
                    className={`h-14 w-14 ${
                      artifact.unlocked
                        ? "rounded-full border-2 border-current"
                        : "rounded-full bg-zinc-800 blur-[1px]"
                    } ${artifact.unlocked ? styles.text : ""}`}
                  />
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-400">Effect</p>
                  <p className="text-zinc-200">
                    {artifact.unlocked ? artifact.effectLabel : "Hidden until unlocked"}
                  </p>
                  {artifact.unlocked && (
                    <p className="mt-2 text-sm text-zinc-400">{artifact.lore}</p>
                  )}
                </div>

                {unlockProgress && (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-zinc-400">Unlock condition</p>
                      <p className="text-sm text-zinc-300">
                        {unlockProgress.percent}%
                      </p>
                    </div>
                    <p className="text-sm text-zinc-200">
                      {unlockProgress.condition}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded bg-zinc-700">
                      <div
                        className="h-2 rounded bg-blue-500"
                        style={{ width: `${unlockProgress.percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      {unlockProgress.progressText}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-zinc-400">
                    Quantity: <span className="text-white">{artifact.quantity}</span>
                  </p>

                  <ActionButton
                    onClick={() => activateArtifact(artifact.key)}
                    variant={disabled ? "gray" : "purple"}
                    disabled={disabled}
                  >
                    {getButtonText(
                      artifact.key,
                      artifact.quantity,
                      artifact.usable,
                      artifact.unlocked
                    )}
                  </ActionButton>
                </div>
              </PanelCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
