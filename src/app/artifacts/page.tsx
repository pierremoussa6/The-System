"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "../store";
import {
  artifactOrder,
  getActiveArtifactEffects,
  getArtifactMeta,
  getArtifactPurchaseState,
  getArtifactRarityClasses,
  getArtifactTypeLabels,
  getArtifactUnlockProgress,
  getWorldChallengeSummary,
  isPurchasableAvailability,
} from "../artifacts";
import type { Artifact, ArtifactActionResult, Stats } from "../types";
import { getMediaForTarget } from "../creator-media";
import PanelCard from "../components/PanelCard";
import SectionTitle from "../components/SectionTitle";
import ActionButton from "../components/ActionButton";
import CollapsibleSection from "../components/CollapsibleSection";
import ArtifactAnimationOverlay from "../components/ArtifactAnimationOverlay";

type ArtifactFilter =
  | "all"
  | "owned"
  | "not_owned"
  | "active"
  | "common"
  | "rare"
  | "epic"
  | "legendary"
  | "fool";

type JusticeDraft = {
  from: keyof Stats;
  to: keyof Stats;
  amount: number;
};

const statKeys: Array<keyof Stats> = [
  "strength",
  "vitality",
  "discipline",
  "intelligence",
  "agility",
  "magicResistance",
];

const statLabels: Record<keyof Stats, string> = {
  strength: "Strength",
  vitality: "Vitality",
  discipline: "Discipline",
  intelligence: "Intelligence",
  agility: "Agility",
  magicResistance: "Magic Resistance",
};

const artifactFilters: Array<{ key: ArtifactFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "owned", label: "Owned" },
  { key: "not_owned", label: "Not owned" },
  { key: "active", label: "Active" },
  { key: "common", label: "Common" },
  { key: "rare", label: "Rare" },
  { key: "epic", label: "Epic" },
  { key: "legendary", label: "Legendary" },
  { key: "fool", label: "The Fool" },
];

function formatRemaining(expiresAt: string | null, nowMs: number | null) {
  if (!expiresAt) return "No expiry";
  if (!nowMs) return "Calculating...";

  const remainingMs = new Date(expiresAt).getTime() - nowMs;
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

function getStrongestStat(stats: Stats): keyof Stats {
  return [...statKeys].sort((a, b) => stats[b] - stats[a])[0];
}

function getWeakestDifferentStat(
  stats: Stats,
  from: keyof Stats
): keyof Stats {
  return [...statKeys]
    .filter((key) => key !== from)
    .sort((a, b) => stats[a] - stats[b])[0];
}

function clampJusticeAmount(value: number, max: number) {
  if (max <= 0) return 0;
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(max, Math.floor(value)));
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
    mediaLibrary,
    activateArtifact,
    purchaseArtifact,
  } = useApp();
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [artifactFilter, setArtifactFilter] = useState<ArtifactFilter>("all");
  const [justiceDraft, setJusticeDraft] = useState<JusticeDraft | null>(null);
  const [animationEvent, setAnimationEvent] =
    useState<ArtifactActionResult | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const dismissAnimation = useCallback(() => setAnimationEvent(null), []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

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
  const activeArtifactIds = new Set(
    activeArtifactEffects.map((effect) => effect.artifactId)
  );

  function matchesFilter(artifact: Artifact) {
    switch (artifactFilter) {
      case "owned":
        return artifact.quantity > 0;
      case "not_owned":
        return artifact.quantity <= 0;
      case "active":
        return activeArtifactIds.has(artifact.key);
      case "common":
      case "rare":
      case "epic":
      case "legendary":
        return artifact.rarity === artifactFilter;
      case "fool":
        return artifact.key === "fool_last_trick";
      case "all":
      default:
        return true;
    }
  }

  const shopArtifacts = orderedArtifacts.filter(
    (artifact) =>
      isPurchasableAvailability(getArtifactMeta(artifact.key).availability) &&
      matchesFilter(artifact)
  );
  const inventoryArtifacts = orderedArtifacts.filter(
    (artifact) =>
      (artifact.quantity > 0 || artifact.unlocked) && matchesFilter(artifact)
  );

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
    if (artifact.key === "justice_balance_scale") {
      if (!activeUser) return;

      const from = getStrongestStat(activeUser.stats);
      const to = getWeakestDifferentStat(activeUser.stats, from);
      setJusticeDraft({
        from,
        to,
        amount: clampJusticeAmount(1, Math.min(20, activeUser.stats[from])),
      });
      setSelectedArtifact(null);
      return;
    }

    const result = activateArtifact(artifact.key);

    if (result.ok) {
      setAnimationEvent(result);
    }
  }

  function updateJusticeFrom(from: keyof Stats) {
    if (!activeUser) return;

    const to =
      justiceDraft?.to && justiceDraft.to !== from
        ? justiceDraft.to
        : getWeakestDifferentStat(activeUser.stats, from);
    const maxAmount = Math.min(20, activeUser.stats[from]);

    setJusticeDraft({
      from,
      to,
      amount: clampJusticeAmount(justiceDraft?.amount ?? 1, maxAmount),
    });
  }

  function updateJusticeTo(to: keyof Stats) {
    if (!activeUser || !justiceDraft) return;

    setJusticeDraft({
      ...justiceDraft,
      to,
    });
  }

  function updateJusticeAmount(amount: number) {
    if (!activeUser || !justiceDraft) return;

    const maxAmount = Math.min(20, activeUser.stats[justiceDraft.from]);
    setJusticeDraft({
      ...justiceDraft,
      amount: clampJusticeAmount(amount, maxAmount),
    });
  }

  function confirmJusticeRebalance() {
    if (!justiceDraft) return;

    const result = activateArtifact("justice_balance_scale", {
      justiceRebalance: justiceDraft,
    });

    if (result.ok) {
      setAnimationEvent(result);
      setJusticeDraft(null);
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
    const cardMedia = activeUser
      ? getMediaForTarget(
          mediaLibrary,
          "artifact_card",
          artifact.key,
          activeUser.id
        )
      : null;

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
          className={`relative my-4 flex h-28 items-center justify-center rounded border border-zinc-800 bg-zinc-950 ${
            locked ? "blur-[1px]" : ""
          }`}
        >
          {!locked && cardMedia ? (
            cardMedia.fileType.startsWith("video/") ? (
              <video
                src={cardMedia.fileUrl}
                className="h-full w-full rounded object-cover"
                muted
                playsInline
                loop
                autoPlay
              />
            ) : (
              <Image
                src={cardMedia.fileUrl}
                alt={cardMedia.altText || artifact.title}
                fill
                unoptimized
                sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="rounded object-cover"
              />
            )
          ) : (
            <div className={`text-5xl font-black ${locked ? "text-zinc-700" : styles.text}`}>
              {locked ? "???" : artifact.symbol}
            </div>
          )}
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

  const justiceMaxAmount =
    justiceDraft && activeUser
      ? Math.min(20, activeUser.stats[justiceDraft.from])
      : 0;
  const justiceInvalid =
    !justiceDraft ||
    !activeUser ||
    justiceDraft.from === justiceDraft.to ||
    justiceDraft.amount <= 0 ||
    justiceDraft.amount > justiceMaxAmount;

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

      <PanelCard className="border-zinc-700">
        <SectionTitle title="Artifact Filters" colorClass="text-zinc-200" />
        <div className="flex flex-wrap gap-2">
          {artifactFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setArtifactFilter(filter.key)}
              className={`rounded-full border px-3 py-2 text-sm ${
                artifactFilter === filter.key
                  ? "border-blue-400 bg-blue-500/20 text-blue-100"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {filter.label}
            </button>
          ))}
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
                  {effect.artifactId === "world_completion" && (
                    <div className="mt-3">
                      {(() => {
                        const summary = getWorldChallengeSummary(effect);
                        const percent =
                          summary.requiredProgress > 0
                            ? Math.round(
                                (summary.currentProgress /
                                  summary.requiredProgress) *
                                  100
                              )
                            : 0;

                        return (
                          <>
                            <div className="h-2 overflow-hidden rounded bg-zinc-800">
                              <div
                                className="h-full rounded bg-emerald-400"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <p className="mt-1 text-sm text-emerald-200">
                              {summary.currentProgress}/{summary.requiredProgress} streak days counted
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="mt-2 text-sm text-yellow-200">
                    {formatRemaining(effect.expiresAt, nowMs)}
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
          {shopArtifacts.map((artifact) => renderCard(artifact, "shop"))}
        </div>
        {shopArtifacts.length === 0 && (
          <p className="text-sm text-zinc-400">
            No shop artifacts match this filter.
          </p>
        )}
      </PanelCard>

      <PanelCard className="border-blue-500">
        <SectionTitle title="Artifact Inventory" colorClass="text-blue-400" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventoryArtifacts.map((artifact) => renderCard(artifact, "inventory"))}
        </div>
        {inventoryArtifacts.length === 0 && (
          <p className="text-sm text-zinc-400">
            No owned or unlocked artifacts match this filter.
          </p>
        )}
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

      {justiceDraft && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg border border-fuchsia-500/50 bg-zinc-950 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl text-white">Justice&apos;s Balance Scale</h2>
                <p className="text-sm text-zinc-400">
                  Choose exactly which stat points to move. Max 20 points per use.
                </p>
              </div>
              <ActionButton onClick={() => setJusticeDraft(null)} variant="gray">
                Close
              </ActionButton>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm text-zinc-300">
                Move points from
                <select
                  value={justiceDraft.from}
                  onChange={(event) =>
                    updateJusticeFrom(event.target.value as keyof Stats)
                  }
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {statKeys.map((key) => (
                    <option key={key} value={key}>
                      {statLabels[key]} ({activeUser.stats[key]})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-zinc-300">
                Move points to
                <select
                  value={justiceDraft.to}
                  onChange={(event) =>
                    updateJusticeTo(event.target.value as keyof Stats)
                  }
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  {statKeys.map((key) => (
                    <option key={key} value={key} disabled={key === justiceDraft.from}>
                      {statLabels[key]} ({activeUser.stats[key]})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-zinc-300">
                Amount to move
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, justiceMaxAmount)}
                  value={Math.max(1, justiceDraft.amount)}
                  onChange={(event) =>
                    updateJusticeAmount(Number(event.target.value))
                  }
                  disabled={justiceMaxAmount <= 0}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-300">
                  {justiceMaxAmount > 0 ? (
                    <p>
                      Preview: move{" "}
                      <span className="text-white">{justiceDraft.amount}</span>{" "}
                      point(s) from{" "}
                      <span className="text-white">
                        {statLabels[justiceDraft.from]}
                      </span>{" "}
                      to{" "}
                      <span className="text-white">
                        {statLabels[justiceDraft.to]}
                      </span>
                      .
                    </p>
                  ) : (
                    <p>The selected source stat has no points to move.</p>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, justiceMaxAmount)}
                  value={justiceDraft.amount}
                  onChange={(event) =>
                    updateJusticeAmount(Number(event.target.value))
                  }
                  disabled={justiceMaxAmount <= 0}
                  className="rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                />
              </div>

              {justiceDraft.from === justiceDraft.to && (
                <p className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  Choose two different stats. Justice cannot move points into the same stat.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <ActionButton
                  onClick={confirmJusticeRebalance}
                  variant={justiceInvalid ? "gray" : "purple"}
                  disabled={justiceInvalid}
                >
                  Activate Justice
                </ActionButton>
                <ActionButton onClick={() => setJusticeDraft(null)} variant="gray">
                  Cancel
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <ArtifactAnimationOverlay
        event={animationEvent}
        mediaLibrary={mediaLibrary}
        userId={activeUser?.id ?? null}
        onDone={dismissAnimation}
      />
    </div>
  );
}
