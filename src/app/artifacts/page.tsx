"use client";

import { useApp } from "../store";
import { getArtifactRarityClasses } from "../artifacts";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";

export default function ArtifactsPage() {
  const {
    isLoaded,
    artifacts,
    activeEffects,
    specialQuest,
    lastCompletionDate,
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

  function isDisabled(key: string, quantity: number) {
    if (quantity <= 0) return true;

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

  function getButtonText(key: string, quantity: number) {
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

      {artifacts.length === 0 ? (
        <PanelCard>
          <p>No artifacts stored.</p>
        </PanelCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {artifacts.map((artifact) => {
            const styles = getArtifactRarityClasses(artifact.rarity);
            const disabled = isDisabled(artifact.key, artifact.quantity);

            return (
              <PanelCard
                key={artifact.key}
                className={`${styles.border} border`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className={`text-xl font-semibold ${styles.text}`}>
                      {artifact.title}
                    </h2>
                    <p className="mt-1 text-zinc-300">{artifact.description}</p>
                  </div>

                  <span
                    className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${styles.badge}`}
                  >
                    {artifact.rarity}
                  </span>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
                  <p className="text-sm text-zinc-400">Effect</p>
                  <p className="text-zinc-200">{artifact.effectLabel}</p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-zinc-400">
                    Quantity: <span className="text-white">{artifact.quantity}</span>
                  </p>

                  <ActionButton
                    onClick={() => activateArtifact(artifact.key)}
                    variant={disabled ? "gray" : "purple"}
                    disabled={disabled}
                  >
                    {getButtonText(artifact.key, artifact.quantity)}
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