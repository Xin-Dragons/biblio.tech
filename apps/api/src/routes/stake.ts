import { Hono } from "hono"
import type { HonoEnv } from "../types"
import {
  getStakerAccount,
  getCollectionAccounts,
  getEmissionAccounts,
  getStakeRecordsByOwner,
  getStakeRecordByNftMint,
  type StakerAccount,
  type CollectionAccount,
  type EmissionAccount,
  type StakeRecordAccount,
} from "../services/stake"
import { stringifyBigInts } from "../lib/json"

export const stakeRoutes = new Hono<HonoEnv>()

const DANDIES_STAKER_PUBKEY = "6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a"

export type DandiesStakeResponse = {
  staker: StakerAccount | null
  collections: CollectionAccount[]
  emissions: EmissionAccount[]
}

export type StakeRecord = {
  nftMint: string
}

function getConfigDO(env: HonoEnv["Bindings"]) {
  const id = env.STAKER_SETTINGS_DO.idFromName(DANDIES_STAKER_PUBKEY)
  return env.STAKER_SETTINGS_DO.get(id)
}

/**
 * Fetches fresh staker config from RPC and caches in DO
 */
async function refreshConfig(env: HonoEnv["Bindings"]): Promise<DandiesStakeResponse> {
  const staker = await getStakerAccount(env, DANDIES_STAKER_PUBKEY)
  if (!staker) {
    return { staker: null, collections: [], emissions: [] }
  }

  const collections = await getCollectionAccounts(env, DANDIES_STAKER_PUBKEY)
  const emissions = await getEmissionAccounts(env, collections)

  const data: DandiesStakeResponse = { staker, collections, emissions }
  const serialized = stringifyBigInts(data)

  const stub = getConfigDO(env)
  await stub.fetch(
    new Request("http://do/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staker: JSON.stringify(serialized.staker),
        collections: JSON.stringify(serialized.collections),
        emissions: JSON.stringify(serialized.emissions),
      }),
    })
  )

  return data
}

export async function getCachedStakeRecords(env: HonoEnv["Bindings"], wallet: string): Promise<StakeRecord[]> {
  try {
    const id = env.STAKE_RECORD_CACHE_DO.idFromName(DANDIES_STAKER_PUBKEY)
    const stub = env.STAKE_RECORD_CACHE_DO.get(id)
    const res = await stub.fetch(new Request(`http://do/records?owner=${wallet}`))
    if (!res.ok) throw new Error(`DO returned ${res.status}`)
    return (await res.json<{ records: StakeRecord[] }>()).records
  } catch (err) {
    console.error("[getCachedStakeRecords] DO failed, falling back to RPC:", err)
    const allRecords = await getStakeRecordsByOwner(env, wallet)
    const records = allRecords.filter((r) => r.staker === DANDIES_STAKER_PUBKEY)
    return records.map((r) => ({ nftMint: r.nftMint }))
  }
}

/**
 * GET /stake/dandies
 * Returns the Dandies staker account, its collections, and their emissions
 * Uses stale-while-revalidate caching via StakerSettingsDO
 */
/**
 * GET /stake/record/:mint
 * Fetches a stake record by NFT mint address
 */
stakeRoutes.get("/record/:mint", async (c) => {
  const mint = c.req.param("mint")

  const record = await getStakeRecordByNftMint(c.env, mint)

  if (!record) {
    return c.json({ error: "Stake record not found" }, 404)
  }

  return c.json(stringifyBigInts(record))
})

/**
 * GET /stake/dandies
 * Returns the Dandies staker account, its collections, and their emissions
 * Uses stale-while-revalidate caching via StakerSettingsDO
 */
stakeRoutes.get("/dandies", async (c) => {
  const stub = getConfigDO(c.env)
  const cacheRes = await stub.fetch(new Request("http://do/config"))
  const cached = await cacheRes.json<{
    cached: boolean
    stale?: boolean
    staker?: StakerAccount | null
    collections?: CollectionAccount[]
    emissions?: EmissionAccount[]
  }>()

  if (cached.cached && !cached.stale) {
    return c.json({
      staker: cached.staker,
      collections: cached.collections,
      emissions: cached.emissions,
    })
  }

  if (cached.cached && cached.stale) {
    c.executionCtx.waitUntil(refreshConfig(c.env))
    return c.json({
      staker: cached.staker,
      collections: cached.collections,
      emissions: cached.emissions,
    })
  }

  const data = await refreshConfig(c.env)
  return c.json(stringifyBigInts(data))
})
