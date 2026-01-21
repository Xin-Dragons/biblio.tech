import type { UserDO } from "./dos/user"
import type { RateLimiterDO } from "./dos/rate-limiter"
import type { TensorRateLimiterDO } from "./dos/tensor-rate-limiter"

export interface Env {
  // Durable Objects
  USER_DO: DurableObjectNamespace<UserDO>
  RATE_LIMITER_DO: DurableObjectNamespace<RateLimiterDO>
  TENSOR_RATE_LIMITER_DO: DurableObjectNamespace<TensorRateLimiterDO>

  // D1 Database
  DB: D1Database

  // Environment variables
  ENVIRONMENT: string

  // Secrets (set via wrangler secret put)
  TENSOR_API_KEY: string
  HELIUS_API_KEY: string
  SESSION_SECRET: string
}

export type HonoEnv = {
  Bindings: Env
  Variables: {
    userId?: string
    wallet?: string
  }
}
