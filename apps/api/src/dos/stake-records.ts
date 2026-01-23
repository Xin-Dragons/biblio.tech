import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

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
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private ensureSchema() {
    if (this.initialized) return
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS stake_records (
        address TEXT PRIMARY KEY,
        staker TEXT NOT NULL,
        owner TEXT NOT NULL,
        nft_mint TEXT NOT NULL,
        staked_at INTEGER NOT NULL,
        pending_claim INTEGER NOT NULL,
        can_claim_at INTEGER NOT NULL,
        sol_balance INTEGER NOT NULL,
        emissions TEXT NOT NULL,
        bump INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `)
    this.initialized = true
  }

  private getCachedAt(): number | null {
    this.ensureSchema()
    const rows = this.ctx.storage.sql.exec("SELECT value FROM meta WHERE key = 'cached_at'").toArray()
    if (rows.length === 0) return null
    return rows[0].value as number
  }

  private setCachedAt(timestamp: number): void {
    this.ensureSchema()
    this.ctx.storage.sql.exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('cached_at', ?)", timestamp)
  }

  private getRecords(): CachedStakeRecord[] {
    this.ensureSchema()
    const rows = this.ctx.storage.sql
      .exec(
        `SELECT address, staker, owner, nft_mint, staked_at, pending_claim, can_claim_at, sol_balance, emissions, bump
         FROM stake_records`
      )
      .toArray()

    return rows.map((row) => ({
      address: row.address as string,
      staker: row.staker as string,
      owner: row.owner as string,
      nftMint: row.nft_mint as string,
      stakedAt: row.staked_at as number,
      pendingClaim: row.pending_claim as number,
      canClaimAt: row.can_claim_at as number,
      solBalance: row.sol_balance as number,
      emissions: JSON.parse(row.emissions as string) as string[],
      bump: row.bump as number,
    }))
  }

  private setRecords(records: CachedStakeRecord[]): void {
    this.ensureSchema()
    this.ctx.storage.sql.exec("DELETE FROM stake_records")

    for (const record of records) {
      this.ctx.storage.sql.exec(
        `INSERT INTO stake_records (address, staker, owner, nft_mint, staked_at, pending_claim, can_claim_at, sol_balance, emissions, bump)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        record.address,
        record.staker,
        record.owner,
        record.nftMint,
        record.stakedAt,
        record.pendingClaim,
        record.canClaimAt,
        record.solBalance,
        JSON.stringify(record.emissions),
        record.bump
      )
    }

    this.setCachedAt(Date.now())
  }

  private clearRecords(): void {
    this.ensureSchema()
    this.ctx.storage.sql.exec("DELETE FROM stake_records")
    this.ctx.storage.sql.exec("DELETE FROM meta WHERE key = 'cached_at'")
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/records" && request.method === "GET") {
        const cachedAt = this.getCachedAt()
        if (cachedAt === null) {
          return Response.json({ cached: false })
        }
        const isStale = Date.now() - cachedAt > CACHE_TTL_MS
        return Response.json({
          cached: true,
          stale: isStale,
          records: this.getRecords(),
          cachedAt,
        })
      }

      if (path === "/records" && request.method === "PUT") {
        const { records } = await request.json<{ records: CachedStakeRecord[] }>()
        this.setRecords(records)
        return new Response(null, { status: 204 })
      }

      if (path === "/records" && request.method === "DELETE") {
        this.clearRecords()
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("StakeRecordsDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
