import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import type { HonoEnv } from "./types"
import { authRoutes } from "./routes/auth"
import { userRoutes } from "./routes/user"
import { nftsRoutes } from "./routes/nfts"
import { tokensRoutes } from "./routes/tokens"
import { healthRoutes } from "./routes/health"
import { showcaseRoutes } from "./routes/showcase"
import { lockRoutes } from "./routes/lock"
import { stakeRoutes } from "./routes/stake"

// Export Durable Objects
export { UserDO } from "./dos/user"
export { RateLimiterDO } from "./dos/rate-limiter"
export { TensorRateLimiterDO } from "./dos/tensor-rate-limiter"
export { UsernamesDO } from "./dos/usernames"
export { VotingDO } from "./dos/voting"

const app = new Hono<HonoEnv>()

// Middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://biblio.tech"],
    credentials: true,
  })
)

// Routes
app.route("/health", healthRoutes)
app.route("/auth", authRoutes)
app.route("/user", userRoutes)
app.route("/nfts", nftsRoutes)
app.route("/tokens", tokensRoutes)
app.route("/showcase", showcaseRoutes)
app.route("/lock", lockRoutes)
app.route("/stake", stakeRoutes)

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err)
  return c.json({ error: "Internal server error" }, 500)
})

export default app
