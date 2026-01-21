import { createMiddleware } from "hono/factory"
import type { HonoEnv } from "../types"

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization header" }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT user_id, wallet FROM sessions WHERE token = ? AND expires_at > ?"
    )
      .bind(token, Date.now())
      .all()

    if (results.length === 0) {
      return c.json({ error: "Invalid or expired session" }, 401)
    }

    const session = results[0]
    c.set("userId", session.user_id as string)
    c.set("wallet", session.wallet as string)

    await next()
  } catch (err) {
    console.error("Auth middleware error:", err)
    return c.json({ error: "Authentication failed" }, 500)
  }
})
