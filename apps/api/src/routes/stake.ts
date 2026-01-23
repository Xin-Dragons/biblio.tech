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
import { stringifyBigInts } from "../lib/json"
import type { CachedStakeRecord } from "../dos/stake-records"

export const stakeRoutes = new Hono<HonoEnv>()

const DANDIES_STAKER_PUBKEY = "6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a"

export type DandiesStakeResponse = {
  staker: StakerAccount | null
  collections: CollectionAccount[]
  emissions: EmissionAccount[]
}

export type StakeRecordsResponse = {
  records: CachedStakeRecord[]
}

function getConfigDO(env: HonoEnv["Bindings"]) {
  const id = env.STAKER_SETTINGS_DO.idFromName(DANDIES_STAKER_PUBKEY)
  return env.STAKER_SETTINGS_DO.get(id)
}

function getRecordsDO(env: HonoEnv["Bindings"], wallet: string) {
  const id = env.STAKE_RECORDS_DO.idFromName(wallet)
  return env.STAKE_RECORDS_DO.get(id)
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

/**
 * Converts StakeRecordAccount to CachedStakeRecord for storage
 */
function toCachedRecord(record: StakeRecordAccount): CachedStakeRecord {
  return {
    address: record.address,
    staker: record.staker,
    owner: record.owner,
    nftMint: record.nftMint,
    stakedAt: Number(record.stakedAt),
    pendingClaim: Number(record.pendingClaim),
    canClaimAt: Number(record.canClaimAt),
    solBalance: Number(record.solBalance),
    emissions: record.emissions.map(String),
    bump: record.bump,
  }
}

/**
 * Fetches fresh stake records from RPC and caches in DO
 */
async function refreshRecords(env: HonoEnv["Bindings"], wallet: string): Promise<CachedStakeRecord[]> {
  const allRecords = await getStakeRecordsByOwner(env, wallet)
  const records = allRecords.filter((r) => r.staker === DANDIES_STAKER_PUBKEY)
  const cachedRecords = records.map(toCachedRecord)

  const stub = getRecordsDO(env, wallet)
  await stub.fetch(
    new Request("http://do/records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: cachedRecords }),
    })
  )

  return cachedRecords
}

/**
 * Gets cached stake records for a wallet, refreshing if stale or missing.
 * Used by tier/username endpoints to avoid direct RPC calls.
 */
export async function getCachedStakeRecords(env: HonoEnv["Bindings"], wallet: string): Promise<CachedStakeRecord[]> {
  const stub = getRecordsDO(env, wallet)
  const cacheRes = await stub.fetch(new Request("http://do/records"))
  const cached = await cacheRes.json<{
    cached: boolean
    stale?: boolean
    records?: CachedStakeRecord[]
  }>()

  if (cached.cached && cached.records) {
    return cached.records
  }

  return refreshRecords(env, wallet)
}

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

/**
 * Converts CachedStakeRecord numbers to strings for JSON response
 * Frontend expects bigint fields as strings to parse with BigInt()
 */
function toResponseRecord(record: CachedStakeRecord) {
  return {
    ...record,
    stakedAt: String(record.stakedAt),
    pendingClaim: String(record.pendingClaim),
    canClaimAt: String(record.canClaimAt),
    solBalance: String(record.solBalance),
  }
}

/**
 * GET /stake/records/:wallet
 * Returns Dandies stake records for a given wallet owner
 * Uses stale-while-revalidate caching via StakeRecordsDO
 */
stakeRoutes.get("/records/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const stub = getRecordsDO(c.env, wallet)
  const cacheRes = await stub.fetch(new Request("http://do/records"))
  const cached = await cacheRes.json<{
    cached: boolean
    stale?: boolean
    records?: CachedStakeRecord[]
  }>()

  if (cached.cached && !cached.stale && cached.records) {
    return c.json({ records: cached.records.map(toResponseRecord) })
  }

  if (cached.cached && cached.stale && cached.records) {
    c.executionCtx.waitUntil(refreshRecords(c.env, wallet))
    return c.json({ records: cached.records.map(toResponseRecord) })
  }

  const records = await refreshRecords(c.env, wallet)
  return c.json({ records: records.map(toResponseRecord) })
})

/**
 * DELETE /stake/records/:wallet
 * Invalidates the stake records cache for a wallet (call after stake/unstake)
 */
stakeRoutes.delete("/records/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const stub = getRecordsDO(c.env, wallet)
  await stub.fetch(new Request("http://do/records", { method: "DELETE" }))
  return new Response(null, { status: 204 })
})
