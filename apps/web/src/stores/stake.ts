import { atom } from "jotai"

/**
 * Converts string values in an object back to BigInt where expected
 * The API serializes BigInt as strings for JSON compatibility
 */
function parseBigInts<T>(obj: T, bigIntFields: string[]): T {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => parseBigInts(item, bigIntFields)) as T
  }

  const result = { ...obj } as Record<string, unknown>
  for (const key of Object.keys(result)) {
    const value = result[key]
    if (bigIntFields.includes(key) && typeof value === "string") {
      result[key] = BigInt(value)
    } else if (bigIntFields.includes(key) && Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === "string" ? BigInt(v) : v))
    } else if (typeof value === "object" && value !== null) {
      result[key] = parseBigInts(value, bigIntFields)
    }
  }
  return result as T
}

/**
 * Type definitions for stake data
 * These mirror the API response types from apps/api/src/routes/stake.ts
 */

export interface StakerAccount {
  address: string
  authority: string
  collections: string[]
  tokenMint: { __option: "Some"; value: string } | { __option: "None" }
  bump: number
  nftAuthBump: number
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
  nftMint: string
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
 * Extracts all emission addresses from a collection account
 */
export function getEmissionAddresses(collection: CollectionAccount): string[] {
  const emissions: string[] = []
  if (collection.tokenEmission.__option === "Some") emissions.push(collection.tokenEmission.value)
  if (collection.selectionEmission.__option === "Some") emissions.push(collection.selectionEmission.value)
  if (collection.pointsEmission.__option === "Some") emissions.push(collection.pointsEmission.value)
  if (collection.distributionEmission.__option === "Some") emissions.push(collection.distributionEmission.value)
  return emissions
}

/**
 * Derived atom to check if a specific NFT mint is staked
 */
export const stakedMintsSetAtom = atom((get) => {
  const records = get(userStakeRecordsAtom)
  return new Set(records.map((r) => r.nftMint))
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

    const bigIntFields = ["minStakePeriod", "reward", "stakedItems"]
    set(stakerAtom, data.staker)
    set(collectionsAtom, parseBigInts(data.collections, bigIntFields))
    set(emissionsAtom, parseBigInts(data.emissions, bigIntFields))
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

/**
 * Fetch user's stake records action
 * @param params.wallet - The wallet address to fetch records for
 * @param params.silent - If true, don't set loading state (for background refreshes)
 */
export const fetchUserStakeRecordsAtom = atom(
  null,
  async (_get, set, params: string | { wallet: string; silent?: boolean }) => {
    const wallet = typeof params === "string" ? params : params.wallet
    const silent = typeof params === "object" && params.silent

    if (!silent) {
      set(isLoadingAtom, true)
    }
    set(errorAtom, null)

    try {
      const response = await fetch(`/api/stake/records/${wallet}`)
      if (!response.ok) {
        throw new Error("Failed to fetch stake records")
      }

      const data = (await response.json()) as {
        records: StakeRecordAccount[]
      }

      const bigIntFields = ["stakedAt", "pendingClaim"]
      set(userStakeRecordsAtom, parseBigInts(data.records, bigIntFields))
    } catch (err) {
      set(errorAtom, err instanceof Error ? err.message : "Unknown error")
    } finally {
      if (!silent) {
        set(isLoadingAtom, false)
      }
    }
  }
)

/**
 * Fetch pending rewards for a wallet
 * @param params.wallet - The wallet address to fetch rewards for
 * @param params.silent - If true, don't set loading state (for background refreshes)
 */
export const fetchPendingRewardsAtom = atom(
  null,
  async (_get, set, params: string | { wallet: string; silent?: boolean }) => {
    const wallet = typeof params === "string" ? params : params.wallet
    const silent = typeof params === "object" && params.silent

    if (!silent) {
      set(isLoadingAtom, true)
    }
    set(errorAtom, null)

    try {
      const response = await fetch(`/api/stake/pending/${wallet}`)
      if (!response.ok) {
        throw new Error("Failed to fetch pending rewards")
      }

      const data = (await response.json()) as {
        pending: PendingReward[]
      }

      const bigIntFields = ["amount"]
      set(pendingRewardsAtom, parseBigInts(data.pending, bigIntFields))
    } catch (err) {
      set(errorAtom, err instanceof Error ? err.message : "Unknown error")
    } finally {
      if (!silent) {
        set(isLoadingAtom, false)
      }
    }
  }
)

/**
 * Optimistic update: Add a stake record when staking succeeds
 */
export const addStakeRecordAtom = atom(
  null,
  (
    get,
    set,
    params: {
      nftMint: string
      owner: string
      staker: string
      emissions: string[]
    }
  ) => {
    const records = get(userStakeRecordsAtom)
    const newRecord: StakeRecordAccount = {
      address: `optimistic-${params.nftMint}`,
      staker: params.staker,
      owner: params.owner,
      nftMint: params.nftMint,
      stakedAt: BigInt(Math.floor(Date.now() / 1000)),
      pendingClaim: 0n,
      emissions: params.emissions,
      bump: 0,
    }
    set(userStakeRecordsAtom, [...records, newRecord])
  }
)

/**
 * Optimistic update: Remove a stake record when unstaking succeeds
 */
export const removeStakeRecordAtom = atom(null, (get, set, nftMint: string) => {
  const records = get(userStakeRecordsAtom)
  set(
    userStakeRecordsAtom,
    records.filter((r) => r.nftMint !== nftMint)
  )
})

/**
 * Optimistic update: Clear pending rewards after claiming
 */
export const clearPendingRewardsAtom = atom(null, (_get, set) => {
  set(pendingRewardsAtom, [])
})
