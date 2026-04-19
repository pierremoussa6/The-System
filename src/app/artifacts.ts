import type { Artifact, ArtifactKey } from "./types";

export const artifactCatalog: Record<ArtifactKey, Omit<Artifact, "quantity">> = {
  rest_day_pass: {
    key: "rest_day_pass",
    title: "Recovery Writ",
    description:
      "Converts today's daily protocol into sanctioned recovery. The streak survives, but daily XP is not awarded.",
    rarity: "rare",
    effectLabel: "Protects the day as controlled recovery",
  },
  null_sigil: {
    key: "null_sigil",
    title: "Null Sigil: Mercy Seal",
    description:
      "Seals the current special quest before it can trigger consequences. No reward is granted, but the penalty is erased.",
    rarity: "epic",
    effectLabel: "Waives today's special quest penalty",
  },
  xp_rune: {
    key: "xp_rune",
    title: "Hunter's Rune: Double Claim",
    description:
      "Amplifies daily quest rewards for one day. Best used when you intend to clear the full protocol.",
    rarity: "rare",
    effectLabel: "Double daily quest XP today",
  },
};

export function createStarterArtifacts(): Artifact[] {
  return [
    {
      ...artifactCatalog.rest_day_pass,
      quantity: 1,
    },
    {
      ...artifactCatalog.null_sigil,
      quantity: 1,
    },
    {
      ...artifactCatalog.xp_rune,
      quantity: 1,
    },
  ];
}

export function normalizeArtifacts(artifacts: Artifact[] | undefined) {
  const quantities = new Map<ArtifactKey, number>();

  for (const artifact of artifacts ?? []) {
    quantities.set(artifact.key, artifact.quantity);
  }

  return createStarterArtifacts().map((artifact) => ({
    ...artifact,
    quantity: quantities.get(artifact.key) ?? artifact.quantity,
  }));
}

export function getArtifactMeta(key: ArtifactKey) {
  return artifactCatalog[key];
}

export function getArtifactRarityClasses(rarity: Artifact["rarity"]) {
  switch (rarity) {
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
