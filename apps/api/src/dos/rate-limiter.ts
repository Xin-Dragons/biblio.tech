import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

type ProviderType = "helius" | "tensor"

interface ProviderQuota {
  provider: ProviderType
  tokens: number
  capacity: number
  circuitBreakerState: "closed" | "open" | "half_open"
  failureCount: number
  successCount: number
  lastFailureTime: number
  utilizationPct: number
}

export class RateLimiterDO extends DurableObject<Env> {
  static readonly CAPACITY = 10000
  static readonly TOKENS_PER_UPDATE = 100
  static readonly REFILL_INTERVAL_MS = 1000

  private tokens: number
  private providerQuotas: Map<ProviderType, ProviderQuota> = new Map()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.tokens = RateLimiterDO.CAPACITY
  }

  async spendPoints(cost: number): Promise<boolean> {
    await this.checkAndSetAlarm()

    const hasCredits = this.tokens >= cost
    this.tokens = Math.max(this.tokens - cost, 0)

    // Returns true if rate limited (no credits)
    return !hasCredits
  }

  private async checkAndSetAlarm(): Promise<void> {
    const currentAlarm = await this.ctx.storage.getAlarm()
    if (currentAlarm == null || currentAlarm < Date.now()) {
      await this.ctx.storage.setAlarm(Date.now() + RateLimiterDO.REFILL_INTERVAL_MS)
    }
  }

  async alarm(): Promise<void> {
    if (this.tokens < RateLimiterDO.CAPACITY) {
      this.tokens = Math.min(RateLimiterDO.CAPACITY, this.tokens + RateLimiterDO.TOKENS_PER_UPDATE)
      await this.checkAndSetAlarm()
    }

    // Check half-open circuit breakers
    for (const [provider, quota] of this.providerQuotas) {
      if (
        quota.circuitBreakerState === "open" &&
        Date.now() - quota.lastFailureTime > 30000 // 30s cooldown
      ) {
        quota.circuitBreakerState = "half_open"
        quota.successCount = 0
        this.providerQuotas.set(provider, quota)
      }
    }
  }

  getProviderStatus(provider: ProviderType): ProviderQuota {
    const q = this.providerQuotas.get(provider) ?? {
      provider,
      tokens: RateLimiterDO.CAPACITY,
      capacity: RateLimiterDO.CAPACITY,
      circuitBreakerState: "closed" as const,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      utilizationPct: 0,
    }

    return {
      ...q,
      utilizationPct: Math.round((1 - q.tokens / q.capacity) * 100),
    }
  }

  recordProviderFailure(provider: ProviderType): void {
    const q = this.providerQuotas.get(provider) ?? {
      provider,
      tokens: RateLimiterDO.CAPACITY,
      capacity: RateLimiterDO.CAPACITY,
      circuitBreakerState: "closed" as const,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      utilizationPct: 0,
    }

    q.failureCount++
    q.lastFailureTime = Date.now()

    // Open circuit after 5 consecutive failures
    if (q.failureCount >= 5) {
      q.circuitBreakerState = "open"
    }

    this.providerQuotas.set(provider, q)
  }

  recordProviderSuccess(provider: ProviderType): void {
    const q = this.providerQuotas.get(provider)
    if (!q) return

    q.successCount++

    // Close circuit after 3 successes in half-open state
    if (q.circuitBreakerState === "half_open" && q.successCount >= 3) {
      q.circuitBreakerState = "closed"
      q.failureCount = 0
    }

    this.providerQuotas.set(provider, q)
  }

  isProviderAvailable(provider: ProviderType): boolean {
    const q = this.providerQuotas.get(provider)
    if (!q) return true
    return q.circuitBreakerState !== "open"
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/spend" && request.method === "POST") {
      const { cost } = await request.json<{ cost: number }>()
      const rateLimited = await this.spendPoints(cost)
      return Response.json({ rateLimited, remaining: this.tokens })
    }

    if (url.pathname === "/status" && request.method === "GET") {
      const provider = url.searchParams.get("provider") as ProviderType
      if (provider) {
        return Response.json(this.getProviderStatus(provider))
      }
      return Response.json({
        tokens: this.tokens,
        capacity: RateLimiterDO.CAPACITY,
      })
    }

    if (url.pathname === "/failure" && request.method === "POST") {
      const { provider } = await request.json<{ provider: ProviderType }>()
      this.recordProviderFailure(provider)
      return new Response(null, { status: 204 })
    }

    if (url.pathname === "/success" && request.method === "POST") {
      const { provider } = await request.json<{ provider: ProviderType }>()
      this.recordProviderSuccess(provider)
      return new Response(null, { status: 204 })
    }

    return new Response("Not found", { status: 404 })
  }
}
