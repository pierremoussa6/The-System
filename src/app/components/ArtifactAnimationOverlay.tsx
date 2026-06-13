"use client";

import Image from "next/image";
import { useEffect, type CSSProperties } from "react";
import { getArtifactMeta, getArtifactRarityClasses } from "../artifacts";
import { getMediaForTarget } from "../creator-media";
import type { ArtifactActionResult, CreatorMediaItem, Stats } from "../types";
import ActionButton from "./ActionButton";

type ArtifactAnimationOverlayProps = {
  event: ArtifactActionResult | null;
  mediaLibrary?: CreatorMediaItem[];
  userId?: string | null;
  onDone: () => void;
};

type WheelSpinReveal = {
  outcome: string;
  xp: number;
  statRewards: Partial<Stats>;
  spunAt: string;
};

const wheelAngles: Record<string, number> = {
  "+100 XP": 22,
  "+200 XP": 67,
  "+2 random stat points": 112,
  "+10 random stat points": 157,
  "No bonus": 202,
  "+500 XP": 247,
  "+800 XP": 292,
  "Jackpot +2000 XP": 337,
};

function getText(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function getNumber(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getWheelSpin(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.wheelSpin;

  if (!value || typeof value !== "object") return null;

  const spin = value as Partial<WheelSpinReveal>;
  if (typeof spin.outcome !== "string") return null;

  return {
    outcome: spin.outcome,
    xp: typeof spin.xp === "number" ? spin.xp : 0,
    statRewards: spin.statRewards ?? {},
    spunAt: typeof spin.spunAt === "string" ? spin.spunAt : "",
  };
}

function statRewardText(statRewards: Partial<Stats>) {
  const entries = Object.entries(statRewards).filter(([, value]) => Number(value) > 0);

  if (entries.length === 0) return "";

  return entries
    .map(([stat, value]) => `+${value} ${stat.replace(/([A-Z])/g, " $1").toLowerCase()}`)
    .join(", ");
}

function renderArtifactScene(event: ArtifactActionResult) {
  const meta = getArtifactMeta(event.artifactId);
  const styles = getArtifactRarityClasses(meta.rarity);
  const wheelSpin = getWheelSpin(event.metadata);
  const wheelEnd = wheelSpin
    ? 1440 + (360 - (wheelAngles[wheelSpin.outcome] ?? 0))
    : 1440;

  const baseCard = (
    <div className={`artifact-animation-card ${styles.border}`}>
      <span className={`artifact-animation-symbol ${styles.text}`}>{meta.symbol}</span>
      <span className="artifact-animation-card-title">{meta.arcana}</span>
    </div>
  );

  switch (event.artifactId) {
    case "fool_last_trick":
      return (
        <div className="artifact-scene artifact-fool-scene">
          <div className="artifact-fool-flash" />
          {baseCard}
          <div className="artifact-rank-reveal">
            Rank {getText(event.metadata, "currentRank") ?? "?"} -&gt;{" "}
            {getText(event.metadata, "nextRank") ?? "Max"}
          </div>
        </div>
      );

    case "emperor_law":
      return (
        <div className="artifact-scene artifact-emperor-scene">
          <div className="artifact-quest-list">
            <span>Daily Quest I</span>
            <span>Daily Quest II</span>
            <span>Daily Quest III</span>
          </div>
          <div className="artifact-emperor-stamp">CANCELLED BY ORDER</div>
        </div>
      );

    case "wheel_fortune_gamble":
      return (
        <div className="artifact-scene artifact-wheel-scene">
          <div className="artifact-wheel-pointer" />
          <div
            className="artifact-wheel"
            style={
              {
                "--artifact-wheel-end": `${wheelEnd}deg`,
              } as CSSProperties
            }
          >
            <span>100</span>
            <span>200</span>
            <span>STAT</span>
            <span>10 STAT</span>
            <span>NONE</span>
            <span>500</span>
            <span>800</span>
            <span>JACKPOT</span>
          </div>
          <div className="artifact-wheel-result">
            {wheelSpin ? wheelSpin.outcome : "Saved result revealed"}
          </div>
        </div>
      );

    case "death_transformation":
      return (
        <div className="artifact-scene artifact-death-scene">
          <div className="artifact-transform-card artifact-transform-source">
            {getText(event.metadata, "target") ?? "Weak card"}
          </div>
          <div className="artifact-transform-smoke" />
          <div className="artifact-transform-card artifact-transform-target">
            {getText(event.metadata, "transformedInto") ?? "No transform"}
          </div>
        </div>
      );

    case "devil_contract":
      return (
        <div className="artifact-scene artifact-devil-scene">
          <div className="artifact-contract">
            <span>CONTRACT</span>
            <p>Risk accepted. Reward must be earned.</p>
          </div>
        </div>
      );

    case "tower_ruins":
      return (
        <div className="artifact-scene artifact-tower-scene">
          <div className="artifact-tower">
            <span />
            <span />
            <span />
          </div>
          <div className="artifact-tower-glow">Streak restored</div>
        </div>
      );

    case "sun_radiance":
      return (
        <div className="artifact-scene artifact-sun-scene">
          <div className="artifact-sunburst" />
          <div className="artifact-sun-core">x{getNumber(event.metadata, "multiplier") ?? 10}</div>
          <div className="artifact-countdown-card">24-hour quest XP boost</div>
        </div>
      );

    case "judgement_shield":
      return (
        <div className="artifact-scene artifact-judgement-scene">
          <div className="artifact-trumpet">TRUMPET</div>
          <div className="artifact-shield">SHIELD</div>
          <div className="artifact-countdown-card">7-day streak protection</div>
        </div>
      );

    case "world_completion":
      return (
        <div className="artifact-scene artifact-world-scene">
          <div className="artifact-world-ring" />
          <div className="artifact-world-core">30 days</div>
        </div>
      );

    case "lovers_unbreakable_pact":
      return (
        <div className="artifact-scene artifact-lovers-scene">
          <div className="artifact-pact-card artifact-pact-chosen">Comfort</div>
          <div className="artifact-pact-card artifact-pact-faded">Growth</div>
        </div>
      );

    case "justice_balance_scale":
      return (
        <div className="artifact-scene artifact-justice-scene">
          <div className="artifact-scale">
            <span>{getText(event.metadata, "from") ?? "high stat"}</span>
            <span>{getText(event.metadata, "to") ?? "low stat"}</span>
          </div>
          <div className="artifact-scale-note">
            {getNumber(event.metadata, "amount") ?? 0} point rebalance
          </div>
        </div>
      );

    default:
      return (
        <div className="artifact-scene artifact-generic-scene">
          {baseCard}
          <div className="artifact-generic-ripple" />
        </div>
      );
  }
}

function renderRewardReveal(event: ArtifactActionResult) {
  const wheelSpin = getWheelSpin(event.metadata);
  const statText = wheelSpin ? statRewardText(wheelSpin.statRewards) : "";

  if (wheelSpin) {
    return (
      <p className="text-sm text-zinc-300">
        Saved wheel result: {wheelSpin.outcome}
        {wheelSpin.xp > 0 ? `, +${wheelSpin.xp} XP` : ""}
        {statText ? `, ${statText}` : ""}.
      </p>
    );
  }

  const expiresAt = getText(event.metadata, "expiresAt");
  if (expiresAt) {
    return <p className="text-sm text-zinc-300">Effect persists until {expiresAt}.</p>;
  }

  return null;
}

export default function ArtifactAnimationOverlay({
  event,
  mediaLibrary,
  userId,
  onDone,
}: ArtifactAnimationOverlayProps) {
  useEffect(() => {
    if (!event) return;

    const duration = event.artifactId === "wheel_fortune_gamble" ? 5600 : 4200;
    const timeout = window.setTimeout(onDone, duration);

    return () => window.clearTimeout(timeout);
  }, [event, onDone]);

  if (!event) return null;

  const meta = getArtifactMeta(event.artifactId);
  const activationMedia = getMediaForTarget(
    mediaLibrary,
    event.eventType === "purchase" ? "artifact_reward" : "artifact_activation",
    event.artifactId,
    userId
  );

  return (
    <div className="artifact-animation-overlay" role="status" aria-live="polite">
      <button
        type="button"
        className="artifact-animation-backdrop"
        onClick={onDone}
        aria-label="Dismiss artifact animation"
      />
      <div className={`artifact-animation-shell artifact-animation--${event.artifactId}`}>
        <div className="artifact-animation-orbit" />
        <div className="relative z-10 space-y-5 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">
              {event.eventType === "purchase" ? "Artifact acquired" : "Artifact activated"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              {meta.title}
            </h2>
          </div>

          {renderArtifactScene(event)}

          {activationMedia && (
            <div className="relative mx-auto h-40 w-full max-w-md overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
              {activationMedia.fileType.startsWith("video/") ? (
                <video
                  src={activationMedia.fileUrl}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  loop
                  autoPlay
                />
              ) : (
                <Image
                  src={activationMedia.fileUrl}
                  alt={activationMedia.altText || activationMedia.title || meta.title}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 448px, 100vw"
                  className="object-cover"
                />
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-lg text-white">{event.message}</p>
            {renderRewardReveal(event)}
          </div>

          <div className="flex justify-center">
            <ActionButton onClick={onDone} variant="gray">
              Dismiss
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
