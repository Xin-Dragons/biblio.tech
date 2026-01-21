import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/
const CONSECUTIVE_DOTS_REGEX = /\.\./

export function isValidUsername(username: string): boolean {
  const lower = username.toLowerCase()
  if (lower.length < 3 || lower.length > 30) return false
  if (!USERNAME_REGEX.test(lower)) return false
  if (CONSECUTIVE_DOTS_REGEX.test(lower)) return false
  return true
}

export class UsernamesDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async isAvailable(username: string): Promise<boolean> {
    const lower = username.toLowerCase()
    if (!isValidUsername(lower)) return false
    const existing = await this.ctx.storage.get<string>(`u:${lower}`)
    return !existing
  }

  async getOwner(username: string): Promise<string | null> {
    const lower = username.toLowerCase()
    return (await this.ctx.storage.get<string>(`u:${lower}`)) ?? null
  }

  async claim(username: string, publicKey: string): Promise<{ success: boolean; error?: string }> {
    const lower = username.toLowerCase()

    if (!isValidUsername(lower)) {
      return { success: false, error: "Invalid username format" }
    }

    const existing = await this.ctx.storage.get<string>(`u:${lower}`)
    if (existing) {
      if (existing === publicKey) {
        return { success: true }
      }
      return { success: false, error: "Username already taken" }
    }

    await this.ctx.storage.put(`u:${lower}`, publicKey)
    await this.ctx.storage.put(`pk:${publicKey}`, lower)
    return { success: true }
  }

  async release(username: string, publicKey: string): Promise<boolean> {
    const lower = username.toLowerCase()
    const owner = await this.ctx.storage.get<string>(`u:${lower}`)
    if (owner !== publicKey) return false

    await this.ctx.storage.delete(`u:${lower}`)
    await this.ctx.storage.delete(`pk:${publicKey}`)
    return true
  }

  async getUsernameByPublicKey(publicKey: string): Promise<string | null> {
    return (await this.ctx.storage.get<string>(`pk:${publicKey}`)) ?? null
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      if (path === "/check" && request.method === "GET") {
        const username = url.searchParams.get("username")
        if (!username) {
          return Response.json({ error: "Missing username parameter" }, { status: 400 })
        }
        const available = await this.isAvailable(username)
        const valid = isValidUsername(username.toLowerCase())
        return Response.json({ username: username.toLowerCase(), available, valid })
      }

      if (path === "/owner" && request.method === "GET") {
        const username = url.searchParams.get("username")
        if (!username) {
          return Response.json({ error: "Missing username parameter" }, { status: 400 })
        }
        const owner = await this.getOwner(username)
        return Response.json({ username: username.toLowerCase(), owner })
      }

      if (path === "/by-public-key" && request.method === "GET") {
        const publicKey = url.searchParams.get("publicKey")
        if (!publicKey) {
          return Response.json({ error: "Missing publicKey parameter" }, { status: 400 })
        }
        const username = await this.getUsernameByPublicKey(publicKey)
        return Response.json({ publicKey, username })
      }

      if (path === "/claim" && request.method === "POST") {
        const { username, publicKey } = await request.json<{ username: string; publicKey: string }>()
        const result = await this.claim(username, publicKey)
        if (!result.success) {
          return Response.json({ error: result.error }, { status: 400 })
        }
        return Response.json({ success: true, username: username.toLowerCase() })
      }

      if (path === "/release" && request.method === "POST") {
        const { username, publicKey } = await request.json<{ username: string; publicKey: string }>()
        const released = await this.release(username, publicKey)
        if (!released) {
          return Response.json({ error: "Not the owner or username not found" }, { status: 400 })
        }
        return Response.json({ success: true })
      }

      return new Response("Not found", { status: 404 })
    } catch (err) {
      console.error("UsernamesDO error:", err)
      return new Response("Internal error", { status: 500 })
    }
  }
}
