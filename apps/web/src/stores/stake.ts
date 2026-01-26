import { atom } from "jotai"
import { isSome, type Option } from "@solana/kit"

/**
 * Converts string values in an object back to BigInt where expected
 * The API serializes BigInt as strings for JSON compatibility.
 * Handles plain bigint fields, bigint arrays, and Option<bigint> wrappers.
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
    } else if (bigIntFields.includes(key) && typeof value === "object" && value !== null && "__option" in value) {
      const opt = value as { __option: string; value?: unknown }
      if (opt.__option === "Some" && typeof opt.value === "string") {
        result[key] = { __option: "Some", value: BigInt(opt.value) }
      }
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
  tokenMint: Option<string>
  bump: number
  nftAuthBump: number
}

export interface CollectionAccount {
  address: string
  staker: string
  collectionMint: string
  tokenEmission: Option<string>
  selectionEmission: Option<string>
  pointsEmission: Option<string>
  distributionEmission: Option<string>
  minStakePeriod: bigint
  bump: number
}

export interface EmissionAccount {
  address: string
  collection: string
  rewardType: { __kind: "Token" } | { __kind: "Selection" } | { __kind: "Points" } | { __kind: "Distribution" }
  tokenMint: Option<string>
  reward: bigint[]
  startTime: bigint
  endTime: Option<bigint>
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

/**
 * Base atoms for stake data (staker config, collections, emissions)
 * These are needed for building stake/unstake transactions
 */
export const stakerAtom = atom<StakerAccount | null>(null)
export const collectionsAtom = atom<CollectionAccount[]>([])
export const emissionsAtom = atom<EmissionAccount[]>([])

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
  if (isSome(collection.tokenEmission)) emissions.push(collection.tokenEmission.value)
  if (isSome(collection.selectionEmission)) emissions.push(collection.selectionEmission.value)
  if (isSome(collection.pointsEmission)) emissions.push(collection.pointsEmission.value)
  if (isSome(collection.distributionEmission)) emissions.push(collection.distributionEmission.value)
  return emissions
}

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

    const bigIntFields = ["minStakePeriod", "reward", "stakedItems", "startTime", "endTime"]
    set(stakerAtom, data.staker)
    set(collectionsAtom, parseBigInts(data.collections, bigIntFields))
    set(emissionsAtom, parseBigInts(data.emissions, bigIntFields))
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})
