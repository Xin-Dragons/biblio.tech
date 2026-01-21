import { atom } from "jotai"

/**
 * Type definitions for stake data
 * These mirror the API response types from apps/api/src/routes/stake.ts
 */

export interface StakerAccount {
  address: string
  authority: string
  collections: string[]
  bump: number
}

export interface CollectionAccount {
  address: string
  staker: string
  collectionMint: string
  tokenEmission: { __option: "Some"; value: string } | { __option: "None" }
  selectionEmission: { __option: "Some"; value: string } | { __option: "None" }
  pointsEmission: { __option: "Some"; value: string } | { __option: "None" }
  distributionEmission: { __option: "Some"; value: string } | { __option: "None" }
  minStakePeriod: bigint
  bump: number
}

export interface EmissionAccount {
  address: string
  collection: string
  rewardType: { __kind: "Token" } | { __kind: "Selection" } | { __kind: "Points" } | { __kind: "Distribution" }
  tokenMint: { __option: "Some"; value: string } | { __option: "None" }
  reward: bigint[]
  stakedItems: bigint
  active: boolean
  bump: number
}

export interface StakeRecordAccount {
  address: string
  staker: string
  owner: string
  nft: string
  stakedAt: bigint
  pendingClaim: bigint
  emissions: string[]
  bump: number
}

export interface PendingReward {
  emission: string
  amount: bigint
  rewardType: string
  tokenMint: string | null
}

/**
 * Base atoms for stake data
 */
export const stakerAtom = atom<StakerAccount | null>(null)
export const collectionsAtom = atom<CollectionAccount[]>([])
export const emissionsAtom = atom<EmissionAccount[]>([])
export const userStakeRecordsAtom = atom<StakeRecordAccount[]>([])
export const pendingRewardsAtom = atom<PendingReward[]>([])

/**
 * Loading and error state atoms
 */
export const isLoadingAtom = atom(false)
export const errorAtom = atom<string | null>(null)

/**
 * Derived atom to check if a specific NFT mint is staked
 */
export const stakedMintsSetAtom = atom((get) => {
  const records = get(userStakeRecordsAtom)
  return new Set(records.map((r) => r.nft))
})

/**
 * Derived atom to get total pending rewards amount (sum of all emissions)
 */
export const totalPendingRewardsAtom = atom((get) => {
  const pending = get(pendingRewardsAtom)
  return pending.reduce((sum, p) => sum + p.amount, 0n)
})

/**
 * Derived atom to get count of staked NFTs
 */
export const stakedNftCountAtom = atom((get) => {
  return get(userStakeRecordsAtom).length
})

/**
 * Fetch stake data action - fetches Dandies staker info, collections, and emissions
 */
export const fetchStakeDataAtom = atom(null, async (_get, set) => {
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await fetch("/api/stake/dandies")
    if (!response.ok) {
      throw new Error("Failed to fetch stake data")
    }

    const data = (await response.json()) as {
      staker: StakerAccount | null
      collections: CollectionAccount[]
      emissions: EmissionAccount[]
    }

    set(stakerAtom, data.staker)
    set(collectionsAtom, data.collections)
    set(emissionsAtom, data.emissions)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

/**
 * Fetch user's stake records action
 */
export const fetchUserStakeRecordsAtom = atom(null, async (_get, set, wallet: string) => {
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await fetch(`/api/stake/records/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch stake records")
    }

    const data = (await response.json()) as {
      records: StakeRecordAccount[]
    }

    set(userStakeRecordsAtom, data.records)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

/**
 * Fetch pending rewards for a wallet
 */
export const fetchPendingRewardsAtom = atom(null, async (_get, set, wallet: string) => {
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await fetch(`/api/stake/pending/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch pending rewards")
    }

    const data = (await response.json()) as {
      pending: PendingReward[]
    }

    set(pendingRewardsAtom, data.pending)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})
