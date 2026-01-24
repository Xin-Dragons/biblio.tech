import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { eq } from "drizzle-orm"
import type { Env } from "../../types"
import * as schema from "./db/schema"
import type { NftCacheDB } from "./db/types"
import migrations from "./db/migrations/migrations"

export interface CachedNft {
  mint: string
  name: string
  image: string
  collectionId: string
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  frozen: boolean
  delegate: string | null
  compressed: boolean
  tokenStandard: string
}

export interface CachedCollection {
  id: string
  name: string
  image: string
  numMints: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export class NftCacheDO extends DurableObject<Env> {
  private db: NftCacheDB

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = drizzle(ctx.storage, { schema })

    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations)
      } catch (err) {
        console.error("[NftCacheDO] Migration failed:", err)
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

  private async getNfts(): Promise<CachedNft[]> {
    const rows = await this.db.query.nfts.findMany()
    return rows.map((row) => ({
      mint: row.mint,
      name: row.name,
      image: row.image,
      collectionId: row.collectionId,
      collectionName: row.collectionName,
      attributes: JSON.parse(row.attributes) as Array<{ trait_type: string; value: string }>,
      frozen: row.frozen,
      delegate: row.delegate,
      compressed: row.compressed,
      tokenStandard: row.tokenStandard,
    }))
  }

  private async getCollections(): Promise<CachedCollection[]> {
    const rows = await this.db.query.collections.findMany()
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      numMints: row.numMints,
    }))
  }

  private async setCache(nfts: CachedNft[], collections: CachedCollection[]): Promise<void> {
    await this.db.delete(schema.nfts)
    await this.db.delete(schema.collections)

    for (const nft of nfts) {
      await this.db.insert(schema.nfts).values({
        mint: nft.mint,
        name: nft.name,
        image: nft.image,
        collectionId: nft.collectionId,
        collectionName: nft.collectionName,
        attributes: JSON.stringify(nft.attributes),
        frozen: nft.frozen,
        delegate: nft.delegate,
        compressed: nft.compressed,
        tokenStandard: nft.tokenStandard,
      })
    }

    for (const col of collections) {
      await this.db.insert(schema.collections).values({
        id: col.id,
        name: col.name,
        image: col.image,
        numMints: col.numMints,
      })
    }

    await this.setCachedAt(Date.now())
  }

  private async clearCache(): Promise<void> {
    await this.db.delete(schema.nfts)
    await this.db.delete(schema.collections)
    await this.db.delete(schema.meta).where(eq(schema.meta.key, "cached_at"))
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/cache" && request.method === "GET") {
        const cachedAt = await this.getCachedAt()
        if (cachedAt === null) {
          return Response.json({ cached: false })
        }
        const isStale = Date.now() - cachedAt > CACHE_TTL_MS
        return Response.json({
          cached: true,
          stale: isStale,
          nfts: await this.getNfts(),
          collections: await this.getCollections(),
          cachedAt,
        })
      }

      if (path === "/cache" && request.method === "PUT") {
        const { nfts, collections } = await request.json<{
          nfts: CachedNft[]
          collections: CachedCollection[]
        }>()
        await this.setCache(nfts, collections)
        return new Response(null, { status: 204 })
      }

      if (path === "/cache" && request.method === "DELETE") {
        await this.clearCache()
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("NftCacheDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
