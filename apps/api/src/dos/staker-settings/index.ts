import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { eq } from "drizzle-orm"
import type { Env } from "../../types"
import * as schema from "./db/schema"
import type { StakerSettingsDB } from "./db/types"
import migrations from "./db/migrations/migrations"

interface CachedConfig {
  staker: string
  collections: string
  emissions: string
  cachedAt: number
}

const CONFIG_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class StakerSettingsDO extends DurableObject<Env> {
  private db: StakerSettingsDB

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = drizzle(ctx.storage, { schema })

    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations)
      } catch (err) {
        console.error("[StakerSettingsDO] Migration failed:", err)
      }
    })
  }

  private async getConfig(): Promise<CachedConfig | null> {
    const result = await this.db.query.config.findFirst({
      where: eq(schema.config.id, 1),
    })
    if (!result) return null
    return {
      staker: result.staker,
      collections: result.collections,
      emissions: result.emissions,
      cachedAt: result.cachedAt,
    }
  }

  private async setConfig(staker: string, collections: string, emissions: string): Promise<void> {
    await this.db
      .insert(schema.config)
      .values({
        id: 1,
        staker,
        collections,
        emissions,
        cachedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.config.id,
        set: {
          staker,
          collections,
          emissions,
          cachedAt: Date.now(),
        },
      })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/config" && request.method === "GET") {
        const cached = await this.getConfig()
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
        await this.setConfig(staker, collections, emissions)
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("StakerSettingsDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
