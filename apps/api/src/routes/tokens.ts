import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { rateLimiterMiddleware } from "../middleware/rate-limiter"
import { getTokensByOwner } from "../services/tokens"

export const tokensRoutes = new Hono<HonoEnv>()

tokensRoutes.use("*", rateLimiterMiddleware(10))

tokensRoutes.get("/by-owner/:wallet", async (c) => {
  const wallet = c.req.param("wallet")

  try {
    const tokens = await getTokensByOwner(c.env, wallet)

    return c.json({
      tokens,
      total: tokens.length,
    })
  } catch (err) {
    console.error("Error fetching tokens:", err)
    return c.json({ error: "Failed to fetch tokens" }, 500)
  }
})
