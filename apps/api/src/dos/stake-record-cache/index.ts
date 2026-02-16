import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { eq, sql } from "drizzle-orm"
import { type Address, getBase64Encoder, getBase58Decoder } from "@solana/kit"
import { stake } from "@biblio/solana-programs"
import type { Env } from "../../types"
import { getRpc } from "../../lib/solana-client"
import * as schema from "./db/schema"
import type { StakeRecordCacheDB } from "./db/types"
import migrations from "./db/migrations/migrations"

const DANDIES_STAKER_PUBKEY = "6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a"
const ALARM_INTERVAL_MS = 60_000

export class StakeRecordCacheDO extends DurableObject<Env> {
  private db: StakeRecordCacheDB
  private ws: WebSocket | null = null
  private subscriptionId: number | null = null
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = drizzle(ctx.storage, { schema })

    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations)
      } catch (err) {
        console.error("[StakeRecordCacheDO] Migration failed:", err)
      }

      const initMeta = await this.db.query.meta.findFirst({
        where: eq(schema.meta.key, "initialized"),
      })
      if (initMeta) {
        this.initialized = true
      }
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/records" && request.method === "GET") {
        const owner = url.searchParams.get("owner")
        if (!owner) {
          return Response.json({ error: "owner parameter required" }, { status: 400 })
        }

        if (!this.initialized) {
          await this.initializeCache()
        }

        const records = await this.db.query.stakeRecords.findMany({
          where: eq(schema.stakeRecords.owner, owner),
        })

        return Response.json({ records: records.map((r) => ({ nftMint: r.nftMint })) })
      }

      if (path === "/stats" && request.method === "GET") {
        const [{ count: recordCount }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.stakeRecords)
        const lastUpdate = await this.db.query.meta.findFirst({
          where: eq(schema.meta.key, "last_update"),
        })
        return Response.json({
          recordCount,
          wsConnected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
          initialized: this.initialized,
          lastUpdate: lastUpdate?.value ?? null,
        })
      }

      if (path === "/refresh" && request.method === "POST") {
        await this.initializeCache()
        return Response.json({ ok: true })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("[StakeRecordCacheDO] fetch error:", err)
      return Response.json({ error: "Internal error" }, { status: 500 })
    }
  }

  private async initializeCache(): Promise<void> {
    console.log("[StakeRecordCacheDO] Initializing cache from RPC...")

    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.env.HELIUS_API_KEY}`
    const rpc = getRpc(rpcUrl)

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
          {
            memcmp: {
              offset: 8n,
              bytes: DANDIES_STAKER_PUBKEY as Base58EncodedBytes,
              encoding: "base58",
            },
          },
        ],
      })
      .send()

    const decoder = stake.getStakeRecordDecoder()
    const base64Encoder = getBase64Encoder()

    await this.db.delete(schema.stakeRecords)

    const BATCH_SIZE = 100
    for (let i = 0; i < response.length; i += BATCH_SIZE) {
      const batch = response.slice(i, i + BATCH_SIZE)
      const rows = batch.map((account) => {
        const [dataBase64] = account.account.data
        const data = base64Encoder.encode(dataBase64)
        const decoded = decoder.decode(data)
        return {
          nftMint: decoded.nftMint as string,
          owner: decoded.owner as string,
          accountAddress: account.pubkey as string,
        }
      })
      await this.db.insert(schema.stakeRecords).values(rows).onConflictDoUpdate({
        target: schema.stakeRecords.nftMint,
        set: {
          owner: sql`excluded.owner`,
          accountAddress: sql`excluded.account_address`,
        },
      })
    }

    await this.db
      .insert(schema.meta)
      .values({ key: "initialized", value: "true" })
      .onConflictDoUpdate({ target: schema.meta.key, set: { value: "true" } })

    await this.db
      .insert(schema.meta)
      .values({ key: "last_update", value: String(Date.now()) })
      .onConflictDoUpdate({ target: schema.meta.key, set: { value: String(Date.now()) } })

    this.initialized = true
    console.log(`[StakeRecordCacheDO] Cached ${response.length} stake records`)

    this.connectWebSocket()
    this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS)
  }

  private connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${this.env.HELIUS_API_KEY}`
      this.ws = new WebSocket(wsUrl)

      this.ws.addEventListener("open", () => {
        console.log("[StakeRecordCacheDO] WebSocket connected")

        const base58Decoder = getBase58Decoder()
        const discriminatorBase58 = base58Decoder.decode(stake.STAKE_RECORD_DISCRIMINATOR)

        const subscribeMsg = {
          jsonrpc: "2.0",
          id: 1,
          method: "programSubscribe",
          params: [
            stake.STAKE_PROGRAM_ADDRESS,
            {
              encoding: "base64",
              filters: [
                { memcmp: { offset: 0, bytes: discriminatorBase58 } },
                { memcmp: { offset: 8, bytes: DANDIES_STAKER_PUBKEY } },
              ],
            },
          ],
        }

        this.ws!.send(JSON.stringify(subscribeMsg))
      })

      this.ws.addEventListener("message", (event) => {
        void this.handleSubscriptionMessage(event.data as string)
      })

      this.ws.addEventListener("close", () => {
        console.log("[StakeRecordCacheDO] WebSocket closed")
        this.ws = null
        this.subscriptionId = null
      })

      this.ws.addEventListener("error", (event) => {
        console.error("[StakeRecordCacheDO] WebSocket error:", event)
        this.ws = null
        this.subscriptionId = null
      })
    } catch (err) {
      console.error("[StakeRecordCacheDO] WebSocket connection failed:", err)
      this.ws = null
    }
  }

  private async handleSubscriptionMessage(raw: string): Promise<void> {
    try {
      const msg = JSON.parse(raw)

      if (msg.id === 1 && msg.result !== undefined) {
        this.subscriptionId = msg.result
        console.log(`[StakeRecordCacheDO] Subscription confirmed: ${this.subscriptionId}`)
        return
      }

      if (msg.method !== "programNotification") return

      const { pubkey, account } = msg.params.result.value
      const lamports = account.lamports

      if (lamports === 0) {
        await this.db.delete(schema.stakeRecords).where(eq(schema.stakeRecords.accountAddress, pubkey))
        console.log(`[StakeRecordCacheDO] Removed closed account: ${pubkey}`)
      } else {
        const [dataBase64] = account.data
        const data = getBase64Encoder().encode(dataBase64)
        const decoder = stake.getStakeRecordDecoder()
        const decoded = decoder.decode(data)

        await this.db
          .insert(schema.stakeRecords)
          .values({
            nftMint: decoded.nftMint as string,
            owner: decoded.owner as string,
            accountAddress: pubkey,
          })
          .onConflictDoUpdate({
            target: schema.stakeRecords.nftMint,
            set: {
              owner: decoded.owner as string,
              accountAddress: pubkey,
            },
          })
        console.log(`[StakeRecordCacheDO] Upserted stake record for mint: ${decoded.nftMint}`)
      }

      await this.db
        .insert(schema.meta)
        .values({ key: "last_update", value: String(Date.now()) })
        .onConflictDoUpdate({ target: schema.meta.key, set: { value: String(Date.now()) } })
    } catch (err) {
      console.error("[StakeRecordCacheDO] Error handling message:", err)
    }
  }

  async alarm(): Promise<void> {
    if (!this.initialized) return

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("[StakeRecordCacheDO] Alarm: reconnecting WebSocket")
      this.connectWebSocket()
    }

    this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS)
  }
}
