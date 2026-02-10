import type { UserDO } from "./dos/user"
import type { RateLimiterDO } from "./dos/rate-limiter"
import type { TensorRateLimiterDO } from "./dos/tensor-rate-limiter"
import type { UsernamesDO } from "./dos/usernames"
import type { VotingDO } from "./dos/voting"
import type { RpcWebSocketDO } from "./dos/rpc-websocket"
import type { StakerSettingsDO } from "./dos/staker-settings"
import type { NftCacheDO } from "./dos/nft-cache"

export interface Env {
  // Durable Objects
  USER_DO: DurableObjectNamespace<UserDO>
  RATE_LIMITER_DO: DurableObjectNamespace<RateLimiterDO>
  TENSOR_RATE_LIMITER_DO: DurableObjectNamespace<TensorRateLimiterDO>
  USERNAMES_DO: DurableObjectNamespace<UsernamesDO>
  VOTING_DO: DurableObjectNamespace<VotingDO>
  RPC_WEBSOCKET_DO: DurableObjectNamespace<RpcWebSocketDO>
  STAKER_SETTINGS_DO: DurableObjectNamespace<StakerSettingsDO>
  NFT_CACHE_DO: DurableObjectNamespace<NftCacheDO>

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
