import { DurableObject } from "cloudflare:workers"
import type { HonoEnv } from "../types"

/**
 * TensorRateLimiterDO - Token bucket rate limiter for Tensor API
 *
 * Uses Cloudflare's recommended Durable Object pattern for rate limiting.
 * A single global instance manages all Tensor API calls to ensure we stay
 * under Tensor's 1000 requests/minute limit.
 *
 * Token bucket algorithm:
 * - Starts with full capacity (1000 tokens = 1000 requests/minute)
 * - Each API call consumes 1 token
 * - Tokens replenish at ~17 tokens/second (1000/60)
 * - If no tokens available, caller waits until tokens replenish
 */
export class TensorRateLimiterDO extends DurableObject<HonoEnv["Bindings"]> {
  private static readonly CAPACITY = 1000
  private static readonly REPLENISH_INTERVAL_MS = 1000
  private static readonly TOKENS_PER_INTERVAL = 17

  private tokens: number | null = null
  private lastReplenish: number | null = null
  private initialized = false

  constructor(ctx: DurableObjectState, env: HonoEnv["Bindings"]) {
    super(ctx, env)
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    const stored = await this.ctx.storage.get<{
      tokens: number
      lastReplenish: number
    }>("state")

    if (stored) {
      this.tokens = stored.tokens
      this.lastReplenish = stored.lastReplenish
    } else {
      this.tokens = TensorRateLimiterDO.CAPACITY
      this.lastReplenish = Date.now()
    }

    this.initialized = true
  }

  private async persistState(): Promise<void> {
    await this.ctx.storage.put("state", {
      tokens: this.tokens,
      lastReplenish: this.lastReplenish,
    })
  }

  async acquire(count: number = 1): Promise<number> {
    if (isNaN(count) || count <= 0) {
      throw new Error(`Invalid requested count: ${count}`)
    }
    if (count > TensorRateLimiterDO.CAPACITY) {
      throw new Error(`Requested count ${count} exceeds maximum capacity ${TensorRateLimiterDO.CAPACITY}`)
    }
    await this.ensureInitialized()
    this.replenishTokens()

    if (this.tokens! >= count) {
      this.tokens! -= count
      await this.persistState()
      await this.scheduleReplenish()
      return 0
    }

    const tokensNeeded = count - this.tokens!
    const intervalsNeeded = Math.ceil(tokensNeeded / TensorRateLimiterDO.TOKENS_PER_INTERVAL)
    const waitMs = intervalsNeeded * TensorRateLimiterDO.REPLENISH_INTERVAL_MS

    await new Promise((resolve) => setTimeout(resolve, waitMs))

    this.replenishTokens()
    this.tokens = Math.max(0, this.tokens! - count)
    await this.persistState()
    await this.scheduleReplenish()

    return waitMs
  }

  async checkAvailable(count: number = 1): Promise<boolean> {
    await this.ensureInitialized()
    this.replenishTokens()
    return this.tokens! >= count
  }

  async getStatus(): Promise<{
    tokens: number
    capacity: number
    utilizationPct: number
  }> {
    await this.ensureInitialized()
    this.replenishTokens()
    return {
      tokens: this.tokens!,
      capacity: TensorRateLimiterDO.CAPACITY,
      utilizationPct: Math.round(((TensorRateLimiterDO.CAPACITY - this.tokens!) / TensorRateLimiterDO.CAPACITY) * 100),
    }
  }

  private replenishTokens(): void {
    const now = Date.now()
    const elapsed = now - this.lastReplenish!
    const intervals = Math.floor(elapsed / TensorRateLimiterDO.REPLENISH_INTERVAL_MS)

    if (intervals > 0) {
      const tokensToAdd = intervals * TensorRateLimiterDO.TOKENS_PER_INTERVAL
      this.tokens = Math.min(TensorRateLimiterDO.CAPACITY, this.tokens! + tokensToAdd)
      this.lastReplenish = now - (elapsed % TensorRateLimiterDO.REPLENISH_INTERVAL_MS)
    }
  }

  private async scheduleReplenish(): Promise<void> {
    if (this.tokens! < TensorRateLimiterDO.CAPACITY) {
      const currentAlarm = await this.ctx.storage.getAlarm()
      if (currentAlarm === null) {
        await this.ctx.storage.setAlarm(Date.now() + TensorRateLimiterDO.REPLENISH_INTERVAL_MS)
      }
    }
  }

  async alarm(): Promise<void> {
    await this.ensureInitialized()
    this.replenishTokens()
    await this.persistState()

    if (this.tokens! < TensorRateLimiterDO.CAPACITY) {
      await this.ctx.storage.setAlarm(Date.now() + TensorRateLimiterDO.REPLENISH_INTERVAL_MS)
    }
  }
}
