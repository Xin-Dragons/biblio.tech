export enum Tier {
  Free = "Free",
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Diamond = "Diamond",
}

export const TIER_THRESHOLDS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 1,
  [Tier.Silver]: 5,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 50,
}

export const VOTES_PER_DAY: Record<Tier, number> = {
  [Tier.Free]: 1,
  [Tier.Bronze]: 3,
  [Tier.Silver]: 7,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 25,
}

export const FEE_DISCOUNTS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 0.25,
  [Tier.Silver]: 0.5,
  [Tier.Gold]: 0.75,
  [Tier.Diamond]: 1,
}

export function getTierFromStakedCount(count: number): Tier {
  if (count >= TIER_THRESHOLDS[Tier.Diamond]) return Tier.Diamond
  if (count >= TIER_THRESHOLDS[Tier.Gold]) return Tier.Gold
  if (count >= TIER_THRESHOLDS[Tier.Silver]) return Tier.Silver
  if (count >= TIER_THRESHOLDS[Tier.Bronze]) return Tier.Bronze
  return Tier.Free
}

export function getVotesForTier(tier: Tier): number {
  return VOTES_PER_DAY[tier]
}
