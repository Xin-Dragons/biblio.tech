import { Hono } from "hono"
import { PublicKey } from "@solana/web3.js"
import bs58 from "bs58"
import type { HonoEnv } from "../types"
import { authMiddleware } from "../middleware/auth"
import { Tier, getTierFromStakedCount, getVotesForTier, FEE_DISCOUNTS } from "../lib/tiers"
import { getCachedStakeRecords } from "./stake"
import { getAssetsByOwner, type DASAsset, type DASCollection } from "../services/das"
import { getNiftyAssetsByOwner, fetchNiftyCollections, type NiftyAsset } from "../services/nifty"

async function verifySignature(publicKey: string, signature: string, message: string): Promise<boolean> {
  try {
    const pubKeyBytes = bs58.decode(publicKey)
    const signatureBytes = Buffer.from(signature, "base64")
    const messageBytes = new TextEncoder().encode(message)

    const cryptoKey = await crypto.subtle.importKey("raw", pubKeyBytes, { name: "Ed25519" }, false, ["verify"])

    return await crypto.subtle.verify("Ed25519", cryptoKey, signatureBytes, messageBytes)
  } catch (err) {
    console.error("Signature verification error:", err)
    return false
  }
}

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

  const recordsPromises = wallets.map(({ publicKey: wallet }) => getCachedStakeRecords(c.env, wallet))
  const allRecords = await Promise.all(recordsPromises)
  stakedCount = allRecords.reduce((sum, records) => sum + records.length, 0)

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

// Link a new wallet with signature verification
userRoutes.post("/wallets/link", async (c) => {
  const { publicKey, signature, message, isLedger } = await c.req.json<{
    publicKey: string
    signature: string
    message: string
    isLedger: boolean
    rawTransaction?: string
  }>()

  if (!publicKey || !signature || !message) {
    return c.json({ error: "Missing required fields" }, 400)
  }

  // Validate public key format
  try {
    new PublicKey(publicKey)
  } catch {
    return c.json({ error: "Invalid public key format" }, 400)
  }

  // Check if wallet is already linked to another user
  const { results: existingWallet } = await c.env.DB.prepare("SELECT user_id FROM wallet_users WHERE wallet = ?")
    .bind(publicKey)
    .all()

  const userId = c.get("userId")

  if (existingWallet.length > 0) {
    const existingUserId = existingWallet[0].user_id as string

    if (existingUserId === userId) {
      // Check if wallet actually exists in UserDO (may be stale entry from previous bug)
      const userDO = getUserDO(c)
      const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
      const wallets = await walletsRes.json<Array<{ publicKey: string }>>()
      const existsInUserDO = wallets.some((w) => w.publicKey === publicKey)

      if (existsInUserDO) {
        return c.json({ error: "Wallet is already linked to your account" }, 400)
      }

      // Stale entry - clean up wallet_users and proceed with fresh link
      await c.env.DB.prepare("DELETE FROM wallet_users WHERE wallet = ? AND user_id = ?").bind(publicKey, userId).run()
    } else {
      // Check if the other user is an "orphan" (only has this one wallet)
      const { results: otherUserWallets } = await c.env.DB.prepare("SELECT wallet FROM wallet_users WHERE user_id = ?")
        .bind(existingUserId)
        .all()

      if (otherUserWallets.length === 1) {
        // Orphan user - take over the wallet
        // Delete from old user's wallet_users
        await c.env.DB.prepare("DELETE FROM wallet_users WHERE wallet = ? AND user_id = ?")
          .bind(publicKey, existingUserId)
          .run()

        // Clean up orphan user's UserDO
        const orphanDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(existingUserId))
        await orphanDO.fetch(new Request(`http://do/wallets/${publicKey}`, { method: "DELETE" }))
      } else {
        // Not an orphan - wallet is genuinely linked to another active account
        return c.json({ error: "Wallet is already linked to another account" }, 400)
      }
    }
  }

  // Verify the signature
  const isValid = await verifySignature(publicKey, signature, message)
  if (!isValid) {
    return c.json({ error: "Invalid signature" }, 401)
  }

  // Add wallet to database
  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401)
  }

  await c.env.DB.prepare("INSERT INTO wallet_users (wallet, user_id) VALUES (?, ?)").bind(publicKey, userId).run()

  // Add to UserDO
  const userDO = getUserDO(c)
  const res = await userDO.fetch(
    new Request("http://do/wallets", {
      method: "POST",
      body: JSON.stringify({ publicKey, isMain: false }),
    })
  )

  if (!res.ok) {
    // Rollback database insert
    await c.env.DB.prepare("DELETE FROM wallet_users WHERE wallet = ? AND user_id = ?").bind(publicKey, userId).run()
    return c.json({ error: "Failed to link wallet" }, 500)
  }

  return c.json(await res.json())
})

// Unlink a wallet (no signature required - session auth is sufficient)
userRoutes.delete("/wallets/:publicKey", async (c) => {
  const walletToUnlink = c.req.param("publicKey")

  const userDO = getUserDO(c)
  const userId = c.get("userId")
  if (!userId) {
    return c.json({ error: "Not authenticated" }, 401)
  }

  // Get all user wallets to check if this is the main wallet
  const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
  const wallets = await walletsRes.json<Array<{ publicKey: string; isMain: boolean }>>()

  const walletToRemove = wallets.find((w) => w.publicKey === walletToUnlink)
  if (!walletToRemove) {
    return c.json({ error: "Wallet not found" }, 404)
  }

  if (walletToRemove.isMain) {
    return c.json({ error: "Cannot unlink main wallet" }, 400)
  }

  // Remove from UserDO
  const res = await userDO.fetch(new Request(`http://do/wallets/${walletToUnlink}`, { method: "DELETE" }))
  if (!res.ok) {
    return c.json({ error: "Failed to unlink wallet" }, 500)
  }

  // Remove from database
  await c.env.DB.prepare("DELETE FROM wallet_users WHERE wallet = ? AND user_id = ?").bind(walletToUnlink, userId).run()

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
  const recordsPromises = wallets.map(({ publicKey: wallet }) => getCachedStakeRecords(c.env, wallet))
  const allRecords = await Promise.all(recordsPromises)
  const stakedCount = allRecords.reduce((sum, records) => sum + records.length, 0)

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

// Dandies collection IDs - nifty Dandies should be merged into pNFT Dandies collection
const DANDIES_PNFT_COLLECTION = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"
const DANDIES_NIFTY_COLLECTION = "BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF"

function mapNiftyAssetToDASFormat(niftyAsset: NiftyAsset, collectionName: string | null, owner: string): DASAsset {
  const groupMatches = niftyAsset.group === DANDIES_NIFTY_COLLECTION
  const collectionId = groupMatches ? DANDIES_PNFT_COLLECTION : niftyAsset.group

  return {
    mint: niftyAsset.address,
    name: niftyAsset.name,
    image: niftyAsset.image ?? "",
    collectionId,
    collectionName,
    attributes: niftyAsset.attributes.map((attr) => ({
      trait_type: attr.name,
      value: attr.value,
    })),
    compressed: false,
    frozen: niftyAsset.state === "Locked",
    delegate: niftyAsset.delegate,
    tokenStandard: "Nifty",
    owner,
  }
}

// NFTs - fetches NFTs for all linked wallets and merges them
userRoutes.get("/nfts", async (c) => {
  const userDO = getUserDO(c)

  // Get all linked wallets
  const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
  const wallets = await walletsRes.json<Array<{ publicKey: string }>>()

  if (wallets.length === 0) {
    return c.json({ mints: [], collections: [], total: 0 })
  }

  // Fetch NFTs for all wallets in parallel
  const walletAddresses = wallets.map((w) => w.publicKey)

  const results = await Promise.all(
    walletAddresses.map(async (wallet) => {
      const [dasResult, niftyAssets] = await Promise.all([
        getAssetsByOwner(c.env, wallet),
        getNiftyAssetsByOwner(c.env, wallet),
      ])

      const { assets: dasAssets, collections: dasCollections } = dasResult

      // Add owner to DAS assets
      for (const asset of dasAssets) {
        asset.owner = wallet
      }

      // Fetch nifty collections
      const niftyCollectionIds = niftyAssets.map((a) => a.group).filter((g): g is string => g !== null)
      const niftyCollections = await fetchNiftyCollections(c.env, niftyCollectionIds)

      // Map nifty assets with owner
      const mappedNiftyAssets: DASAsset[] = niftyAssets.map((niftyAsset) => {
        const collection = niftyAsset.group ? niftyCollections.get(niftyAsset.group) : null
        return mapNiftyAssetToDASFormat(niftyAsset, collection?.name ?? null, wallet)
      })

      return {
        assets: [...dasAssets, ...mappedNiftyAssets],
        collections: dasCollections,
        niftyAssets,
        niftyCollections,
      }
    })
  )

  // Merge all assets, dedupe by mint (keep first occurrence)
  const seenMints = new Set<string>()
  const allAssets: DASAsset[] = []
  const collectionsMap = new Map<string, DASCollection>()

  for (const result of results) {
    for (const asset of result.assets) {
      if (!seenMints.has(asset.mint)) {
        seenMints.add(asset.mint)
        allAssets.push(asset)
      }
    }

    // Merge collections
    for (const col of result.collections) {
      const existing = collectionsMap.get(col.id)
      if (existing) {
        existing.count += col.count
      } else {
        collectionsMap.set(col.id, { ...col })
      }
    }

    // Merge nifty collections
    for (const niftyAsset of result.niftyAssets) {
      if (niftyAsset.group) {
        const collectionId = niftyAsset.group === DANDIES_NIFTY_COLLECTION ? DANDIES_PNFT_COLLECTION : niftyAsset.group
        const existing = collectionsMap.get(collectionId)
        if (existing) {
          existing.count++
        } else {
          const collectionData = result.niftyCollections.get(niftyAsset.group)
          collectionsMap.set(collectionId, {
            id: collectionId,
            name: collectionData?.name ?? niftyAsset.group,
            image: collectionData?.image ?? null,
            count: 1,
          })
        }
      }
    }
  }

  return c.json({
    mints: allAssets,
    collections: Array.from(collectionsMap.values()),
    total: allAssets.length,
  })
})
