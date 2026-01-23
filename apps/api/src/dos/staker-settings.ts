import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

interface CachedConfig {
  staker: string // JSON
  collections: string // JSON
  emissions: string // JSON
  cachedAt: number
}

const CONFIG_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class StakerSettingsDO extends DurableObject<Env> {
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private ensureSchema() {
    if (this.initialized) return
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        staker TEXT NOT NULL,
        collections TEXT NOT NULL,
        emissions TEXT NOT NULL,
        cached_at INTEGER NOT NULL
      );
    `)
    this.initialized = true
  }

  private getConfig(): CachedConfig | null {
    this.ensureSchema()
    const rows = this.ctx.storage.sql
      .exec("SELECT staker, collections, emissions, cached_at FROM config WHERE id = 1")
      .toArray()
    if (rows.length === 0) return null
    const row = rows[0]
    return {
      staker: row.staker as string,
      collections: row.collections as string,
      emissions: row.emissions as string,
      cachedAt: row.cached_at as number,
    }
  }

  private setConfig(staker: string, collections: string, emissions: string): void {
    this.ensureSchema()
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO config (id, staker, collections, emissions, cached_at)
       VALUES (1, ?, ?, ?, ?)`,
      staker,
      collections,
      emissions,
      Date.now()
    )
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/config" && request.method === "GET") {
        const cached = this.getConfig()
        if (!cached) {
          return Response.json({ cached: false })
        }
        const isStale = Date.now() - cached.cachedAt > CONFIG_TTL_MS
        return Response.json({
          cached: true,
          stale: isStale,
          staker: JSON.parse(cached.staker),
          collections: JSON.parse(cached.collections),
          emissions: JSON.parse(cached.emissions),
          cachedAt: cached.cachedAt,
        })
      }

      if (path === "/config" && request.method === "PUT") {
        const { staker, collections, emissions } = await request.json<{
          staker: string
          collections: string
          emissions: string
        }>()
        this.setConfig(staker, collections, emissions)
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("StakerSettingsDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
