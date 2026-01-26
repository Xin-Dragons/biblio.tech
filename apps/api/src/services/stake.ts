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
 * Fetches a stake record by NFT mint address
 * Uses getProgramAccounts with memcmp filter on the nftMint field
 *
 * StakeRecord memory layout:
 * - discriminator: 8 bytes (offset 0)
 * - staker: 32 bytes (offset 8)
 * - owner: 32 bytes (offset 40)
 * - nftMint: 32 bytes (offset 72)
 */
export async function getStakeRecordByNftMint(env: Env, nftMint: string): Promise<StakeRecordAccount | null> {
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
        { memcmp: { offset: 72n, bytes: nftMint as Base58EncodedBytes, encoding: "base58" } },
      ],
    })
    .send()

  if (response.length === 0) {
    return null
  }

  const [dataBase64] = response[0].account.data
  const data = getBase64Encoder().encode(dataBase64)
  const decoder = stake.getStakeRecordDecoder()
  const decoded = decoder.decode(data)

  return {
    ...decoded,
    address: response[0].pubkey,
  }
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
