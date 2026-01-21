import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface Preferences {
  layoutSize: "small" | "medium" | "large" | "collage"
  showInfo: boolean
  sort: string
  lightMode: boolean
  payRoyalties: boolean
  showAllWallets: boolean
}

export interface Wallet {
  publicKey: string
  nickname?: string
  isMain: boolean
  addedAt: number
}

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

export interface NftCache {
  wallet: string
  nfts: CachedNft[]
  collections: CachedCollection[]
  cachedAt: number
}

export interface ShowcaseConfig {
  enabled: boolean
  items: string[]
  order: string[]
  sizes: Record<string, "small" | "medium" | "large" | "xlarge">
  updatedAt: number
}

export class UserDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return (await this.ctx.storage.get<Tag[]>("tags")) ?? []
  }

  async addTag(tag: Omit<Tag, "createdAt">): Promise<Tag> {
    const tags = await this.getTags()
    const newTag: Tag = { ...tag, createdAt: Date.now() }
    tags.push(newTag)
    await this.ctx.storage.put("tags", tags)
    return newTag
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag | null> {
    const tags = await this.getTags()
    const index = tags.findIndex((t) => t.id === id)
    if (index === -1) return null
    tags[index] = { ...tags[index], ...updates }
    await this.ctx.storage.put("tags", tags)
    return tags[index]
  }

  async deleteTag(id: string): Promise<boolean> {
    const tags = await this.getTags()
    const filtered = tags.filter((t) => t.id !== id)
    if (filtered.length === tags.length) return false
    await this.ctx.storage.put("tags", filtered)
    // Also remove all tagged NFTs for this tag
    await this.ctx.storage.delete(`tagged:${id}`)
    return true
  }

  // Tagged NFTs
  async getTaggedNfts(tagId: string): Promise<string[]> {
    return (await this.ctx.storage.get<string[]>(`tagged:${tagId}`)) ?? []
  }

  async getAllTaggedNfts(): Promise<Record<string, string[]>> {
    const tags = await this.getTags()
    const result: Record<string, string[]> = {}
    for (const tag of tags) {
      result[tag.id] = await this.getTaggedNfts(tag.id)
    }
    return result
  }

  async addNftsToTag(tagId: string, mints: string[]): Promise<void> {
    const current = await this.getTaggedNfts(tagId)
    const updated = [...new Set([...current, ...mints])]
    await this.ctx.storage.put(`tagged:${tagId}`, updated)
  }

  async removeNftsFromTag(tagId: string, mints: string[]): Promise<void> {
    const current = await this.getTaggedNfts(tagId)
    const updated = current.filter((m) => !mints.includes(m))
    await this.ctx.storage.put(`tagged:${tagId}`, updated)
  }

  // Starred NFTs
  async getStarred(): Promise<string[]> {
    return (await this.ctx.storage.get<string[]>("starred")) ?? []
  }

  async addToStarred(mint: string): Promise<void> {
    const starred = await this.getStarred()
    if (!starred.includes(mint)) {
      starred.push(mint)
      await this.ctx.storage.put("starred", starred)
    }
  }

  async removeFromStarred(mint: string): Promise<void> {
    const starred = await this.getStarred()
    const updated = starred.filter((m) => m !== mint)
    await this.ctx.storage.put("starred", updated)
  }

  // Preferences
  async getPreferences(context: string = "defaults"): Promise<Preferences | null> {
    return (await this.ctx.storage.get<Preferences>(`prefs:${context}`)) ?? null
  }

  async setPreferences(context: string, prefs: Partial<Preferences>): Promise<void> {
    const current = (await this.getPreferences(context)) ?? {}
    await this.ctx.storage.put(`prefs:${context}`, { ...current, ...prefs })
  }

  // Custom order
  async getOrder(context: string): Promise<Record<string, number>> {
    return (await this.ctx.storage.get<Record<string, number>>(`order:${context}`)) ?? {}
  }

  async setOrder(context: string, order: Record<string, number>): Promise<void> {
    await this.ctx.storage.put(`order:${context}`, order)
  }

  // Collage sizes
  async getSizes(context: string): Promise<Record<string, string>> {
    return (await this.ctx.storage.get<Record<string, string>>(`sizes:${context}`)) ?? {}
  }

  async setSizes(context: string, sizes: Record<string, string>): Promise<void> {
    await this.ctx.storage.put(`sizes:${context}`, sizes)
  }

  // Collage layout
  async getLayout(context: string): Promise<Array<{ i: string; x: number; y: number; w: number; h: number }>> {
    return (
      (await this.ctx.storage.get<Array<{ i: string; x: number; y: number; w: number; h: number }>>(
        `layout:${context}`
      )) ?? []
    )
  }

  async setLayout(
    context: string,
    layout: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ): Promise<void> {
    await this.ctx.storage.put(`layout:${context}`, layout)
  }

  // Wallets (linked wallets for this user)
  async getWallets(): Promise<Wallet[]> {
    return (await this.ctx.storage.get<Wallet[]>("wallets")) ?? []
  }

  async addWallet(wallet: Omit<Wallet, "addedAt">): Promise<Wallet> {
    const wallets = await this.getWallets()
    const newWallet: Wallet = { ...wallet, addedAt: Date.now() }
    wallets.push(newWallet)
    await this.ctx.storage.put("wallets", wallets)
    return newWallet
  }

  async removeWallet(publicKey: string): Promise<boolean> {
    const wallets = await this.getWallets()
    const filtered = wallets.filter((w) => w.publicKey !== publicKey)
    if (filtered.length === wallets.length) return false
    await this.ctx.storage.put("wallets", filtered)
    return true
  }

  // Dandies (for gating)
  async getDandies(): Promise<{ mints: string[]; verifiedAt: number } | null> {
    return (await this.ctx.storage.get<{ mints: string[]; verifiedAt: number }>("dandies")) ?? null
  }

  async setDandies(mints: string[]): Promise<void> {
    await this.ctx.storage.put("dandies", { mints, verifiedAt: Date.now() })
  }

  // NFT Cache
  async getNftCache(wallet: string): Promise<NftCache | null> {
    return (await this.ctx.storage.get<NftCache>(`nft-cache:${wallet}`)) ?? null
  }

  async setNftCache(wallet: string, nfts: CachedNft[], collections: CachedCollection[]): Promise<void> {
    const cache: NftCache = {
      wallet,
      nfts,
      collections,
      cachedAt: Date.now(),
    }
    await this.ctx.storage.put(`nft-cache:${wallet}`, cache)
  }

  async clearNftCache(wallet: string): Promise<void> {
    await this.ctx.storage.delete(`nft-cache:${wallet}`)
  }

  // Username
  async getUsername(): Promise<string | null> {
    return (await this.ctx.storage.get<string>("username")) ?? null
  }

  async setUsername(username: string): Promise<void> {
    await this.ctx.storage.put("username", username.toLowerCase())
  }

  async clearUsername(): Promise<void> {
    await this.ctx.storage.delete("username")
  }

  // Showcase
  async getShowcase(): Promise<ShowcaseConfig | null> {
    return (await this.ctx.storage.get<ShowcaseConfig>("showcase")) ?? null
  }

  async setShowcase(config: Partial<ShowcaseConfig>): Promise<ShowcaseConfig> {
    const current = (await this.getShowcase()) ?? {
      enabled: false,
      items: [],
      order: [],
      sizes: {},
      updatedAt: Date.now(),
    }
    const updated: ShowcaseConfig = {
      ...current,
      ...config,
      updatedAt: Date.now(),
    }
    await this.ctx.storage.put("showcase", updated)
    return updated
  }

  // HTTP handler for the DO
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Tags
      if (path === "/tags" && request.method === "GET") {
        return Response.json(await this.getTags())
      }
      if (path === "/tags" && request.method === "POST") {
        const body = await request.json<Omit<Tag, "createdAt">>()
        return Response.json(await this.addTag(body))
      }
      if (path.startsWith("/tags/") && request.method === "PATCH") {
        const id = path.split("/")[2]
        const body = await request.json<Partial<Tag>>()
        const result = await this.updateTag(id, body)
        if (!result) return new Response("Not found", { status: 404 })
        return Response.json(result)
      }
      if (path.startsWith("/tags/") && request.method === "DELETE") {
        const id = path.split("/")[2]
        const deleted = await this.deleteTag(id)
        if (!deleted) return new Response("Not found", { status: 404 })
        return new Response(null, { status: 204 })
      }

      // Tagged NFTs
      if (path === "/tagged" && request.method === "GET") {
        return Response.json(await this.getAllTaggedNfts())
      }
      if (path.startsWith("/tagged/") && request.method === "PUT") {
        const tagId = path.split("/")[2]
        const { mints } = await request.json<{ mints: string[] }>()
        await this.addNftsToTag(tagId, mints)
        return new Response(null, { status: 204 })
      }
      if (path.startsWith("/tagged/") && request.method === "DELETE") {
        const tagId = path.split("/")[2]
        const { mints } = await request.json<{ mints: string[] }>()
        await this.removeNftsFromTag(tagId, mints)
        return new Response(null, { status: 204 })
      }

      // Starred
      if (path === "/starred" && request.method === "GET") {
        return Response.json(await this.getStarred())
      }
      if (path === "/starred" && request.method === "PUT") {
        const { mint } = await request.json<{ mint: string }>()
        await this.addToStarred(mint)
        return new Response(null, { status: 204 })
      }
      if (path === "/starred" && request.method === "DELETE") {
        const { mint } = await request.json<{ mint: string }>()
        await this.removeFromStarred(mint)
        return new Response(null, { status: 204 })
      }

      // Preferences
      if (path.startsWith("/preferences") && request.method === "GET") {
        const context = url.searchParams.get("context") ?? "defaults"
        return Response.json(await this.getPreferences(context))
      }
      if (path.startsWith("/preferences") && request.method === "PUT") {
        const context = url.searchParams.get("context") ?? "defaults"
        const prefs = await request.json<Partial<Preferences>>()
        await this.setPreferences(context, prefs)
        return new Response(null, { status: 204 })
      }

      // Order
      if (path.startsWith("/order/") && request.method === "GET") {
        const context = path.split("/")[2]
        return Response.json(await this.getOrder(context))
      }
      if (path.startsWith("/order/") && request.method === "PUT") {
        const context = path.split("/")[2]
        const order = await request.json<Record<string, number>>()
        await this.setOrder(context, order)
        return new Response(null, { status: 204 })
      }

      // Sizes
      if (path.startsWith("/sizes/") && request.method === "GET") {
        const context = path.split("/")[2]
        return Response.json(await this.getSizes(context))
      }
      if (path.startsWith("/sizes/") && request.method === "PUT") {
        const context = path.split("/")[2]
        const sizes = await request.json<Record<string, string>>()
        await this.setSizes(context, sizes)
        return new Response(null, { status: 204 })
      }

      // Layout
      if (path.startsWith("/layout/") && request.method === "GET") {
        const context = path.split("/")[2]
        return Response.json(await this.getLayout(context))
      }
      if (path.startsWith("/layout/") && request.method === "PUT") {
        const context = path.split("/")[2]
        const layout = await request.json<Array<{ i: string; x: number; y: number; w: number; h: number }>>()
        await this.setLayout(context, layout)
        return new Response(null, { status: 204 })
      }

      // Wallets
      if (path === "/wallets" && request.method === "GET") {
        return Response.json(await this.getWallets())
      }
      if (path === "/wallets" && request.method === "POST") {
        const wallet = await request.json<Omit<Wallet, "addedAt">>()
        return Response.json(await this.addWallet(wallet))
      }
      if (path.startsWith("/wallets/") && request.method === "DELETE") {
        const publicKey = path.split("/")[2]
        const deleted = await this.removeWallet(publicKey)
        if (!deleted) return new Response("Not found", { status: 404 })
        return new Response(null, { status: 204 })
      }

      // Dandies
      if (path === "/dandies" && request.method === "GET") {
        return Response.json(await this.getDandies())
      }
      if (path === "/dandies" && request.method === "PUT") {
        const { mints } = await request.json<{ mints: string[] }>()
        await this.setDandies(mints)
        return new Response(null, { status: 204 })
      }

      // NFT Cache
      if (path.startsWith("/nft-cache/") && request.method === "GET") {
        const wallet = path.split("/")[2]
        return Response.json(await this.getNftCache(wallet))
      }
      if (path.startsWith("/nft-cache/") && request.method === "PUT") {
        const wallet = path.split("/")[2]
        const { nfts, collections } = await request.json<{
          nfts: CachedNft[]
          collections: CachedCollection[]
        }>()
        await this.setNftCache(wallet, nfts, collections)
        return new Response(null, { status: 204 })
      }
      if (path.startsWith("/nft-cache/") && request.method === "DELETE") {
        const wallet = path.split("/")[2]
        await this.clearNftCache(wallet)
        return new Response(null, { status: 204 })
      }

      // Username
      if (path === "/username" && request.method === "GET") {
        return Response.json({ username: await this.getUsername() })
      }
      if (path === "/username" && request.method === "PUT") {
        const { username } = await request.json<{ username: string }>()
        await this.setUsername(username)
        return new Response(null, { status: 204 })
      }
      if (path === "/username" && request.method === "DELETE") {
        await this.clearUsername()
        return new Response(null, { status: 204 })
      }

      // Showcase
      if (path === "/showcase" && request.method === "GET") {
        return Response.json(await this.getShowcase())
      }
      if (path === "/showcase" && request.method === "PUT") {
        const config = await request.json<Partial<ShowcaseConfig>>()
        const updated = await this.setShowcase(config)
        return Response.json(updated)
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("UserDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
