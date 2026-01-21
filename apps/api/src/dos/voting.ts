import { DurableObject } from "cloudflare:workers"
import type { Env } from "../types"

interface VoteRecord {
  visupporterId: string
  timestamp: number
}

interface ShowcaseVotes {
  total: number
  votes: VoteRecord[]
}

interface DailyVotes {
  date: string
  votes: string[] // usernames voted for
}

export class VotingDO extends DurableObject<Env> {
  private showcaseVotes: Map<string, ShowcaseVotes> = new Map()
  private userDailyVotes: Map<string, DailyVotes> = new Map()
  private initialized = false

  private async init() {
    if (this.initialized) return
    const stored = await this.ctx.storage.get<{
      showcaseVotes: Record<string, ShowcaseVotes>
      userDailyVotes: Record<string, DailyVotes>
    }>("data")
    if (stored) {
      this.showcaseVotes = new Map(Object.entries(stored.showcaseVotes))
      this.userDailyVotes = new Map(Object.entries(stored.userDailyVotes))
    }
    this.initialized = true
  }

  private async save() {
    await this.ctx.storage.put("data", {
      showcaseVotes: Object.fromEntries(this.showcaseVotes),
      userDailyVotes: Object.fromEntries(this.userDailyVotes),
    })
  }

  private getTodayString(): string {
    return new Date().toISOString().split("T")[0]
  }

  private getUserDailyVotes(userId: string): DailyVotes {
    const today = this.getTodayString()
    const existing = this.userDailyVotes.get(userId)
    if (existing && existing.date === today) {
      return existing
    }
    return { date: today, votes: [] }
  }

  async vote(
    userId: string,
    showcaseUsername: string
  ): Promise<{ success: boolean; error?: string; remaining?: number }> {
    await this.init()

    const dailyVotes = this.getUserDailyVotes(userId)
    const maxVotes = 3

    if (dailyVotes.votes.length >= maxVotes) {
      return { success: false, error: "No votes remaining today", remaining: 0 }
    }

    if (dailyVotes.votes.includes(showcaseUsername)) {
      return {
        success: false,
        error: "Already voted for this showcase today",
        remaining: maxVotes - dailyVotes.votes.length,
      }
    }

    // Record the vote
    dailyVotes.votes.push(showcaseUsername)
    this.userDailyVotes.set(userId, dailyVotes)

    // Update showcase vote count
    const showcaseData = this.showcaseVotes.get(showcaseUsername) ?? { total: 0, votes: [] }
    showcaseData.total += 1
    showcaseData.votes.push({ visupporterId: userId, timestamp: Date.now() })
    this.showcaseVotes.set(showcaseUsername, showcaseData)

    await this.save()

    return { success: true, remaining: maxVotes - dailyVotes.votes.length }
  }

  async getShowcaseVotes(showcaseUsername: string): Promise<number> {
    await this.init()
    return this.showcaseVotes.get(showcaseUsername)?.total ?? 0
  }

  async getRemainingVotes(userId: string): Promise<{ remaining: number; votedFor: string[] }> {
    await this.init()
    const dailyVotes = this.getUserDailyVotes(userId)
    return { remaining: 3 - dailyVotes.votes.length, votedFor: dailyVotes.votes }
  }

  async getLeaderboard(limit: number = 20): Promise<Array<{ username: string; votes: number }>> {
    await this.init()
    const entries = Array.from(this.showcaseVotes.entries())
      .map(([username, data]) => ({ username, votes: data.total }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit)
    return entries
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    if (request.method === "POST" && path === "/vote") {
      const { userId, showcaseUsername } = await request.json<{ userId: string; showcaseUsername: string }>()
      const result = await this.vote(userId, showcaseUsername)
      return Response.json(result, { status: result.success ? 200 : 400 })
    }

    if (request.method === "GET" && path.startsWith("/showcase/")) {
      const showcaseUsername = path.replace("/showcase/", "")
      const votes = await this.getShowcaseVotes(showcaseUsername)
      return Response.json({ votes })
    }

    if (request.method === "GET" && path.startsWith("/remaining/")) {
      const userId = path.replace("/remaining/", "")
      const result = await this.getRemainingVotes(userId)
      return Response.json(result)
    }

    if (request.method === "GET" && path === "/leaderboard") {
      const limit = parseInt(url.searchParams.get("limit") ?? "20")
      const leaderboard = await this.getLeaderboard(limit)
      return Response.json(leaderboard)
    }

    return Response.json({ error: "Not found" }, { status: 404 })
  }
}
