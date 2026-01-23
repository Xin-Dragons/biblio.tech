import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

export interface CachedNft {
  mint: string
  name: string
  image: string
  collectionId: string
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  frozen: boolean
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
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  private ensureSchema() {
    if (this.initialized) return
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS nfts (
        mint TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT NOT NULL,
        collection_id TEXT NOT NULL,
        collection_name TEXT,
        attributes TEXT NOT NULL,
        frozen INTEGER NOT NULL DEFAULT 0,
        compressed INTEGER NOT NULL DEFAULT 0,
        token_standard TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT NOT NULL,
        num_mints INTEGER NOT NULL DEFAULT 0
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

  private getNfts(): CachedNft[] {
    this.ensureSchema()
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT mint, name, image, collection_id, collection_name, attributes, frozen, compressed, token_standard FROM nfts"
      )
      .toArray()

    return rows.map((row) => ({
      mint: row.mint as string,
      name: row.name as string,
      image: row.image as string,
      collectionId: row.collection_id as string,
      collectionName: row.collection_name as string | null,
      attributes: JSON.parse(row.attributes as string) as Array<{ trait_type: string; value: string }>,
      frozen: (row.frozen as number) === 1,
      compressed: (row.compressed as number) === 1,
      tokenStandard: row.token_standard as string,
    }))
  }

  private getCollections(): CachedCollection[] {
    this.ensureSchema()
    const rows = this.ctx.storage.sql.exec("SELECT id, name, image, num_mints FROM collections").toArray()

    return rows.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      image: row.image as string,
      numMints: row.num_mints as number,
    }))
  }

  private setCache(nfts: CachedNft[], collections: CachedCollection[]): void {
    this.ensureSchema()

    this.ctx.storage.sql.exec("DELETE FROM nfts")
    this.ctx.storage.sql.exec("DELETE FROM collections")

    for (const nft of nfts) {
      this.ctx.storage.sql.exec(
        `INSERT INTO nfts (mint, name, image, collection_id, collection_name, attributes, frozen, compressed, token_standard)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        nft.mint,
        nft.name,
        nft.image,
        nft.collectionId,
        nft.collectionName,
        JSON.stringify(nft.attributes),
        nft.frozen ? 1 : 0,
        nft.compressed ? 1 : 0,
        nft.tokenStandard
      )
    }

    for (const col of collections) {
      this.ctx.storage.sql.exec(
        "INSERT INTO collections (id, name, image, num_mints) VALUES (?, ?, ?, ?)",
        col.id,
        col.name,
        col.image,
        col.numMints
      )
    }

    this.setCachedAt(Date.now())
  }

  private clearCache(): void {
    this.ensureSchema()
    this.ctx.storage.sql.exec("DELETE FROM nfts")
    this.ctx.storage.sql.exec("DELETE FROM collections")
    this.ctx.storage.sql.exec("DELETE FROM meta WHERE key = 'cached_at'")
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/cache" && request.method === "GET") {
        const cachedAt = this.getCachedAt()
        if (cachedAt === null) {
          return Response.json({ cached: false })
        }
        const isStale = Date.now() - cachedAt > CACHE_TTL_MS
        return Response.json({
          cached: true,
          stale: isStale,
          nfts: this.getNfts(),
          collections: this.getCollections(),
          cachedAt,
        })
      }

      if (path === "/cache" && request.method === "PUT") {
        const { nfts, collections } = await request.json<{
          nfts: CachedNft[]
          collections: CachedCollection[]
        }>()
        this.setCache(nfts, collections)
        return new Response(null, { status: 204 })
      }

      if (path === "/cache" && request.method === "DELETE") {
        this.clearCache()
        return new Response(null, { status: 204 })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("NftCacheDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
