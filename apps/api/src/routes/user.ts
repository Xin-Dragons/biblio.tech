import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { authMiddleware } from "../middleware/auth"
import { getStakeRecordsByOwner } from "../services/stake"
import { Tier, getTierFromStakedCount, getVotesForTier, FEE_DISCOUNTS } from "../lib/tiers"

const DANDIES_STAKER_PUBKEY = "6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a"

export const userRoutes = new Hono<HonoEnv>()

// All user routes require authentication
userRoutes.use("*", authMiddleware)

// Helper to get UserDO for current user
function getUserDO(c: { env: HonoEnv["Bindings"]; get: (key: string) => string | undefined }) {
  const userId = c.get("userId")
  if (!userId) throw new Error("No userId in context")
  return c.env.USER_DO.get(c.env.USER_DO.idFromName(userId))
}

// Tags
userRoutes.get("/tags", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/tags"))
  return c.json(await res.json())
})

userRoutes.post("/tags", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request("http://do/tags", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
  return c.json(await res.json())
})

userRoutes.patch("/tags/:id", async (c) => {
  const userDO = getUserDO(c)
  const id = c.req.param("id")
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request(`http://do/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  )
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.json(await res.json())
})

userRoutes.delete("/tags/:id", async (c) => {
  const userDO = getUserDO(c)
  const id = c.req.param("id")
  const res = await userDO.fetch(new Request(`http://do/tags/${id}`, { method: "DELETE" }))
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.body(null, 204)
})

// Tagged NFTs
userRoutes.get("/tagged", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/tagged"))
  return c.json(await res.json())
})

userRoutes.put("/tagged/:tagId", async (c) => {
  const userDO = getUserDO(c)
  const tagId = c.req.param("tagId")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/tagged/${tagId}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

userRoutes.delete("/tagged/:tagId", async (c) => {
  const userDO = getUserDO(c)
  const tagId = c.req.param("tagId")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/tagged/${tagId}`, {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Starred
userRoutes.get("/starred", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/starred"))
  return c.json(await res.json())
})

userRoutes.put("/starred", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/starred", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

userRoutes.delete("/starred", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/starred", {
      method: "DELETE",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Preferences
userRoutes.get("/preferences", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.query("context") ?? "defaults"
  const res = await userDO.fetch(new Request(`http://do/preferences?context=${context}`))
  return c.json(await res.json())
})

userRoutes.put("/preferences", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.query("context") ?? "defaults"
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/preferences?context=${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Custom order
userRoutes.get("/order/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/order/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/order/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/order/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Collage sizes
userRoutes.get("/sizes/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/sizes/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/sizes/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/sizes/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Tier
export type TierResponse = {
  tier: Tier
  stakedCount: number
  votesPerDay: number
  feeDiscount: number
  hasVanityAccess: boolean
}

userRoutes.get("/tier", async (c) => {
  const userDO = getUserDO(c)

  const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
  const wallets = await walletsRes.json<Array<{ publicKey: string }>>()

  let stakedCount = 0

  for (const { publicKey: wallet } of wallets) {
    const records = await getStakeRecordsByOwner(c.env, wallet)
    const dandiesRecords = records.filter((r) => r.staker === DANDIES_STAKER_PUBKEY)
    stakedCount += dandiesRecords.length
  }

  const tier = getTierFromStakedCount(stakedCount)
  const votesPerDay = getVotesForTier(tier)
  const feeDiscount = FEE_DISCOUNTS[tier]
  const hasVanityAccess = tier === Tier.Gold || tier === Tier.Diamond

  return c.json<TierResponse>({
    tier,
    stakedCount,
    votesPerDay,
    feeDiscount,
    hasVanityAccess,
  })
})

// Collage layout
userRoutes.get("/layout/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const res = await userDO.fetch(new Request(`http://do/layout/${context}`))
  return c.json(await res.json())
})

userRoutes.put("/layout/:context", async (c) => {
  const userDO = getUserDO(c)
  const context = c.req.param("context")
  const body = await c.req.json()
  await userDO.fetch(
    new Request(`http://do/layout/${context}`, {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// Wallets
userRoutes.get("/wallets", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/wallets"))
  return c.json(await res.json())
})

userRoutes.post("/wallets", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request("http://do/wallets", {
      method: "POST",
      body: JSON.stringify(body),
    })
  )
  return c.json(await res.json())
})

userRoutes.delete("/wallets/:publicKey", async (c) => {
  const userDO = getUserDO(c)
  const publicKey = c.req.param("publicKey")
  const res = await userDO.fetch(new Request(`http://do/wallets/${publicKey}`, { method: "DELETE" }))
  if (!res.ok) return c.json({ error: "Not found" }, 404)
  return c.body(null, 204)
})

// Dandies
userRoutes.get("/dandies", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/dandies"))
  return c.json(await res.json())
})

userRoutes.put("/dandies", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  await userDO.fetch(
    new Request("http://do/dandies", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

// NFT Cache
function getNftCacheDO(c: { env: HonoEnv["Bindings"] }, wallet: string) {
  const id = c.env.NFT_CACHE_DO.idFromName(wallet)
  return c.env.NFT_CACHE_DO.get(id)
}

userRoutes.get("/nft-cache/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const stub = getNftCacheDO(c, wallet)
  const res = await stub.fetch(new Request("http://do/cache"))
  return c.json(await res.json())
})

userRoutes.put("/nft-cache/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const body = await c.req.json()
  const stub = getNftCacheDO(c, wallet)
  await stub.fetch(
    new Request("http://do/cache", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  )
  return c.body(null, 204)
})

userRoutes.delete("/nft-cache/:wallet", async (c) => {
  const wallet = c.req.param("wallet")
  const stub = getNftCacheDO(c, wallet)
  await stub.fetch(new Request("http://do/cache", { method: "DELETE" }))
  return c.body(null, 204)
})

// Username
function getUsernamesDO(c: { env: HonoEnv["Bindings"] }) {
  return c.env.USERNAMES_DO.get(c.env.USERNAMES_DO.idFromName("global"))
}

userRoutes.get("/username", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/username"))
  return c.json(await res.json())
})

userRoutes.post("/username", async (c) => {
  const userDO = getUserDO(c)
  const usernamesDO = getUsernamesDO(c)
  const userId = c.get("userId")
  if (!userId) return c.json({ error: "Unauthorized" }, 401)

  const { username } = await c.req.json<{ username: string }>()

  // Get user's linked wallets
  const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
  const wallets = await walletsRes.json<Array<{ publicKey: string }>>()

  if (wallets.length === 0) {
    return c.json({ error: "No wallets linked" }, 400)
  }

  // Count staked Dandies across all linked wallets
  let stakedCount = 0
  for (const { publicKey: wallet } of wallets) {
    const records = await getStakeRecordsByOwner(c.env, wallet)
    const dandiesRecords = records.filter((r) => r.staker === DANDIES_STAKER_PUBKEY)
    stakedCount += dandiesRecords.length
  }

  // Check tier requirement (Gold = 15+ staked)
  const tier = getTierFromStakedCount(stakedCount)
  if (tier !== Tier.Gold && tier !== Tier.Diamond) {
    return c.json({ error: "Requires Gold tier (15+ staked Dandies)" }, 403)
  }

  // Claim username mapped to userId
  const claimRes = await usernamesDO.fetch(
    new Request("http://do/claim", {
      method: "POST",
      body: JSON.stringify({ username, publicKey: userId }),
    })
  )

  if (!claimRes.ok) {
    const err = await claimRes.json<{ error: string }>()
    return c.json(err, 400)
  }

  await userDO.fetch(
    new Request("http://do/username", {
      method: "PUT",
      body: JSON.stringify({ username: username.toLowerCase() }),
    })
  )

  return c.json({ success: true, username: username.toLowerCase() })
})

userRoutes.delete("/username", async (c) => {
  const userDO = getUserDO(c)
  const usernamesDO = getUsernamesDO(c)
  const userId = c.get("userId")
  if (!userId) return c.json({ error: "Unauthorized" }, 401)

  const usernameRes = await userDO.fetch(new Request("http://do/username"))
  const { username } = await usernameRes.json<{ username: string | null }>()
  if (!username) return c.json({ error: "No username to release" }, 400)

  await usernamesDO.fetch(
    new Request("http://do/release", {
      method: "POST",
      body: JSON.stringify({ username, publicKey: userId }),
    })
  )

  await userDO.fetch(new Request("http://do/username", { method: "DELETE" }))

  return c.body(null, 204)
})

// Showcase
userRoutes.get("/showcase", async (c) => {
  const userDO = getUserDO(c)
  const res = await userDO.fetch(new Request("http://do/showcase"))
  return c.json(await res.json())
})

userRoutes.put("/showcase", async (c) => {
  const userDO = getUserDO(c)
  const body = await c.req.json()
  const res = await userDO.fetch(
    new Request("http://do/showcase", {
      method: "PUT",
      body: JSON.stringify(body),
    })
  )
  return c.json(await res.json())
})
