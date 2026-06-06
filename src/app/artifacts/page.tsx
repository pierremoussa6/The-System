"use client";

import { useCallback, useState } from "react";
import { useApp } from "../store";
import {
  artifactOrder,
  getActiveArtifactEffects,
  getArtifactMeta,
  getArtifactPurchaseState,
  getArtifactRarityClasses,
  getArtifactTypeLabels,
  getArtifactUnlockProgress,
  isPurchasableAvailability,
} from "../artifacts";
import type { Artifact, ArtifactActionResult } from "../types";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import CollapsibleSection from "../components/CollapsibleSection";
import ArtifactAnimationOverlay from "../components/ArtifactAnimationOverlay";

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return "No expiry";

  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function statusLabel(artifact: Artifact) {
  if (artifact.quantity > 0) return "Owned";
  if (artifact.unlocked) return "Unlocked";
  if (artifact.achievementOnly) return "Achievement only";
  if (artifact.purchaseOnly) return "Purchase only";
  return "Locked";
}

export default function ArtifactsPage() {
  const {
    isLoaded,
    artifacts,
    activeUser,
    activeEffects,
    artifactHistory,
    log,
    lifetimeXp,
    totalXp,
    spendableXp,
    activateArtifact,
    purchaseArtifact,
  } = useApp();
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [animationEvent, setAnimationEvent] =
    useState<ArtifactActionResult | null>(null);
  const dismissAnimation = useCallback(() => setAnimationEvent(null), []);

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

  const activeArtifactEffects = getActiveArtifactEffects(activeEffects);
  const orderedArtifacts = artifactOrder
    .map((key) => artifacts.find((artifact) => artifact.key === key))
    .filter((artifact): artifact is Artifact => Boolean(artifact));
  const ownedArtifacts = orderedArtifacts.filter((artifact) => artifact.quantity > 0);
  const artifactLog = log.filter((entry) => entry.type === "artifact");

  function isActivationBlocked(artifact: Artifact) {
    if (!artifact.usable || artifact.quantity <= 0) return true;
    if (artifact.passive) return true;

    return activeArtifactEffects.some(
      (effect) =>
        effect.artifactId === artifact.key &&
        (effect.status === "active" || effect.status === "unused")
    );
  }

  function handlePurchaseArtifact(artifact: Artifact) {
    const result = purchaseArtifact(artifact.key);

    if (result.ok) {
      setAnimationEvent(result);
    }
  }

  function handleActivateArtifact(artifact: Artifact) {
    const result = activateArtifact(artifact.key);

    if (result.ok) {
      setAnimationEvent(result);
    }
  }

  function renderCard(artifact: Artifact, mode: "shop" | "inventory") {
    const meta = getArtifactMeta(artifact.key);
    const styles = getArtifactRarityClasses(artifact.rarity);
    const purchaseState = activeUser
      ? getArtifactPurchaseState(activeUser, artifact.key)
      : null;
    const unlockProgress = activeUser
      ? getArtifactUnlockProgress(activeUser, artifact.key)
      : null;
    const purchasable = isPurchasableAvailability(meta.availability);
    const activationBlocked = isActivationBlocked(artifact);
    const locked = !artifact.unlocked && mode === "inventory";

    return (
      <div
        key={`${mode}-${artifact.key}`}
        className={`relative overflow-hidden rounded-lg border bg-zinc-900 p-4 ${
          locked ? "border-zinc-800 opacity-70" : styles.border
        } ${artifact.rarity === "legendary" || artifact.rarity === "one_of_a_kind" ? styles.glow : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedArtifact(artifact)}
            className="min-w-0 text-left"
          >
            <p className={`text-lg font-semibold ${locked ? "text-zinc-400" : styles.text}`}>
              {locked ? "Undiscovered Artifact" : artifact.title}
            </p>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {artifact.arcana}
            </p>
          </button>
          <span className={`rounded-full border px-2 py-1 text-xs uppercase ${styles.badge}`}>
            {artifact.rarity.replace(/_/g, " ")}
          </span>
        </div>

        <div
          className={`my-4 flex h-28 items-center justify-center rounded border border-zinc-800 bg-zinc-950 ${
            locked ? "blur-[1px]" : ""
          }`}
        >
          <div className={`text-3xl font-black tracking-widest ${locked ? "text-zinc-700" : styles.text}`}>
            {locked ? "???" : artifact.symbol}
          </div>
        </div>

        <p className="min-h-12 text-sm text-zinc-300">
          {locked ? artifact.unlockHint : artifact.effectLabel}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {getArtifactTypeLabels(artifact).map((label) => (
            <span
              key={label}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-2 text-sm text-zinc-400">
          <p>
            Status: <span className="text-zinc-100">{statusLabel(artifact)}</span>
          </p>
          <p>
            Owned quantity: <span className="text-zinc-100">x{artifact.quantity}</span>
          </p>
          {meta.xpCost !== null && (
            <p>
              Cost: <span className="text-zinc-100">{meta.xpCost} spendable XP</span>
            </p>
          )}
          {unlockProgress && (
            <p>
              Unlock: <span className="text-zinc-100">{unlockProgress.progressText}</span>
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {mode === "shop" && purchasable && (
            <ActionButton
              onClick={() => handlePurchaseArtifact(artifact)}
              variant={purchaseState?.canPurchase ? "purple" : "gray"}
              disabled={!purchaseState?.canPurchase}
            >
              {purchaseState?.canPurchase ? "Buy" : purchaseState?.statusLabel ?? "Locked"}
            </ActionButton>
          )}
          <ActionButton
            onClick={() => handleActivateArtifact(artifact)}
            variant={activationBlocked ? "gray" : "blue"}
            disabled={activationBlocked}
          >
            {artifact.passive ? "Passive" : artifact.quantity > 0 ? "Activate" : "No copy"}
          </ActionButton>
          <ActionButton onClick={() => setSelectedArtifact(artifact)} variant="gray">
            Details
          </ActionButton>
        </div>

        {purchaseState && !purchaseState.canPurchase && mode === "shop" && (
          <p className="mt-3 text-xs text-zinc-500">{purchaseState.reason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-blue-400">Artifacts</h1>

      <PanelCard className="border-cyan-500">
        <SectionTitle title="Artifact Economy" colorClass="text-cyan-400" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Lifetime XP</p>
            <p className="text-2xl text-white">{lifetimeXp ?? totalXp}</p>
            <p className="text-xs text-zinc-500">Rank and level. Never decreases.</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Spendable XP</p>
            <p className="text-2xl text-emerald-300">{spendableXp}</p>
            <p className="text-xs text-zinc-500">Artifact currency. Purchases reduce this only.</p>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
            <p className="text-sm text-zinc-400">Inventory</p>
            <p className="text-2xl text-white">{ownedArtifacts.length} / {orderedArtifacts.length}</p>
            <p className="text-xs text-zinc-500">Owned artifact types.</p>
          </div>
        </div>
      </PanelCard>

      <PanelCard className="border-yellow-500">
        <SectionTitle title="Active Effects" colorClass="text-yellow-400" />
        {activeArtifactEffects.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {activeArtifactEffects.map((effect) => {
              const meta = getArtifactMeta(effect.artifactId);

              return (
                <div
                  key={effect.id}
                  className="active-artifact-effect-card rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4"
                  data-artifact={effect.artifactId}
                >
                  <p className="font-medium text-yellow-100">{meta.title}</p>
                  <p className="mt-1 text-sm text-zinc-300">{meta.effectLabel}</p>
                  <p className="mt-2 text-sm text-yellow-200">
                    {formatRemaining(effect.expiresAt)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-400">No active artifact effects right now.</p>
        )}
      </PanelCard>

      <PanelCard className="border-purple-500">
        <SectionTitle title="Artifact Shop" colorClass="text-purple-400" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedArtifacts
            .filter((artifact) =>
              isPurchasableAvailability(getArtifactMeta(artifact.key).availability)
            )
            .map((artifact) => renderCard(artifact, "shop"))}
        </div>
      </PanelCard>

      <PanelCard className="border-blue-500">
        <SectionTitle title="Artifact Inventory" colorClass="text-blue-400" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedArtifacts.map((artifact) => renderCard(artifact, "inventory"))}
        </div>
      </PanelCard>

      <PanelCard className="border-zinc-600">
        <CollapsibleSection
          title="Artifact History / System Log"
          defaultOpen={false}
          headerClassName="text-xl font-semibold text-zinc-100"
          rightSlot={<span>{artifactLog.length + artifactHistory.length} events</span>}
        >
          <div className="space-y-3">
            {[...artifactHistory.map((entry) => ({
              id: entry.id,
              title: `${entry.eventType}: ${entry.artifactName}`,
              details: entry.details,
              date: entry.date,
            })), ...artifactLog].slice(0, 80).map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-white">{entry.title}</p>
                  <span className="text-sm text-zinc-500">{entry.date}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-300">{entry.details}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </PanelCard>

      {selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl text-white">{selectedArtifact.title}</h2>
                <p className="text-sm text-zinc-400">{selectedArtifact.arcana}</p>
              </div>
              <ActionButton onClick={() => setSelectedArtifact(null)} variant="gray">
                Close
              </ActionButton>
            </div>
            <div className="mt-4 space-y-3 text-zinc-300">
              <p>{selectedArtifact.description}</p>
              <p><span className="text-zinc-500">Ability:</span> {selectedArtifact.ability}</p>
              <p><span className="text-zinc-500">Lore:</span> {selectedArtifact.lore}</p>
              <p><span className="text-zinc-500">Unlock:</span> {selectedArtifact.unlockHint}</p>
              <p><span className="text-zinc-500">Animation:</span> {selectedArtifact.animation}</p>
            </div>
          </div>
        </div>
      )}

      <ArtifactAnimationOverlay
        event={animationEvent}
        onDone={dismissAnimation}
      />
    </div>
  );
}
