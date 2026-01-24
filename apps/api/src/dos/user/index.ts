import { DurableObject } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/durable-sqlite"
import { migrate } from "drizzle-orm/durable-sqlite/migrator"
import { eq, and } from "drizzle-orm"
import type { Env } from "../../types"
import * as schema from "./db/schema"
import type { UserDB, Tag } from "./db/types"
import migrations from "./db/migrations/migrations"

export interface TagResponse {
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

export interface ShowcaseConfig {
  enabled: boolean
  items: string[]
  order: string[]
  sizes: Record<string, "small" | "medium" | "large" | "xlarge">
  updatedAt: number
}

export class UserDO extends DurableObject<Env> {
  private db: UserDB

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.db = drizzle(ctx.storage, { schema })

    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        await migrate(this.db, migrations)
      } catch (err) {
        console.error("[UserDO] Migration failed:", err)
      }
    })
  }

  // Tags
  async getTags(): Promise<TagResponse[]> {
    const rows = await this.db.query.tags.findMany()
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.createdAt,
    }))
  }

  async addTag(tag: { id: string; name: string; color: string }): Promise<TagResponse> {
    const newTag: Tag = {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: Date.now(),
    }
    await this.db.insert(schema.tags).values(newTag)
    return newTag
  }

  async updateTag(id: string, updates: Partial<{ name: string; color: string }>): Promise<TagResponse | null> {
    const existing = await this.db.query.tags.findFirst({
      where: eq(schema.tags.id, id),
    })
    if (!existing) return null

    const updated = {
      ...existing,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
    }

    await this.db.update(schema.tags).set(updated).where(eq(schema.tags.id, id))

    return {
      id: updated.id,
      name: updated.name,
      color: updated.color,
      createdAt: updated.createdAt,
    }
  }

  async deleteTag(id: string): Promise<boolean> {
    const existing = await this.db.query.tags.findFirst({
      where: eq(schema.tags.id, id),
    })
    if (!existing) return false

    await this.db.delete(schema.taggedNfts).where(eq(schema.taggedNfts.tagId, id))
    await this.db.delete(schema.tags).where(eq(schema.tags.id, id))
    return true
  }

  // Tagged NFTs
  async getTaggedNfts(tagId: string): Promise<string[]> {
    const rows = await this.db.query.taggedNfts.findMany({
      where: eq(schema.taggedNfts.tagId, tagId),
    })
    return rows.map((row) => row.mint)
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
    for (const mint of mints) {
      await this.db.insert(schema.taggedNfts).values({ tagId, mint }).onConflictDoNothing()
    }
  }

  async removeNftsFromTag(tagId: string, mints: string[]): Promise<void> {
    for (const mint of mints) {
      await this.db
        .delete(schema.taggedNfts)
        .where(and(eq(schema.taggedNfts.tagId, tagId), eq(schema.taggedNfts.mint, mint)))
    }
  }

  // Starred NFTs
  async getStarred(): Promise<string[]> {
    const rows = await this.db.query.starred.findMany()
    return rows.map((row) => row.mint)
  }

  async addToStarred(mint: string): Promise<void> {
    await this.db.insert(schema.starred).values({ mint, addedAt: Date.now() }).onConflictDoNothing()
  }

  async removeFromStarred(mint: string): Promise<void> {
    await this.db.delete(schema.starred).where(eq(schema.starred.mint, mint))
  }

  // Custom order
  async getOrder(context: string): Promise<Record<string, number>> {
    const rows = await this.db.query.nftOrder.findMany({
      where: eq(schema.nftOrder.context, context),
    })
    const result: Record<string, number> = {}
    for (const row of rows) {
      result[row.mint] = row.position
    }
    return result
  }

  async setOrder(context: string, order: Record<string, number>): Promise<void> {
    await this.db.delete(schema.nftOrder).where(eq(schema.nftOrder.context, context))
    const entries = Object.entries(order)
    for (const [mint, position] of entries) {
      await this.db.insert(schema.nftOrder).values({ context, mint, position })
    }
  }

  // Collage sizes
  async getSizes(context: string): Promise<Record<string, string>> {
    const rows = await this.db.query.nftSizes.findMany({
      where: eq(schema.nftSizes.context, context),
    })
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.mint] = row.size
    }
    return result
  }

  async setSizes(context: string, sizes: Record<string, string>): Promise<void> {
    await this.db.delete(schema.nftSizes).where(eq(schema.nftSizes.context, context))
    const entries = Object.entries(sizes)
    for (const [mint, size] of entries) {
      await this.db.insert(schema.nftSizes).values({ context, mint, size })
    }
  }

  // Collage layout
  async getLayout(context: string): Promise<Array<{ i: string; x: number; y: number; w: number; h: number }>> {
    const rows = await this.db.query.nftLayout.findMany({
      where: eq(schema.nftLayout.context, context),
    })
    return rows.map((row) => ({
      i: row.mint,
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
    }))
  }

  async setLayout(
    context: string,
    layout: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ): Promise<void> {
    await this.db.delete(schema.nftLayout).where(eq(schema.nftLayout.context, context))
    for (const item of layout) {
      await this.db.insert(schema.nftLayout).values({
        context,
        mint: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })
    }
  }

  // Preferences
  async getPreferences(context: string = "defaults"): Promise<Preferences | null> {
    const row = await this.db.query.preferences.findFirst({
      where: eq(schema.preferences.context, context),
    })
    if (!row) return null
    return {
      layoutSize: (row.layoutSize as Preferences["layoutSize"]) ?? "medium",
      showInfo: row.showInfo ?? false,
      sort: row.sort ?? "default",
      lightMode: row.lightMode ?? false,
      payRoyalties: row.payRoyalties ?? true,
      showAllWallets: row.showAllWallets ?? false,
    }
  }

  async setPreferences(context: string, prefs: Partial<Preferences>): Promise<void> {
    const existing = await this.db.query.preferences.findFirst({
      where: eq(schema.preferences.context, context),
    })
    if (existing) {
      await this.db
        .update(schema.preferences)
        .set({
          ...(prefs.layoutSize !== undefined ? { layoutSize: prefs.layoutSize } : {}),
          ...(prefs.showInfo !== undefined ? { showInfo: prefs.showInfo } : {}),
          ...(prefs.sort !== undefined ? { sort: prefs.sort } : {}),
          ...(prefs.lightMode !== undefined ? { lightMode: prefs.lightMode } : {}),
          ...(prefs.payRoyalties !== undefined ? { payRoyalties: prefs.payRoyalties } : {}),
          ...(prefs.showAllWallets !== undefined ? { showAllWallets: prefs.showAllWallets } : {}),
        })
        .where(eq(schema.preferences.context, context))
    } else {
      await this.db.insert(schema.preferences).values({
        context,
        layoutSize: prefs.layoutSize,
        showInfo: prefs.showInfo,
        sort: prefs.sort,
        lightMode: prefs.lightMode,
        payRoyalties: prefs.payRoyalties,
        showAllWallets: prefs.showAllWallets,
      })
    }
  }

  // Wallets
  async getWallets(): Promise<Wallet[]> {
    const rows = await this.db.query.wallets.findMany()
    return rows.map((row) => ({
      publicKey: row.publicKey,
      nickname: row.nickname ?? undefined,
      isMain: row.isMain,
      addedAt: row.addedAt,
    }))
  }

  async addWallet(wallet: Omit<Wallet, "addedAt">): Promise<Wallet> {
    const newWallet = {
      publicKey: wallet.publicKey,
      nickname: wallet.nickname ?? null,
      isMain: wallet.isMain,
      addedAt: Date.now(),
    }
    await this.db.insert(schema.wallets).values(newWallet)
    return {
      publicKey: newWallet.publicKey,
      nickname: newWallet.nickname ?? undefined,
      isMain: newWallet.isMain,
      addedAt: newWallet.addedAt,
    }
  }

  async removeWallet(publicKey: string): Promise<boolean> {
    const existing = await this.db.query.wallets.findFirst({
      where: eq(schema.wallets.publicKey, publicKey),
    })
    if (!existing) return false
    await this.db.delete(schema.wallets).where(eq(schema.wallets.publicKey, publicKey))
    return true
  }

  // Dandies (stored as JSON in meta table)
  async getDandies(): Promise<{ mints: string[]; verifiedAt: number } | null> {
    const row = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "dandies"),
    })
    if (!row) return null
    return JSON.parse(row.value) as { mints: string[]; verifiedAt: number }
  }

  async setDandies(mints: string[]): Promise<void> {
    const value = JSON.stringify({ mints, verifiedAt: Date.now() })
    const existing = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "dandies"),
    })
    if (existing) {
      await this.db.update(schema.meta).set({ value }).where(eq(schema.meta.key, "dandies"))
    } else {
      await this.db.insert(schema.meta).values({ key: "dandies", value })
    }
  }

  // Username
  async getUsername(): Promise<string | null> {
    const row = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "username"),
    })
    if (!row) return null
    return row.value
  }

  async setUsername(username: string): Promise<void> {
    const value = username.toLowerCase()
    const existing = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "username"),
    })
    if (existing) {
      await this.db.update(schema.meta).set({ value }).where(eq(schema.meta.key, "username"))
    } else {
      await this.db.insert(schema.meta).values({ key: "username", value })
    }
  }

  async clearUsername(): Promise<void> {
    await this.db.delete(schema.meta).where(eq(schema.meta.key, "username"))
  }

  // Showcase (stored as JSON in meta table)
  async getShowcase(): Promise<ShowcaseConfig | null> {
    const row = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "showcase"),
    })
    if (!row) return null
    return JSON.parse(row.value) as ShowcaseConfig
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
    const value = JSON.stringify(updated)
    const existing = await this.db.query.meta.findFirst({
      where: eq(schema.meta.key, "showcase"),
    })
    if (existing) {
      await this.db.update(schema.meta).set({ value }).where(eq(schema.meta.key, "showcase"))
    } else {
      await this.db.insert(schema.meta).values({ key: "showcase", value })
    }
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
        const body = await request.json<{ id: string; name: string; color: string }>()
        return Response.json(await this.addTag(body))
      }
      if (path.startsWith("/tags/") && request.method === "PATCH") {
        const id = path.split("/")[2]
        const body = await request.json<Partial<{ name: string; color: string }>>()
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
