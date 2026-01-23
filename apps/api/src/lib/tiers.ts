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

export const BASE_FEES = {
  nftSuite: {
    create: 0.01,
    update: 0.002,
    batch: 0.002,
  },
  tokenTool: {
    create: 0.05,
    update: 0.025,
  },
  biblio: {
    send: 0.002,
    burnNft: 0.002,
    burnFt: 0.0002,
    cleanup: 0.0002,
    basicLock: 0.05,
    secureLock: 0.1,
  },
} as const

type NftSuiteOperation = keyof typeof BASE_FEES.nftSuite
type TokenToolOperation = keyof typeof BASE_FEES.tokenTool
type BiblioOperation = keyof typeof BASE_FEES.biblio
export type Operation =
  | `nftSuite.${NftSuiteOperation}`
  | `tokenTool.${TokenToolOperation}`
  | `biblio.${BiblioOperation}`

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

export function getFeeForOperation(operation: Operation, tier: Tier): number {
  if (tier === Tier.Diamond) return 0

  const [category, op] = operation.split(".") as [keyof typeof BASE_FEES, string]
  const categoryFees = BASE_FEES[category]
  const baseFee = categoryFees[op as keyof typeof categoryFees] as number
  const discount = FEE_DISCOUNTS[tier]

  return baseFee * (1 - discount)
}
