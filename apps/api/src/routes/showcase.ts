import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { isValidUsername } from "../dos/usernames"
import { authMiddleware } from "../middleware/auth"

export const showcaseRoutes = new Hono<HonoEnv>()

function getUsernamesDO(c: { env: HonoEnv["Bindings"] }) {
  return c.env.USERNAMES_DO.get(c.env.USERNAMES_DO.idFromName("global"))
}

function getVotingDO(c: { env: HonoEnv["Bindings"] }) {
  return c.env.VOTING_DO.get(c.env.VOTING_DO.idFromName("global"))
}

// Static routes MUST come before dynamic :username routes

showcaseRoutes.get("/check/:username", async (c) => {
  const username = c.req.param("username")
  const usernamesDO = getUsernamesDO(c)

  const res = await usernamesDO.fetch(new Request(`http://do/check?username=${encodeURIComponent(username)}`))
  return c.json(await res.json())
})

// Leaderboard (public)
showcaseRoutes.get("/leaderboard", async (c) => {
  const limit = parseInt(c.req.query("limit") ?? "20")
  const votingDO = getVotingDO(c)
  const res = await votingDO.fetch(new Request(`http://do/leaderboard?limit=${limit}`))
  const leaderboard = await res.json<Array<{ username: string; votes: number }>>()

  const usernamesDO = getUsernamesDO(c)
  const enriched = await Promise.all(
    leaderboard.map(async (entry) => {
      const ownerRes = await usernamesDO.fetch(
        new Request(`http://do/owner?username=${encodeURIComponent(entry.username)}`)
      )
      const { owner } = await ownerRes.json<{ owner: string | null }>()

      if (!owner) return null

      const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(owner))
      const dandiesRes = await userDO.fetch(new Request("http://do/dandies"))
      const dandies = await dandiesRes.json<{ mints: string[]; verifiedAt: number } | null>()

      return {
        username: entry.username,
        votes: entry.votes,
        dandyCount: dandies?.mints?.length ?? 0,
      }
    })
  )

  return c.json(enriched.filter(Boolean))
})

// Get remaining votes for current user (requires auth)
showcaseRoutes.get("/votes/remaining", authMiddleware, async (c) => {
  const userId = c.get("userId")

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const votingDO = getVotingDO(c)
  const res = await votingDO.fetch(new Request(`http://do/remaining/${encodeURIComponent(userId)}`))
  return c.json(await res.json())
})

// Dynamic routes come after static routes

// Helper to check if a string looks like a Solana public key (base58, 32-44 chars)
function isPublicKey(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str)
}

// Get public showcase - accepts username OR wallet address
showcaseRoutes.get("/:identifier", async (c) => {
  const identifier = c.req.param("identifier")
  const usernamesDO = getUsernamesDO(c)

  let owner: string | null = null
  let displayUsername: string | null = null

  // First try as username if it's a valid username format
  if (isValidUsername(identifier.toLowerCase())) {
    const ownerRes = await usernamesDO.fetch(
      new Request(`http://do/owner?username=${encodeURIComponent(identifier.toLowerCase())}`)
    )
    const result = await ownerRes.json<{ owner: string | null }>()
    owner = result.owner
    if (owner) {
      displayUsername = identifier.toLowerCase()
    }
  }

  // If not found as username, try as wallet address
  if (!owner && isPublicKey(identifier)) {
    owner = identifier
    // For wallet-based showcases, username remains null
  }

  if (!owner) {
    return c.json({ error: "User not found" }, 404)
  }

  const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(owner))

  const [showcaseRes, usernameDataRes, dandiesRes] = await Promise.all([
    userDO.fetch(new Request("http://do/showcase")),
    userDO.fetch(new Request("http://do/username")),
    userDO.fetch(new Request("http://do/dandies")),
  ])

  const showcase = await showcaseRes.json<{
    enabled: boolean
    items: string[]
    order: string[]
    sizes: Record<string, string>
    updatedAt: number
  } | null>()

  const usernameData = await usernameDataRes.json<{ username: string | null }>()
  const dandies = await dandiesRes.json<{ mints: string[]; verifiedAt: number } | null>()

  if (!showcase || !showcase.enabled) {
    return c.json({ error: "Showcase not enabled" }, 404)
  }

  const nftMints = showcase.items.length > 0 ? showcase.items : []

  let nfts: Array<{
    mint: string
    name: string
    image: string
    collectionName: string | null
  }> = []

  if (nftMints.length > 0) {
    const cacheRes = await userDO.fetch(new Request(`http://do/nft-cache/${owner}`))
    const cache = await cacheRes.json<{
      nfts: Array<{
        mint: string
        name: string
        image: string
        collectionName: string | null
      }>
    } | null>()

    if (cache?.nfts) {
      const mintSet = new Set(nftMints)
      nfts = cache.nfts.filter((n) => mintSet.has(n.mint))
    }
  }

  // Use the claimed username for votes lookup, or fall back to the identifier
  const voteKey = displayUsername ?? usernameData.username ?? owner
  const votingDO = getVotingDO(c)
  const votesRes = await votingDO.fetch(new Request(`http://do/showcase/${encodeURIComponent(voteKey)}`))
  const { votes } = await votesRes.json<{ votes: number }>()

  return c.json({
    username: displayUsername ?? usernameData.username,
    publicKey: owner,
    dandyCount: dandies?.mints?.length ?? 0,
    votes,
    showcase: {
      items: nfts,
      order: showcase.order,
      sizes: showcase.sizes,
      updatedAt: showcase.updatedAt,
    },
  })
})

// Get votes for a showcase (public) - accepts username OR wallet address
showcaseRoutes.get("/:identifier/votes", async (c) => {
  const identifier = c.req.param("identifier")
  const votingDO = getVotingDO(c)
  const res = await votingDO.fetch(new Request(`http://do/showcase/${encodeURIComponent(identifier)}`))
  return c.json(await res.json())
})

// Vote for a showcase (requires auth + Dandies ownership) - accepts username OR wallet address
showcaseRoutes.post("/:identifier/vote", authMiddleware, async (c) => {
  const identifier = c.req.param("identifier")
  const userId = c.get("userId")

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  // Verify voter owns at least one Dandy
  const voterDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId))
  const voterDandiesRes = await voterDO.fetch(new Request("http://do/dandies"))
  const voterDandies = await voterDandiesRes.json<{ mints: string[]; verifiedAt: number } | null>()

  if (!voterDandies?.mints?.length) {
    return c.json({ error: "Must own a Dandy to vote" }, 403)
  }

  // Resolve identifier to owner
  let owner: string | null = null
  let voteKey: string = identifier
  const usernamesDO = getUsernamesDO(c)

  // First try as username
  if (isValidUsername(identifier.toLowerCase())) {
    const ownerRes = await usernamesDO.fetch(
      new Request(`http://do/owner?username=${encodeURIComponent(identifier.toLowerCase())}`)
    )
    const result = await ownerRes.json<{ owner: string | null }>()
    owner = result.owner
    if (owner) {
      voteKey = identifier.toLowerCase()
    }
  }

  // If not found as username, try as wallet address
  if (!owner && isPublicKey(identifier)) {
    owner = identifier
    voteKey = identifier
  }

  if (!owner) {
    return c.json({ error: "Showcase not found" }, 404)
  }

  // Can't vote for yourself
  if (owner === userId) {
    return c.json({ error: "Cannot vote for your own showcase" }, 400)
  }

  const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(owner))
  const showcaseRes = await userDO.fetch(new Request("http://do/showcase"))
  const showcase = await showcaseRes.json<{ enabled: boolean } | null>()

  if (!showcase?.enabled) {
    return c.json({ error: "Showcase not enabled" }, 404)
  }

  // Cast the vote using the resolved key
  const votingDO = getVotingDO(c)
  const voteRes = await votingDO.fetch(
    new Request("http://do/vote", {
      method: "POST",
      body: JSON.stringify({ userId, showcaseUsername: voteKey }),
    })
  )

  const result = await voteRes.json<{ success: boolean; error?: string; remaining?: number }>()

  if (!result.success) {
    return c.json(result, 400)
  }

  return c.json(result)
})
