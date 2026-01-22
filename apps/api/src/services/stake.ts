/**
 * Stake Service
 * Fetches staker, collection, and emission accounts from the stake program
 *
 * Note: Uses manual RPC calls + decoders due to @solana/kit version mismatch
 * between api (v5.x) and solana-programs (v2.x)
 */

import { type Address, getBase64Encoder, getBase58Decoder, isSome } from "@solana/kit"
import { stake } from "@biblio/solana-programs"
import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

function getClient(env: Env): SolanaClient {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  return getRpc(rpcUrl)
}

export type StakerAccount = stake.Staker & { address: string }
export type CollectionAccount = stake.Collection & { address: string }
export type EmissionAccount = stake.Emission & { address: string }
export type StakeRecordAccount = stake.StakeRecord & { address: string }

/**
 * Fetches a staker account by its public key
 */
export async function getStakerAccount(env: Env, stakerPubkey: string): Promise<StakerAccount | null> {
  const rpc = getClient(env)

  const response = await rpc.getAccountInfo(stakerPubkey as Address, { encoding: "base64" }).send()

  if (!response.value) {
    return null
  }

  const [dataBase64] = response.value.data
  const data = getBase64Encoder().encode(dataBase64)
  const decoder = stake.getStakerDecoder()
  const decoded = decoder.decode(data)

  return {
    ...decoded,
    address: stakerPubkey,
  }
}

/**
 * Fetches all collection accounts for a given staker
 * The staker.collections array contains the collection PDA addresses directly
 */
export async function getCollectionAccounts(env: Env, stakerPubkey: string): Promise<CollectionAccount[]> {
  const rpc = getClient(env)

  const staker = await getStakerAccount(env, stakerPubkey)
  if (!staker || staker.collections.length === 0) {
    return []
  }

  const response = await rpc.getMultipleAccounts(staker.collections, { encoding: "base64" }).send()

  const decoder = stake.getCollectionDecoder()
  const results: CollectionAccount[] = []

  for (let i = 0; i < response.value.length; i++) {
    const account = response.value[i]
    if (account) {
      const [dataBase64] = account.data
      const data = getBase64Encoder().encode(dataBase64)
      const decoded = decoder.decode(data)
      results.push({
        ...decoded,
        address: staker.collections[i],
      })
    }
  }

  return results
}

/**
 * Fetches all stake records for a given wallet owner
 * Uses getProgramAccounts with a memcmp filter on the owner field
 *
 * StakeRecord memory layout:
 * - discriminator: 8 bytes (offset 0)
 * - staker: 32 bytes (offset 8)
 * - owner: 32 bytes (offset 40)
 */
export async function getStakeRecordsByOwner(env: Env, owner: string): Promise<StakeRecordAccount[]> {
  const rpc = getClient(env)

  const base58Decoder = getBase58Decoder()
  const discriminatorBase58 = base58Decoder.decode(stake.STAKE_RECORD_DISCRIMINATOR)

  type Base58EncodedBytes = string & {
    readonly "__brand:@solana/kit": "Base58EncodedBytes"
    readonly "__stringEncoding:@solana/kit": "base58"
  }

  const response = await rpc
    .getProgramAccounts(stake.STAKE_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        { memcmp: { offset: 0n, bytes: discriminatorBase58 as Base58EncodedBytes, encoding: "base58" } },
        { memcmp: { offset: 40n, bytes: owner as Base58EncodedBytes, encoding: "base58" } },
      ],
    })
    .send()

  const decoder = stake.getStakeRecordDecoder()
  const results: StakeRecordAccount[] = []

  for (const account of response) {
    const [dataBase64] = account.account.data
    const data = getBase64Encoder().encode(dataBase64)
    const decoded = decoder.decode(data)
    results.push({
      ...decoded,
      address: account.pubkey,
    })
  }

  return results
}

/**
 * Fetches all emission accounts for the given collections
 * Each collection can have up to 4 emission types: token, selection, points, distribution
 */
export async function getEmissionAccounts(env: Env, collections: CollectionAccount[]): Promise<EmissionAccount[]> {
  const rpc = getClient(env)

  const emissionAddresses: Address[] = []

  for (const collection of collections) {
    if (isSome(collection.tokenEmission)) {
      emissionAddresses.push(collection.tokenEmission.value)
    }
    if (isSome(collection.selectionEmission)) {
      emissionAddresses.push(collection.selectionEmission.value)
    }
    if (isSome(collection.pointsEmission)) {
      emissionAddresses.push(collection.pointsEmission.value)
    }
    if (isSome(collection.distributionEmission)) {
      emissionAddresses.push(collection.distributionEmission.value)
    }
  }

  if (emissionAddresses.length === 0) {
    return []
  }

  const response = await rpc.getMultipleAccounts(emissionAddresses, { encoding: "base64" }).send()

  const decoder = stake.getEmissionDecoder()
  const results: EmissionAccount[] = []

  for (let i = 0; i < response.value.length; i++) {
    const account = response.value[i]
    if (account) {
      const [dataBase64] = account.data
      const data = getBase64Encoder().encode(dataBase64)
      const decoded = decoder.decode(data)
      results.push({
        ...decoded,
        address: emissionAddresses[i],
      })
    }
  }

  return results
}

/**
 * Fetches emission accounts by their addresses
 */
export async function getEmissionsByAddresses(env: Env, addresses: Address[]): Promise<EmissionAccount[]> {
  if (addresses.length === 0) {
    return []
  }

  const rpc = getClient(env)
  const response = await rpc.getMultipleAccounts(addresses, { encoding: "base64" }).send()

  const decoder = stake.getEmissionDecoder()
  const results: EmissionAccount[] = []

  for (let i = 0; i < response.value.length; i++) {
    const account = response.value[i]
    if (account) {
      const [dataBase64] = account.data
      const data = getBase64Encoder().encode(dataBase64)
      const decoded = decoder.decode(data)
      results.push({
        ...decoded,
        address: addresses[i],
      })
    }
  }

  return results
}

export type PendingReward = {
  emission: string
  amount: bigint
  rewardType: string
  tokenMint: string | null
}

/**
 * Calculates pending rewards for a wallet's staked NFTs
 *
 * For each stake record:
 * 1. Get the stored pendingClaim (already accrued in on-chain state)
 * 2. Calculate additional rewards accrued since last update based on emission rate
 *
 * The reward rate is stored per second in the emission.reward array
 * Total pending = pendingClaim + (currentTime - stakedAt) * rewardRate / stakedItems
 *
 * @param stakerFilter - Optional staker address to filter records by
 */
export async function calculatePendingRewards(
  env: Env,
  wallet: string,
  stakerFilter?: string
): Promise<PendingReward[]> {
  const allRecords = await getStakeRecordsByOwner(env, wallet)
  const stakeRecords = stakerFilter ? allRecords.filter((r) => r.staker === stakerFilter) : allRecords

  if (stakeRecords.length === 0) {
    return []
  }

  const allEmissionAddresses = new Set<Address>()
  for (const record of stakeRecords) {
    for (const emission of record.emissions) {
      allEmissionAddresses.add(emission)
    }
  }

  const emissions = await getEmissionsByAddresses(env, Array.from(allEmissionAddresses))
  const emissionMap = new Map<string, EmissionAccount>()
  for (const emission of emissions) {
    emissionMap.set(emission.address, emission)
  }

  const pendingByEmission = new Map<string, bigint>()

  const currentTime = BigInt(Math.floor(Date.now() / 1000))

  for (const record of stakeRecords) {
    for (const emissionAddress of record.emissions) {
      const emission = emissionMap.get(emissionAddress)
      if (!emission || !emission.active) {
        continue
      }

      const existingPending = pendingByEmission.get(emissionAddress) ?? 0n
      let recordPending = record.pendingClaim

      if (emission.reward.length > 0) {
        const currentRate = emission.reward[0]

        const effectiveEndTime =
          isSome(emission.endTime) && emission.endTime.value < currentTime ? emission.endTime.value : currentTime
        const effectiveStartTime = record.stakedAt > emission.startTime ? record.stakedAt : emission.startTime
        const rewardDuration = effectiveEndTime - effectiveStartTime

        if (rewardDuration > 0n) {
          const additionalReward = currentRate * rewardDuration
          recordPending += additionalReward
        }
      }

      pendingByEmission.set(emissionAddress, existingPending + recordPending)
    }
  }

  const results: PendingReward[] = []
  for (const [emissionAddress, amount] of pendingByEmission) {
    const emission = emissionMap.get(emissionAddress)
    if (emission) {
      results.push({
        emission: emissionAddress,
        amount,
        rewardType: emission.rewardType.__kind,
        tokenMint: isSome(emission.tokenMint) ? emission.tokenMint.value : null,
      })
    }
  }

  return results
}
