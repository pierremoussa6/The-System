import type { Artifact, ArtifactKey, UserRecord } from "./types";

export const artifactCatalog: Record<ArtifactKey, Omit<Artifact, "quantity" | "unlocked" | "discoveredAt">> = {
  rest_day_pass: {
    key: "rest_day_pass",
    title: "Recovery Writ",
    description:
      "Converts today's daily protocol into sanctioned recovery. The streak survives, but daily XP is not awarded.",
    rarity: "common",
    effectLabel: "Protects the day as controlled recovery",
    lore: "A small permission slip from the System: recovery is still discipline when it is chosen honestly.",
    unlockHint: "Unlocked at initiation.",
    usable: true,
  },
  focus_shard: {
    key: "focus_shard",
    title: "Focus Shard",
    description:
      "A discovered fragment that marks your first real daily quest completion.",
    rarity: "common",
    effectLabel: "Proof of first contact with the daily protocol",
    lore: "The first shard is plain, but it remembers the moment repetition began.",
    unlockHint: "Complete any daily quest.",
    usable: false,
  },
  xp_rune: {
    key: "xp_rune",
    title: "Hunter's Rune: Double Claim",
    description:
      "Amplifies daily quest rewards for one day. Best used when you intend to clear the full protocol.",
    rarity: "rare",
    effectLabel: "Double daily quest XP today",
    lore: "A rune that rewards decisive days, not perfect ones.",
    unlockHint: "Reach 150 XP.",
    usable: true,
  },
  null_sigil: {
    key: "null_sigil",
    title: "Null Sigil: Mercy Seal",
    description:
      "Seals the current special quest before it can trigger consequences. No reward is granted, but the penalty is erased.",
    rarity: "rare",
    effectLabel: "Waives today's special quest penalty",
    lore: "Mercy is not weakness when it prevents a spiral.",
    unlockHint: "Complete a special quest.",
    usable: true,
  },
  discipline_core: {
    key: "discipline_core",
    title: "Discipline Core",
    description:
      "A dense core unlocked by sustained streaks. It does not need activation; it marks consistency earned.",
    rarity: "epic",
    effectLabel: "Milestone relic for a 7-day streak",
    lore: "The core is heavy because it is made from choices repeated when novelty faded.",
    unlockHint: "Reach a 7-day streak.",
    usable: false,
  },
  victory_seal: {
    key: "victory_seal",
    title: "Victory Seal",
    description:
      "A higher-order relic unlocked after enough quests and stat growth prove the player is no longer at baseline.",
    rarity: "epic",
    effectLabel: "Milestone relic for advanced progression",
    lore: "A seal pressed into the record of a player who kept returning.",
    unlockHint: "Reach 1,500 XP or 40 total stat points.",
    usable: false,
  },
  monarch_crown: {
    key: "monarch_crown",
    title: "Crown Fragment",
    description:
      "A legendary fragment hidden until the player has built a rare amount of total progress.",
    rarity: "legendary",
    effectLabel: "Legendary progression relic",
    lore: "It is not a crown yet. It is the first proof that one could exist.",
    unlockHint: "Reach 5,000 XP and 100 total stat points.",
    usable: false,
  },
};

function getTotalStatPoints(user: UserRecord) {
  return (
    user.stats.strength +
    user.stats.vitality +
    user.stats.discipline +
    user.stats.intelligence +
    user.stats.agility +
    user.stats.magicResistance
  );
}

function hasLog(user: UserRecord, type: string) {
  return user.log.some((entry) => entry.type === type);
}

export function getEligibleArtifactKeys(user: UserRecord): ArtifactKey[] {
  const totalStats = getTotalStatPoints(user);
  const keys: ArtifactKey[] = ["rest_day_pass"];

  if (hasLog(user, "daily_quest") || user.totalXp >= 20) {
    keys.push("focus_shard");
  }

  if (user.totalXp >= 150) {
    keys.push("xp_rune");
  }

  if (hasLog(user, "special_quest")) {
    keys.push("null_sigil");
  }

  if (user.streak >= 7) {
    keys.push("discipline_core");
  }

  if (user.totalXp >= 1500 || totalStats >= 40) {
    keys.push("victory_seal");
  }

  if (user.totalXp >= 5000 && totalStats >= 100) {
    keys.push("monarch_crown");
  }

  return keys;
}

export function createStarterArtifacts(): Artifact[] {
  return (Object.keys(artifactCatalog) as ArtifactKey[]).map((key) => ({
    ...artifactCatalog[key],
    quantity: key === "rest_day_pass" ? 1 : 0,
    unlocked: key === "rest_day_pass",
    discoveredAt: key === "rest_day_pass" ? new Date().toISOString() : null,
  }));
}

export function normalizeArtifacts(artifacts: Artifact[] | undefined) {
  const saved = new Map<ArtifactKey, Artifact>();

  for (const artifact of artifacts ?? []) {
    if (artifact?.key && artifactCatalog[artifact.key]) {
      saved.set(artifact.key, artifact);
    }
  }

  return createStarterArtifacts().map((fallback) => {
    const existing = saved.get(fallback.key);
    if (!existing) return fallback;

    const quantity =
      typeof existing.quantity === "number" && Number.isFinite(existing.quantity)
        ? Math.max(0, Math.round(existing.quantity))
        : fallback.quantity;
    const unlocked =
      Boolean(existing.unlocked) || quantity > 0 || fallback.unlocked;

    return {
      ...fallback,
      quantity,
      unlocked,
      discoveredAt:
        typeof existing.discoveredAt === "string"
          ? existing.discoveredAt
          : unlocked
          ? new Date().toISOString()
          : null,
    };
  });
}

export function getNewArtifactUnlocks(user: UserRecord): ArtifactKey[] {
  const artifacts = normalizeArtifacts(user.artifacts);
  const eligible = new Set(getEligibleArtifactKeys(user));

  return artifacts
    .filter((artifact) => eligible.has(artifact.key) && !artifact.unlocked)
    .map((artifact) => artifact.key);
}

export function unlockArtifacts(
  artifacts: Artifact[],
  keys: ArtifactKey[]
): Artifact[] {
  if (keys.length === 0) return normalizeArtifacts(artifacts);

  const keySet = new Set(keys);

  return normalizeArtifacts(artifacts).map((artifact) => {
    if (!keySet.has(artifact.key)) return artifact;

    return {
      ...artifact,
      quantity: artifact.quantity + 1,
      unlocked: true,
      discoveredAt: artifact.discoveredAt ?? new Date().toISOString(),
    };
  });
}

export function getArtifactMeta(key: ArtifactKey) {
  return artifactCatalog[key];
}

export function getArtifactRarityClasses(rarity: Artifact["rarity"]) {
  switch (rarity) {
    case "legendary":
      return {
        border: "border-yellow-500",
        text: "text-yellow-300",
        badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
      };
    case "epic":
      return {
        border: "border-fuchsia-500",
        text: "text-fuchsia-300",
        badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
      };
    case "rare":
      return {
        border: "border-cyan-500",
        text: "text-cyan-300",
        badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
      };
    case "common":
    default:
      return {
        border: "border-zinc-600",
        text: "text-zinc-200",
        badge: "bg-zinc-700 text-zinc-200 border-zinc-600",
      };
  }
}
