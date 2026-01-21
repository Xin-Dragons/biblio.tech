import { createMiddleware } from "hono/factory"
import type { HonoEnv } from "../types"

export const rateLimiterMiddleware = (cost: number = 10) =>
  createMiddleware<HonoEnv>(async (c, next) => {
    // Use a global rate limiter (could be per-user if needed)
    const id = c.env.RATE_LIMITER_DO.idFromName("global")
    const rateLimiter = c.env.RATE_LIMITER_DO.get(id)

    try {
      const res = await rateLimiter.fetch(
        new Request("http://do/spend", {
          method: "POST",
          body: JSON.stringify({ cost }),
        })
      )

      const { rateLimited, remaining } = await res.json<{
        rateLimited: boolean
        remaining: number
      }>()

      // Add rate limit headers
      c.header("X-RateLimit-Remaining", remaining.toString())

      if (rateLimited) {
        return c.json({ error: "Rate limit exceeded" }, 429)
      }
    } catch (err) {
      console.error("Rate limiter error:", err)
      // Fail open - allow request if rate limiter is down
    }

    await next()
  })
