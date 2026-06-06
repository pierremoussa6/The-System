import { calculateLevel } from "./logic";
import {
  getNextRank,
  getRankStatRequirement,
  getRankThreshold,
  getSystemRank,
  getTotalStatPoints,
  type SystemRank,
} from "./rank-system";
import type {
  ActiveArtifactEffect,
  ActiveEffects,
  Artifact,
  ArtifactAvailability,
  ArtifactKey,
  ArtifactKind,
  ArtifactRarity,
  UserRecord,
} from "./types";
import type { RewardBundle } from "./reward-system";
import { getTodayString } from "./system-log";

export type RewardModifierSource =
  | "daily_quest"
  | "special_quest"
  | "fun_special_activity"
  | "household_task"
  | "artifact_bonus"
  | "artifact_challenge"
  | "system";

type ArtifactDefinition = Omit<
  Artifact,
  | "quantity"
  | "unlocked"
  | "owned"
  | "discoveredAt"
  | "acquiredAt"
  | "lastUsedAt"
  | "source"
  | "status"
  | "activeUntil"
> & {
  purchaseLimit?: "none" | "unique" | "no_unused_duplicate";
  unlockRank?: SystemRank;
};

type PurchaseState = {
  canPurchase: boolean;
  reason: string;
  statusLabel: string;
  cost: number | null;
};

const nowIso = () => new Date().toISOString();

function artifact(
  key: ArtifactKey,
  input: Omit<ArtifactDefinition, "key" | "id" | "name">
): ArtifactDefinition {
  return {
    ...input,
    key,
    id: key,
    name: input.title,
  };
}

export const artifactOrder: ArtifactKey[] = [
  "fool_last_trick",
  "magician_double_cast",
  "high_priestess_hidden_prayers",
  "empress_garden_order",
  "emperor_law",
  "hierophant_key_salvation",
  "lovers_unbreakable_pact",
  "chariot_advancement",
  "strength_lion_heart",
  "hermit_lantern",
  "wheel_fortune_gamble",
  "justice_balance_scale",
  "hanged_man_rope",
  "death_transformation",
  "temperance_golden_cup",
  "devil_contract",
  "tower_ruins",
  "star_blessing",
  "moon_secret_path",
  "sun_radiance",
  "judgement_shield",
  "world_completion",
];

export const artifactCatalog: Record<ArtifactKey, ArtifactDefinition> = {
  fool_last_trick: artifact("fool_last_trick", {
    title: "The Fool's Last Trick",
    arcana: "The Fool",
    description: "A one-time impossible leap that bends rank progression.",
    symbol: "MASK",
    rarity: "one_of_a_kind",
    type: "unique",
    availability: "purchase_only",
    effectLabel: "One-time instant rank up",
    ability:
      "Activate once to advance to the next rank. Spendable XP is only used for purchase; lifetime XP and rank progress are preserved.",
    lore: "The Fool steps off the edge and lands above where the rules expected.",
    unlockHint: "Hidden until Rank D. Purchase once for 5000 spendable XP.",
    xpCost: 5000,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: false,
    stackableEffect: false,
    purchaseOnly: true,
    achievementOnly: false,
    unique: true,
    cooldownHours: null,
    animation: "Chaotic card flip, glitch shake, bright flash, rank-up reveal.",
    purchaseLimit: "unique",
    unlockRank: "D",
  }),
  magician_double_cast: artifact("magician_double_cast", {
    title: "The Magician's Double Cast",
    arcana: "The Magician",
    description: "A passive spell that doubles special-quest XP once per day.",
    symbol: "WAND",
    rarity: "rare",
    type: "passive",
    availability: "achievement_only",
    effectLabel: "Doubles Special Quest and Fun Activity XP once per day",
    ability:
      "Earned after special quest milestones. Multiple copies can exist, but only one passive effect applies.",
    lore: "A controlled second cast. The spell rewards intention, not hoarding.",
    unlockHint: "Earn after completing 5 special quests, then at later 5-quest milestones.",
    xpCost: null,
    usable: false,
    passive: true,
    active: false,
    consumable: false,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: true,
    unique: false,
    cooldownHours: 24,
    animation: "Small sparkle when bonus XP is applied.",
  }),
  high_priestess_hidden_prayers: artifact("high_priestess_hidden_prayers", {
    title: "The High Priestess' Hidden Prayers",
    arcana: "The High Priestess",
    description: "Reveals one AI-style insight from recent patterns.",
    symbol: "MOON",
    rarity: "common",
    type: "active",
    availability: "purchasable",
    effectLabel: "Unlocks one Hidden Insight reflection",
    ability:
      "Activate for a pattern insight. A follow-up reflection can reward Intelligence or Magic Resistance.",
    lore: "The quiet card does not shout. It points at the pattern you keep missing.",
    unlockHint: "Buy with 250 spendable XP.",
    xpCost: 250,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: 24,
    animation: "Soft glowing prayer reveal.",
    purchaseLimit: "no_unused_duplicate",
  }),
  empress_garden_order: artifact("empress_garden_order", {
    title: "The Empress' Garden Order",
    arcana: "The Empress",
    description: "Improves diet feedback and meal suggestions after full food logs.",
    symbol: "VINE",
    rarity: "common",
    type: "passive",
    availability: "both",
    effectLabel: "Diet-log meal suggestions and small target-hit bonuses",
    ability:
      "When a full day of food is logged, tomorrow gets a practical meal suggestion. Passive effect applies once.",
    lore: "Growth is ordered, watered, and repeated.",
    unlockHint: "Buy with 100 spendable XP or earn after 10 diet logs.",
    xpCost: 100,
    usable: false,
    passive: true,
    active: false,
    consumable: false,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Garden growth effect.",
  }),
  emperor_law: artifact("emperor_law", {
    title: "The Emperor's Law",
    arcana: "The Emperor",
    description: "Cancels today's daily quests by order and protects the streak.",
    symbol: "SEAL",
    rarity: "epic",
    type: "consumable",
    availability: "both",
    effectLabel: "Cancel today's daily quests without rewards or penalties",
    ability:
      "Marks today as cancelled by The Emperor. The streak is protected, but quests are not completed and rewards are not granted.",
    lore: "A royal seal falls. The day's obligations stop arguing.",
    unlockHint: "Buy for 500 spendable XP or earn after 20 full daily clears.",
    xpCost: 500,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Royal seal stamp over daily quests.",
  }),
  hierophant_key_salvation: artifact("hierophant_key_salvation", {
    title: "The Hierophant's Key of Salvation",
    arcana: "The Hierophant",
    description: "Opens a weekly learning or self-improvement challenge.",
    symbol: "KEY",
    rarity: "epic",
    type: "challenge",
    availability: "both",
    effectLabel: "Generates a weekly Intelligence challenge",
    ability:
      "Creates a study, reading, language, focus, hike, or self-improvement challenge with XP and Intelligence rewards.",
    lore: "The door opens only after the lesson has teeth.",
    unlockHint: "Buy with 400 spendable XP or earn every 10 study sessions.",
    xpCost: 400,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "A key unlocks a glowing door.",
  }),
  lovers_unbreakable_pact: artifact("lovers_unbreakable_pact", {
    title: "The Lovers' Unbreakable Pact",
    arcana: "The Lovers",
    description: "Creates a two-path pact quest with a meaningful reward choice.",
    symbol: "PACT",
    rarity: "rare",
    type: "challenge",
    availability: "both",
    effectLabel: "Generates a Comfort vs Growth pact quest",
    ability:
      "Choose between two paths. The selected path becomes a quest with about 400 XP and relevant stat rewards.",
    lore: "Choice is the mechanic. Loyalty is what happens after.",
    unlockHint: "Buy with 350 spendable XP or earn after 15 fun special activities.",
    xpCost: 350,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Two cards appear; chosen card glows, other fades.",
  }),
  chariot_advancement: artifact("chariot_advancement", {
    title: "The Chariot's Advancement",
    arcana: "The Chariot",
    description: "Unlocks movement and exploration activities.",
    symbol: "ROAD",
    rarity: "common",
    type: "passive",
    availability: "both",
    effectLabel: "Movement quests and small Agility bonuses",
    ability:
      "Unlocks walking, running, and exploration fun quests. Passive bonus applies once even with multiple copies.",
    lore: "Momentum is a road that appears after the first step.",
    unlockHint: "Buy with 100 spendable XP or earn after 10 agility activities.",
    xpCost: 100,
    usable: false,
    passive: true,
    active: false,
    consumable: false,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Fast motion trail.",
  }),
  strength_lion_heart: artifact("strength_lion_heart", {
    title: "Strength's Lion Heart",
    arcana: "Strength",
    description: "Boosts the next completed workout.",
    symbol: "LION",
    rarity: "epic",
    type: "active",
    availability: "both",
    effectLabel: "Lion Heart Mode for one workout session",
    ability:
      "The next completed workout gains bonus Strength and XP. The copy is consumed on activation.",
    lore: "Controlled power, not blind force.",
    unlockHint: "Buy with 700 spendable XP or earn after 8 workout sessions.",
    xpCost: 700,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: 24,
    animation: "Lion Heart glow for the next workout.",
  }),
  hermit_lantern: artifact("hermit_lantern", {
    title: "The Hermit's Lantern",
    arcana: "The Hermit",
    description: "Starts a focused study or deep-work challenge.",
    symbol: "LAMP",
    rarity: "common",
    type: "active",
    availability: "both",
    effectLabel: "Lantern Focus Mode once per day",
    ability:
      "Creates a 30+ minute study or deep-work challenge with bonus Intelligence and XP.",
    lore: "The lantern does not remove darkness. It gives you a circle to work in.",
    unlockHint: "Buy with 200 spendable XP or earn after 5 long study sessions.",
    xpCost: 200,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: 24,
    animation: "Screen darkens and lantern glows.",
  }),
  wheel_fortune_gamble: artifact("wheel_fortune_gamble", {
    title: "Wheel of Fortune's Gamble",
    arcana: "Wheel of Fortune",
    description: "Spins a once-per-day reward wheel after all daily quests are done.",
    symbol: "WHEEL",
    rarity: "epic",
    type: "active",
    availability: "purchasable",
    effectLabel: "One saved wheel spin per completed day",
    ability:
      "After daily quests are complete, spin once. The result is saved so refreshes cannot reroll it.",
    lore: "Luck is allowed in The System, but only after the work is done.",
    unlockHint: "Buy with 800 spendable XP.",
    xpCost: 800,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: 24,
    animation: "Animated spinning wheel and final reward reveal.",
  }),
  justice_balance_scale: artifact("justice_balance_scale", {
    title: "Justice's Balance Scale",
    arcana: "Justice",
    description: "Moves up to 20 points from an overgrown stat to a weak stat.",
    symbol: "SCALE",
    rarity: "epic",
    type: "active",
    availability: "purchasable",
    effectLabel: "One stat rebalance",
    ability:
      "Converts a limited number of points from the highest stat into the lowest stat. No points are created.",
    lore: "Power without balance becomes a crooked blade.",
    unlockHint: "Buy with 650 spendable XP.",
    xpCost: 650,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Scale tips, then balances.",
  }),
  hanged_man_rope: artifact("hanged_man_rope", {
    title: "The Hanged Man's Rope",
    arcana: "The Hanged Man",
    description: "Freezes the streak for one day while still taking failed-task stat loss.",
    symbol: "PAUSE",
    rarity: "common",
    type: "consumable",
    availability: "purchasable",
    effectLabel: "One-day streak freeze",
    ability:
      "Today is marked paused. The streak survives; failed daily stats can still decrease.",
    lore: "Sacrifice time, preserve the thread.",
    unlockHint: "Buy with 100 spendable XP.",
    xpCost: 100,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Suspended card with pause mark.",
  }),
  death_transformation: artifact("death_transformation", {
    title: "Death's Transformation",
    arcana: "Death",
    description: "Transforms an eligible owned weak artifact into a stronger one.",
    symbol: "ROSE",
    rarity: "epic",
    type: "active",
    availability: "achievement_only",
    effectLabel: "Random eligible artifact transformation",
    ability:
      "Consumes one Death card and attempts to transform a Common, Rare, or Epic artifact using rarity-based odds.",
    lore: "Death is not the end. It is transformation.",
    unlockHint: "Earn after a 21-day streak milestone.",
    xpCost: null,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: true,
    unique: false,
    cooldownHours: null,
    animation: "Dark smoke, cracking card, stronger reveal.",
  }),
  temperance_golden_cup: artifact("temperance_golden_cup", {
    title: "Temperance's Golden Cup",
    arcana: "Temperance",
    description: "Rewards staying inside calorie range while hitting protein.",
    symbol: "CUP",
    rarity: "common",
    type: "passive",
    availability: "both",
    effectLabel: "Diet-target balance bonus",
    ability:
      "Gives a small reward when calories stay within the goal range and protein is hit. Passive effect applies once.",
    lore: "The cup fills only when excess and scarcity stop fighting.",
    unlockHint: "Buy with 150 spendable XP or earn after 7 target-hit diet days.",
    xpCost: 150,
    usable: false,
    passive: true,
    active: false,
    consumable: false,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Golden cup fills.",
  }),
  devil_contract: artifact("devil_contract", {
    title: "The Devil's Contract",
    arcana: "The Devil",
    description: "A hard risk/reward challenge. Complete it for 1500 XP; fail for nothing.",
    symbol: "PAPER",
    rarity: "legendary",
    type: "challenge",
    availability: "purchase_only",
    effectLabel: "Hard contract challenge",
    ability:
      "Accept one difficult but realistic challenge. No refunds on failure. One unresolved copy at a time.",
    lore: "Temptation is strongest when the reward is real.",
    unlockHint: "Buy with 1000 spendable XP. Purchase only.",
    xpCost: 1000,
    usable: true,
    passive: false,
    active: true,
    consumable: false,
    stackable: false,
    stackableEffect: false,
    purchaseOnly: true,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Contract appears, dark glow, burns on completion.",
    purchaseLimit: "no_unused_duplicate",
  }),
  tower_ruins: artifact("tower_ruins", {
    title: "The Tower's Ruins",
    arcana: "The Tower",
    description: "Restores a missed streak without completing missed quests.",
    symbol: "TOWER",
    rarity: "epic",
    type: "active",
    availability: "purchase_only",
    effectLabel: "Streak recovery after a missed day",
    ability:
      "Can only be used after the streak has been missed. It restores/protects the streak but grants no missed rewards.",
    lore: "The tower falls. The foundation chooses to remain.",
    unlockHint: "Buy with 500 spendable XP. Purchase only.",
    xpCost: 500,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: false,
    stackableEffect: false,
    purchaseOnly: true,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Cracked tower shatters, then rebuilds.",
    purchaseLimit: "no_unused_duplicate",
  }),
  star_blessing: artifact("star_blessing", {
    title: "The Star's Blessing",
    arcana: "The Star",
    description: "Improves recovery, hydration, sleep, and self-care rewards.",
    symbol: "STAR",
    rarity: "common",
    type: "passive",
    availability: "both",
    effectLabel: "Recovery quest encouragement and small bonuses",
    ability:
      "Unlocks better recovery messaging and small bonuses for hydration, sleep, mobility, and self-care quests.",
    lore: "Hope is a resource too.",
    unlockHint: "Buy with 100 spendable XP or earn after 10 Vitality quests.",
    xpCost: 100,
    usable: false,
    passive: true,
    active: false,
    consumable: false,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Star glow.",
  }),
  moon_secret_path: artifact("moon_secret_path", {
    title: "The Moon's Secret Path",
    arcana: "The Moon",
    description: "Creates hidden mystery quests with partial information.",
    symbol: "PATH",
    rarity: "rare",
    type: "challenge",
    availability: "purchasable",
    effectLabel: "Mystery special quest unlock",
    ability:
      "Generates a mysterious quest that reveals its concrete task when started. Completion rewards 550 XP.",
    lore: "Not every path explains itself before you begin.",
    unlockHint: "Buy with 400 spendable XP.",
    xpCost: 400,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Moonlight reveal.",
  }),
  sun_radiance: artifact("sun_radiance", {
    title: "The Sun's Radiance",
    arcana: "The Sun",
    description: "A 24-hour x10 XP multiplier for completed quests.",
    symbol: "SUN",
    rarity: "legendary",
    type: "active",
    availability: "purchase_only",
    effectLabel: "Quest XP x10 for 24 hours",
    ability:
      "Applies x10 only to quest/task XP while active. It does not multiply wheel rewards, Devil rewards, rank-up rewards, corrections, or purchases.",
    lore: "The day becomes bright enough that every completed quest casts a longer shadow.",
    unlockHint: "Buy with 1300 spendable XP. One unused or active copy at a time.",
    xpCost: 1300,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: false,
    stackableEffect: false,
    purchaseOnly: true,
    achievementOnly: false,
    unique: false,
    cooldownHours: 24,
    animation: "Bright sunburst and visible 24-hour countdown.",
    purchaseLimit: "no_unused_duplicate",
  }),
  judgement_shield: artifact("judgement_shield", {
    title: "Judgement's Shield",
    arcana: "Judgement",
    description: "Protects the day streak for the next 7 calendar days.",
    symbol: "SHIELD",
    rarity: "legendary",
    type: "active",
    availability: "both",
    effectLabel: "7-day streak protection shield",
    ability:
      "Missed daily quests during the shield do not break the streak or create missed-day penalties. Missed quests are not completed or rewarded.",
    lore: "A trumpet sounds, then the shield holds through imperfect days.",
    unlockHint: "Buy with 1600 spendable XP or earn from major weekly review milestones.",
    xpCost: 1600,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: 168,
    animation: "Trumpet reveal and pulsing shield over the streak counter.",
  }),
  world_completion: artifact("world_completion", {
    title: "The World's Completion",
    arcana: "The World",
    description: "Starts a 30-day streak challenge for a 3000 XP completion reward.",
    symbol: "WORLD",
    rarity: "legendary",
    type: "challenge",
    availability: "purchasable",
    effectLabel: "30-day mastery challenge",
    ability:
      "Maintain the streak for 30 days after activation. Completion rewards 3000 XP; failure gives no reward.",
    lore: "The circle closes only after every day has answered.",
    unlockHint: "Buy with 1500 spendable XP.",
    xpCost: 1500,
    usable: true,
    passive: false,
    active: true,
    consumable: true,
    stackable: true,
    stackableEffect: false,
    purchaseOnly: false,
    achievementOnly: false,
    unique: false,
    cooldownHours: null,
    animation: "Full-screen circle completion reveal.",
  }),
};

const legacyArtifactMap: Partial<Record<string, ArtifactKey>> = {
  rest_day_pass: "emperor_law",
  focus_shard: "high_priestess_hidden_prayers",
  xp_rune: "sun_radiance",
  null_sigil: "hanged_man_rope",
  discipline_core: "judgement_shield",
  victory_seal: "world_completion",
  monarch_crown: "fool_last_trick",
};

export function createDefaultActiveEffects(): ActiveEffects {
  return {
    doubleDailyXpDate: null,
    artifactEffects: [],
    dailyQuestOverrides: {},
    wheelSpins: {},
    oneTimeUse: {},
    magicianDoubleCastDate: null,
  };
}

export function normalizeActiveEffects(
  effects: Partial<ActiveEffects> | undefined
): ActiveEffects {
  const fallback = createDefaultActiveEffects();
  const artifactEffects = Array.isArray(effects?.artifactEffects)
    ? effects.artifactEffects
        .filter((effect): effect is ActiveArtifactEffect =>
          Boolean(effect?.id && effect.artifactId && artifactCatalog[effect.artifactId])
        )
        .map((effect) => {
          const expiresAt =
            typeof effect.expiresAt === "string" ? effect.expiresAt : null;
          const expired =
            effect.status === "active" &&
            expiresAt &&
            new Date(expiresAt).getTime() <= Date.now();

          return {
            ...effect,
            status: expired ? ("expired" as const) : effect.status,
            metadata:
              effect.metadata && typeof effect.metadata === "object"
                ? effect.metadata
                : {},
          };
        })
    : fallback.artifactEffects;

  return {
    doubleDailyXpDate: effects?.doubleDailyXpDate ?? null,
    artifactEffects,
    dailyQuestOverrides:
      effects?.dailyQuestOverrides &&
      typeof effects.dailyQuestOverrides === "object"
        ? effects.dailyQuestOverrides
        : fallback.dailyQuestOverrides,
    wheelSpins:
      effects?.wheelSpins && typeof effects.wheelSpins === "object"
        ? effects.wheelSpins
        : fallback.wheelSpins,
    oneTimeUse:
      effects?.oneTimeUse && typeof effects.oneTimeUse === "object"
        ? effects.oneTimeUse
        : fallback.oneTimeUse,
    magicianDoubleCastDate: effects?.magicianDoubleCastDate ?? null,
  };
}

function createArtifactState(definition: ArtifactDefinition): Artifact {
  return {
    ...definition,
    quantity: 0,
    unlocked: false,
    owned: false,
    discoveredAt: null,
    acquiredAt: null,
    lastUsedAt: null,
    source: undefined,
    status: "locked",
    activeUntil: null,
  };
}

export function createStarterArtifacts(): Artifact[] {
  return artifactOrder.map((key) => createArtifactState(artifactCatalog[key]));
}

export function normalizeArtifacts(artifacts: Artifact[] | undefined) {
  const saved = new Map<ArtifactKey, Artifact>();

  for (const rawArtifact of artifacts ?? []) {
    const rawKey = rawArtifact?.key;
    const key = artifactCatalog[rawKey]
      ? rawKey
      : legacyArtifactMap[rawKey as string];

    if (!key) continue;

    const existing = saved.get(key);
    const quantity =
      typeof rawArtifact.quantity === "number" && Number.isFinite(rawArtifact.quantity)
        ? Math.max(0, Math.round(rawArtifact.quantity))
        : 0;
    const mergedQuantity = (existing?.quantity ?? 0) + quantity;
    const discoveredAt =
      typeof rawArtifact.discoveredAt === "string"
        ? rawArtifact.discoveredAt
        : existing?.discoveredAt ?? null;

    saved.set(key, {
      ...createArtifactState(artifactCatalog[key]),
      ...rawArtifact,
      key,
      id: key,
      name: artifactCatalog[key].title,
      quantity: mergedQuantity,
      discoveredAt,
    } as Artifact);
  }

  return createStarterArtifacts().map((fallback) => {
    const existing = saved.get(fallback.key);
    if (!existing) return fallback;

    const quantity =
      typeof existing.quantity === "number" && Number.isFinite(existing.quantity)
        ? Math.max(0, Math.round(existing.quantity))
        : 0;
    const unlocked = Boolean(existing.unlocked) || quantity > 0;

    return {
      ...fallback,
      quantity,
      unlocked,
      owned: unlocked || quantity > 0,
      discoveredAt:
        typeof existing.discoveredAt === "string"
          ? existing.discoveredAt
          : unlocked
          ? nowIso()
          : null,
      acquiredAt:
        typeof existing.acquiredAt === "string"
          ? existing.acquiredAt
          : unlocked
          ? nowIso()
          : null,
      lastUsedAt:
        typeof existing.lastUsedAt === "string" ? existing.lastUsedAt : null,
      source: existing.source,
      status: (
        existing.status && existing.status !== "locked"
          ? existing.status
          : quantity > 0
          ? "available"
          : unlocked
          ? "used"
          : "locked"
      ) as Artifact["status"],
      activeUntil:
        typeof existing.activeUntil === "string" ? existing.activeUntil : null,
    };
  });
}

export function getArtifactMeta(key: ArtifactKey) {
  return artifactCatalog[key];
}

export function getSpendableXp(user: Pick<UserRecord, "spendableXp" | "totalXp">) {
  if (typeof user.spendableXp === "number" && Number.isFinite(user.spendableXp)) {
    return Math.max(0, Math.round(user.spendableXp));
  }

  return Math.max(0, Math.round(user.totalXp ?? 0));
}

function userArtifact(user: UserRecord, key: ArtifactKey) {
  return normalizeArtifacts(user.artifacts).find((artifact) => artifact.key === key);
}

function hasArtifact(user: UserRecord, key: ArtifactKey) {
  return (userArtifact(user, key)?.quantity ?? 0) > 0;
}

function rankMeets(user: UserRecord, rank: SystemRank | undefined) {
  if (!rank) return true;

  const currentRank = getSystemRank(user.totalXp, user.stats);
  const currentThreshold = getRankThreshold(currentRank);
  return currentThreshold >= getRankThreshold(rank);
}

function hasBlockingActiveEffect(user: UserRecord, key: ArtifactKey) {
  const effects = normalizeActiveEffects(user.activeEffects);
  return effects.artifactEffects.some(
    (effect) =>
      effect.artifactId === key &&
      (effect.status === "unused" || effect.status === "active")
  );
}

export function getArtifactPurchaseState(
  user: UserRecord,
  key: ArtifactKey
): PurchaseState {
  const definition = artifactCatalog[key];
  const artifactState = userArtifact(user, key);
  const cost = definition.xpCost;

  if (definition.availability === "achievement_only" || cost === null) {
    return {
      canPurchase: false,
      reason: "Achievement-only artifact.",
      statusLabel: "Achievement only",
      cost,
    };
  }

  if (!rankMeets(user, definition.unlockRank)) {
    return {
      canPurchase: false,
      reason: `${definition.title} unlocks at Rank ${definition.unlockRank}.`,
      statusLabel: "Locked",
      cost,
    };
  }

  if (definition.purchaseLimit === "unique" && artifactState?.unlocked) {
    return {
      canPurchase: false,
      reason: "Unique artifact already purchased or used.",
      statusLabel: "Unique owned",
      cost,
    };
  }

  if (
    definition.purchaseLimit === "no_unused_duplicate" &&
    ((artifactState?.quantity ?? 0) > 0 || hasBlockingActiveEffect(user, key))
  ) {
    return {
      canPurchase: false,
      reason: "Use, complete, fail, or expire the current copy before buying another.",
      statusLabel: "Copy pending",
      cost,
    };
  }

  if (getSpendableXp(user) < cost) {
    return {
      canPurchase: false,
      reason: `Need ${cost} spendable XP.`,
      statusLabel: "Too expensive",
      cost,
    };
  }

  return {
    canPurchase: true,
    reason: `Buy for ${cost} spendable XP.`,
    statusLabel: definition.availability === "purchase_only" ? "Purchase only" : "Purchasable",
    cost,
  };
}

export function addArtifactCopy(
  artifacts: Artifact[],
  key: ArtifactKey,
  source: Artifact["source"] = "achievement"
): Artifact[] {
  return normalizeArtifacts(artifacts).map((artifactState) => {
    if (artifactState.key !== key) return artifactState;

    return {
      ...artifactState,
      quantity: artifactState.unique
        ? Math.min(1, artifactState.quantity + 1)
        : artifactState.quantity + 1,
      unlocked: true,
      owned: true,
      discoveredAt: artifactState.discoveredAt ?? nowIso(),
      acquiredAt: artifactState.acquiredAt ?? nowIso(),
      source,
      status: "available" as const,
    };
  });
}

export function consumeArtifactCopy(
  artifacts: Artifact[],
  key: ArtifactKey,
  status: Artifact["status"] = "used"
): Artifact[] {
  return normalizeArtifacts(artifacts).map((artifactState) => {
    if (artifactState.key !== key) return artifactState;

    return {
      ...artifactState,
      quantity: Math.max(0, artifactState.quantity - 1),
      unlocked: true,
      owned: true,
      lastUsedAt: nowIso(),
      status,
    };
  });
}

export function unlockArtifacts(
  artifacts: Artifact[],
  keys: ArtifactKey[]
): Artifact[] {
  return keys.reduce(
    (current, key) => addArtifactCopy(current, key, "achievement"),
    normalizeArtifacts(artifacts)
  );
}

function countLogs(user: UserRecord, matcher: (details: string, title: string) => boolean) {
  return user.log.filter((entry) => matcher(entry.details.toLowerCase(), entry.title.toLowerCase())).length;
}

export function getNewArtifactUnlocks(user: UserRecord): ArtifactKey[] {
  const artifacts = normalizeArtifacts(user.artifacts);
  const keys: ArtifactKey[] = [];
  const specialCompletions = countLogs(
    user,
    (details, title) =>
      title.includes("special") ||
      details.includes("special quest completed") ||
      details.includes("fun special activity completed")
  );
  const dietLogs = countLogs(user, (_details, title) => title.includes("logged"));
  const taskStudy = (user.taskHistory ?? []).filter((task) => task.kind === "study").length;
  const taskAgility = (user.taskHistory ?? []).filter((task) => task.kind === "agility").length;
  const workoutLogs = user.workoutJournal?.length ?? 0;

  const firstLocked = (key: ArtifactKey, eligible: boolean) => {
    const artifactState = artifacts.find((artifact) => artifact.key === key);
    if (eligible && artifactState && !artifactState.unlocked) keys.push(key);
  };

  firstLocked("magician_double_cast", specialCompletions >= 5);
  firstLocked("empress_garden_order", dietLogs >= 10);
  firstLocked("emperor_law", user.log.filter((entry) => entry.title === "Daily Protocol Cleared").length >= 20);
  firstLocked("hierophant_key_salvation", taskStudy >= 10);
  firstLocked("lovers_unbreakable_pact", specialCompletions >= 15);
  firstLocked("chariot_advancement", taskAgility >= 10);
  firstLocked("strength_lion_heart", workoutLogs >= 8);
  firstLocked("hermit_lantern", taskStudy >= 5);
  firstLocked("death_transformation", user.streak >= 21);
  firstLocked("temperance_golden_cup", dietLogs >= 7);
  firstLocked("star_blessing", user.stats.vitality >= 10);

  return keys;
}

function progress(current: number, target: number) {
  return {
    current,
    target,
    percent:
      target <= 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((current / target) * 100))),
  };
}

export function getArtifactUnlockProgress(user: UserRecord, key: ArtifactKey) {
  const definition = artifactCatalog[key];
  const totalStats = getTotalStatPoints(user.stats);
  const specialCompletions = user.log.filter((entry) =>
    entry.details.toLowerCase().includes("special")
  ).length;
  const taskStudy = (user.taskHistory ?? []).filter((task) => task.kind === "study").length;
  const taskAgility = (user.taskHistory ?? []).filter((task) => task.kind === "agility").length;
  const workoutLogs = user.workoutJournal?.length ?? 0;
  const lifetimeXp = user.totalXp;

  switch (key) {
    case "fool_last_trick": {
      const rankOk = rankMeets(user, "D");
      return {
        condition: definition.unlockHint,
        progressText: rankOk ? "Rank D reached." : "Reach Rank D.",
        ...progress(rankOk ? 1 : 0, 1),
      };
    }
    case "magician_double_cast":
      return {
        condition: definition.unlockHint,
        progressText: `Special completions: ${specialCompletions}/5`,
        ...progress(specialCompletions, 5),
      };
    case "empress_garden_order":
      return {
        condition: definition.unlockHint,
        progressText: `Food logs: ${user.foodJournal?.length ?? 0}/10`,
        ...progress(user.foodJournal?.length ?? 0, 10),
      };
    case "emperor_law":
      return {
        condition: definition.unlockHint,
        progressText: `Daily clears: ${
          user.log.filter((entry) => entry.title === "Daily Protocol Cleared").length
        }/20`,
        ...progress(
          user.log.filter((entry) => entry.title === "Daily Protocol Cleared").length,
          20
        ),
      };
    case "hierophant_key_salvation":
      return {
        condition: definition.unlockHint,
        progressText: `Study sessions: ${taskStudy}/10`,
        ...progress(taskStudy, 10),
      };
    case "lovers_unbreakable_pact":
      return {
        condition: definition.unlockHint,
        progressText: `Special/fun completions: ${specialCompletions}/15`,
        ...progress(specialCompletions, 15),
      };
    case "chariot_advancement":
      return {
        condition: definition.unlockHint,
        progressText: `Agility activities: ${taskAgility}/10`,
        ...progress(taskAgility, 10),
      };
    case "strength_lion_heart":
      return {
        condition: definition.unlockHint,
        progressText: `Workout logs: ${workoutLogs}/8`,
        ...progress(workoutLogs, 8),
      };
    case "hermit_lantern":
      return {
        condition: definition.unlockHint,
        progressText: `Study sessions: ${taskStudy}/5`,
        ...progress(taskStudy, 5),
      };
    case "death_transformation":
      return {
        condition: definition.unlockHint,
        progressText: `Current streak: ${user.streak}/21`,
        ...progress(user.streak, 21),
      };
    case "temperance_golden_cup":
      return {
        condition: definition.unlockHint,
        progressText: `Food logs: ${user.foodJournal?.length ?? 0}/7`,
        ...progress(user.foodJournal?.length ?? 0, 7),
      };
    case "star_blessing":
      return {
        condition: definition.unlockHint,
        progressText: `Vitality: ${user.stats.vitality}/10`,
        ...progress(user.stats.vitality, 10),
      };
    default:
      return {
        condition: definition.unlockHint,
        progressText:
          definition.xpCost !== null
            ? `Spendable XP: ${getSpendableXp(user)}/${definition.xpCost}`
            : `Lifetime XP: ${lifetimeXp}, total stats: ${totalStats}`,
        ...progress(
          definition.xpCost !== null ? getSpendableXp(user) : 1,
          definition.xpCost ?? 1
        ),
      };
  }
}

export function isArtifactEffectActive(
  effects: ActiveEffects,
  artifactId: ArtifactKey,
  at = new Date()
) {
  return normalizeActiveEffects(effects).artifactEffects.some((effect) => {
    if (effect.artifactId !== artifactId || effect.status !== "active") {
      return false;
    }

    if (!effect.expiresAt) return true;
    return new Date(effect.expiresAt).getTime() > at.getTime();
  });
}

export function getActiveArtifactEffects(effects: ActiveEffects) {
  return normalizeActiveEffects(effects).artifactEffects.filter((effect) => {
    if (effect.status !== "active" && effect.status !== "unused") return false;
    if (!effect.expiresAt) return true;
    return new Date(effect.expiresAt).getTime() > Date.now();
  });
}

export function getDailyQuestOverride(
  effects: ActiveEffects,
  dateString = getTodayString()
) {
  return normalizeActiveEffects(effects).dailyQuestOverrides[dateString] ?? null;
}

export function createActiveArtifactEffect(
  artifactId: ArtifactKey,
  effectType: string,
  expiresAt: string | null,
  metadata: Record<string, unknown> = {}
): ActiveArtifactEffect {
  const createdAt = nowIso();
  return {
    id: `${artifactId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    artifactId,
    effectType,
    status: "active",
    startsAt: createdAt,
    expiresAt,
    metadata,
    createdAt,
    updatedAt: createdAt,
  };
}

export function getNextRankUpRequirements(user: UserRecord) {
  const currentRank = getSystemRank(user.totalXp, user.stats);
  const nextRank = getNextRank(currentRank);

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      lifetimeXpNeeded: 0,
      statPointsNeeded: 0,
    };
  }

  const requiredLevel = getRankThreshold(nextRank);
  const currentLevel = calculateLevel(user.totalXp).level;
  let lifetimeXpNeeded = 0;
  let simulatedXp = user.totalXp;

  while (calculateLevel(simulatedXp).level < requiredLevel) {
    simulatedXp += 25;
  }

  lifetimeXpNeeded =
    currentLevel >= requiredLevel ? 0 : Math.max(0, simulatedXp - user.totalXp);

  return {
    currentRank,
    nextRank,
    lifetimeXpNeeded,
    statPointsNeeded: Math.max(
      0,
      getRankStatRequirement(nextRank) - getTotalStatPoints(user.stats)
    ),
  };
}

export function applyArtifactRewardModifiers(
  user: UserRecord,
  reward: RewardBundle,
  source: RewardModifierSource,
  title: string
) {
  let xp = reward.xp;
  const statRewards = { ...reward.statRewards };
  let activeEffects = normalizeActiveEffects(user.activeEffects);
  const logs: string[] = [];
  const today = getTodayString();
  const sunApplies =
    source === "daily_quest" ||
    source === "special_quest" ||
    source === "fun_special_activity" ||
    source === "household_task";

  if (sunApplies && isArtifactEffectActive(activeEffects, "sun_radiance")) {
    xp *= 10;
    logs.push(`The Sun's Radiance boosted ${title} to ${xp} XP.`);
  }

  const magicianApplies =
    (source === "special_quest" || source === "fun_special_activity") &&
    hasArtifact(user, "magician_double_cast") &&
    activeEffects.magicianDoubleCastDate !== today;

  if (magicianApplies) {
    xp *= 2;
    activeEffects = {
      ...activeEffects,
      magicianDoubleCastDate: today,
    };
    logs.push("The Magician casts again. XP doubled.");
  }

  return {
    reward: {
      xp,
      statRewards,
    },
    activeEffects,
    logs,
  };
}

export function getArtifactRarityClasses(rarity: ArtifactRarity) {
  switch (rarity) {
    case "one_of_a_kind":
      return {
        border: "border-white",
        text: "text-white",
        badge: "bg-white/15 text-white border-white/40",
        glow: "shadow-[0_0_30px_rgba(255,255,255,0.25)]",
      };
    case "legendary":
      return {
        border: "border-yellow-500",
        text: "text-yellow-300",
        badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
        glow: "shadow-[0_0_24px_rgba(234,179,8,0.22)]",
      };
    case "epic":
      return {
        border: "border-fuchsia-500",
        text: "text-fuchsia-300",
        badge: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
        glow: "shadow-[0_0_18px_rgba(217,70,239,0.16)]",
      };
    case "rare":
      return {
        border: "border-cyan-500",
        text: "text-cyan-300",
        badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
        glow: "shadow-[0_0_14px_rgba(6,182,212,0.12)]",
      };
    case "common":
    default:
      return {
        border: "border-zinc-600",
        text: "text-zinc-200",
        badge: "bg-zinc-700 text-zinc-200 border-zinc-600",
        glow: "",
      };
  }
}

export function getArtifactTypeLabels(artifactState: Artifact) {
  const labels: string[] = [];

  labels.push(artifactState.type);
  if (artifactState.purchaseOnly) labels.push("purchase only");
  if (artifactState.achievementOnly) labels.push("achievement only");
  if (artifactState.unique) labels.push("unique");
  if (artifactState.stackable) labels.push("stackable");
  if (artifactState.passive && !artifactState.stackableEffect) {
    labels.push("effect x1");
  }

  return labels;
}

export function isPurchasableAvailability(availability: ArtifactAvailability) {
  return (
    availability === "purchasable" ||
    availability === "both" ||
    availability === "purchase_only"
  );
}

export function artifactKindLabel(kind: ArtifactKind) {
  return kind.replace("_", " ");
}
