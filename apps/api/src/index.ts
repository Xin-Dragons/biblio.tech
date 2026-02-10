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
import { stakeRoutes } from "./routes/stake"
import { rpcRoutes } from "./routes/rpc"
import { imageProxyRoutes } from "./routes/image-proxy"

// Export Durable Objects
export { UserDO } from "./dos/user"
export { RateLimiterDO } from "./dos/rate-limiter"
export { TensorRateLimiterDO } from "./dos/tensor-rate-limiter"
export { UsernamesDO } from "./dos/usernames"
export { VotingDO } from "./dos/voting"
export { RpcWebSocketDO } from "./dos/rpc-websocket"
export { StakerSettingsDO } from "./dos/staker-settings"
export { NftCacheDO } from "./dos/nft-cache"

const app = new Hono<HonoEnv>()

// Middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://biblio.so", "https://beta.biblio.so"],
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
app.route("/stake", stakeRoutes)
app.route("/rpc", rpcRoutes)
app.route("/image-proxy", imageProxyRoutes)

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
