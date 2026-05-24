import type { Stats } from "./types";

export type RewardBundle = {
  xp: number;
  statRewards: Partial<Stats>;
};

export const statLabels: Record<keyof Stats, string> = {
  strength: "Strength",
  vitality: "Vitality",
  discipline: "Discipline",
  intelligence: "Intelligence",
  agility: "Agility",
  magicResistance: "Magic Resistance",
};

export function normalizeRewardNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}

export function hasPositiveStatRewards(rewards: Partial<Stats>) {
  return Object.values(rewards).some(
    (value) => typeof value === "number" && value > 0
  );
}

export function addStatRewards(
  currentStats: Stats,
  rewards: Partial<Stats>
): Stats {
  return {
    strength: currentStats.strength + normalizeRewardNumber(rewards.strength),
    vitality: currentStats.vitality + normalizeRewardNumber(rewards.vitality),
    discipline:
      currentStats.discipline + normalizeRewardNumber(rewards.discipline),
    intelligence:
      currentStats.intelligence + normalizeRewardNumber(rewards.intelligence),
    agility: currentStats.agility + normalizeRewardNumber(rewards.agility),
    magicResistance:
      currentStats.magicResistance +
      normalizeRewardNumber(rewards.magicResistance),
  };
}

export function formatStatRewards(rewards: Partial<Stats>) {
  return (Object.keys(statLabels) as Array<keyof Stats>)
    .map((key) => {
      const value = normalizeRewardNumber(rewards[key]);
      return value > 0 ? `+${value} ${statLabels[key]}` : "";
    })
    .filter(Boolean)
    .join(" / ");
}

export function formatRewardText(reward: RewardBundle) {
  const statText = formatStatRewards(reward.statRewards);

  return statText ? `+${reward.xp} XP / ${statText}` : `+${reward.xp} XP`;
}
