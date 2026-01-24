import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { eq } from "drizzle-orm"
import type { Env } from "../../types"
import * as schema from "./db/schema"
import type { StakeRecordsDB } from "./db/types"
import migrations from "./db/migrations/migrations"

export interface CachedStakeRecord {
  address: string
  staker: string
  owner: string
  nftMint: string
  stakedAt: number
  pendingClaim: number
  canClaimAt: number
  solBalance: number
  emissions: string[]
  bump: number
}

const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

export class StakeRecordsDO extends DurableObject<Env> {
  private db: StakeRecordsDB

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = drizzle(ctx.storage, { schema })

    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations)
      } catch (err) {
        console.error("[StakeRecordsDO] Migration failed:", err)
      }
    })
  }

  private async getCachedAt(): Promise<number | null> {
    const result = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "cached_at"),
    })
    return result?.value ?? null
  }

  private async setCachedAt(timestamp: number): Promise<void> {
    await this.db
      .insert(schema.meta)
      .values({ key: "cached_at", value: timestamp })
      .onConflictDoUpdate({
        target: schema.meta.key,
        set: { value: timestamp },
      })
  }

  private async getRecords(): Promise<CachedStakeRecord[]> {
    const rows = await this.db.query.stakeRecords.findMany()
    return rows.map((row) => ({
      address: row.address,
      staker: row.staker,
      owner: row.owner,
      nftMint: row.nftMint,
      stakedAt: row.stakedAt,
      pendingClaim: row.pendingClaim,
      canClaimAt: row.canClaimAt,
      solBalance: row.solBalance,
      emissions: JSON.parse(row.emissions) as string[],
      bump: row.bump,
    }))
  }

  private async setRecords(records: CachedStakeRecord[]): Promise<void> {
    await this.db.delete(schema.stakeRecords)

    for (const record of records) {
      await this.db.insert(schema.stakeRecords).values({
        address: record.address,
        staker: record.staker,
        owner: record.owner,
        nftMint: record.nftMint,
        stakedAt: record.stakedAt,
        pendingClaim: record.pendingClaim,
        canClaimAt: record.canClaimAt,
        solBalance: record.solBalance,
        emissions: JSON.stringify(record.emissions),
        bump: record.bump,
      })
    }

    await this.setCachedAt(Date.now())
  }

  private async clearRecords(): Promise<void> {
    await this.db.delete(schema.stakeRecords)
    await this.db.delete(schema.meta).where(eq(schema.meta.key, "cached_at"))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/records" && request.method === "GET") {
        const cachedAt = await this.getCachedAt()
        if (cachedAt === null) {
          return Response.json({ cached: false })
        }
        const isStale = Date.now() - cachedAt > CACHE_TTL_MS
        return Response.json({
          cached: true,
          stale: isStale,
          records: await this.getRecords(),
          cachedAt,
        })
      }

      if (path === "/records" && request.method === "PUT") {
        const { records } = await request.json<{ records: CachedStakeRecord[] }>()
        await this.setRecords(records)
        return new Response(null, { status: 204 })
      }

      if (path === "/records" && request.method === "DELETE") {
        await this.clearRecords()
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("StakeRecordsDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
