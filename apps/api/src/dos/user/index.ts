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

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("UserDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
