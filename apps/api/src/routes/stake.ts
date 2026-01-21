import { Hono } from "hono"
import type { HonoEnv } from "../types"
import {
  getStakerAccount,
  getCollectionAccounts,
  getEmissionAccounts,
  getStakeRecordsByOwner,
  type StakerAccount,
  type CollectionAccount,
  type EmissionAccount,
  type StakeRecordAccount,
} from "../services/stake"

export const stakeRoutes = new Hono<HonoEnv>()

/**
 * Dandies staker account address
 * This is the main Dandies staking pool on mainnet
 */
const DANDIES_STAKER_PUBKEY = "2xc5go5vVNqYzFRg3XSPKmwT5zVmjBcNGiFeJWLqvHHi"

export type DandiesStakeResponse = {
  staker: StakerAccount | null
  collections: CollectionAccount[]
  emissions: EmissionAccount[]
}

/**
 * GET /stake/dandies
 * Returns the Dandies staker account, its collections, and their emissions
 */
stakeRoutes.get("/dandies", async (c) => {
  const staker = await getStakerAccount(c.env, DANDIES_STAKER_PUBKEY)

  if (!staker) {
    return c.json<DandiesStakeResponse>({
      staker: null,
      collections: [],
      emissions: [],
    })
  }

  const collections = await getCollectionAccounts(c.env, DANDIES_STAKER_PUBKEY)
  const emissions = await getEmissionAccounts(c.env, collections)

  return c.json<DandiesStakeResponse>({
    staker,
    collections,
    emissions,
  })
})

export type StakeRecordsResponse = {
  records: StakeRecordAccount[]
}

/**
 * GET /stake/records/:wallet
 * Returns all stake records for a given wallet owner
 */
stakeRoutes.get("/records/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const records = await getStakeRecordsByOwner(c.env, wallet)

  return c.json<StakeRecordsResponse>({
    records,
  })
})
