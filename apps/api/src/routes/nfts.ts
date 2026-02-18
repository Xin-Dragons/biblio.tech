import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { rateLimiterMiddleware } from "../middleware/rate-limiter"
import { heliusService } from "../services/helius"
import { getAssetsByOwner, getAsset, getAssetBatch, mapImageToCdn, type DASAsset, type DASCollection } from "../services/das"
import { getNiftyAssetsByOwner, fetchNiftyCollections, type NiftyAsset } from "../services/nifty"
import { getAssetsByAuthority } from "../services/assets-by-authority"
import { getCachedStakeRecords } from "./stake"

export const nftsRoutes = new Hono<HonoEnv>()

// Dandies collection IDs - nifty Dandies should be merged into pNFT Dandies collection
const DANDIES_PNFT_COLLECTION = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"
const DANDIES_NIFTY_COLLECTION = "BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF"

// Apply rate limiting to all NFT routes
nftsRoutes.use("*", rateLimiterMiddleware(10))

function mapNiftyAssetToDASFormat(niftyAsset: NiftyAsset, collectionName: string | null): DASAsset {
  // Normalize nifty Dandies to use the pNFT Dandies collection ID
  const collectionId = niftyAsset.group === DANDIES_NIFTY_COLLECTION ? DANDIES_PNFT_COLLECTION : niftyAsset.group

  return {
    mint: niftyAsset.address,
    name: niftyAsset.name,
    image: mapImageToCdn(niftyAsset.image ?? "", collectionId ?? undefined),
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
    ruleSet: null,
    staked: false,
  }
}

async function getLinkedWallets(db: D1Database, wallet: string): Promise<string[]> {
  try {
    const { results } = await db.prepare(
      "SELECT wallet FROM wallet_users WHERE user_id = (SELECT user_id FROM wallet_users WHERE wallet = ?)"
    ).bind(wallet).all<{ wallet: string }>()
    return results.map((r) => r.wallet)
  } catch {
    return [wallet]
  }
}

async function fetchFreshNfts(env: HonoEnv["Bindings"], wallet: string) {
  const [dasResult, niftyAssets, stakeRecords] = await Promise.all([
    getAssetsByOwner(env, wallet),
    getNiftyAssetsByOwner(env, wallet),
    getCachedStakeRecords(env, wallet),
  ])

  const stakedMints = new Set(stakeRecords.map((r) => r.nftMint))
  const { assets: dasAssets, collections: dasCollections } = dasResult

  const niftyCollectionIds = niftyAssets.map((a) => a.group).filter((g): g is string => g !== null)
  const niftyCollections = await fetchNiftyCollections(env, niftyCollectionIds)

  const mappedNiftyAssets: DASAsset[] = niftyAssets.map((niftyAsset) => {
    const collection = niftyAsset.group ? niftyCollections.get(niftyAsset.group) : null
    return mapNiftyAssetToDASFormat(niftyAsset, collection?.name ?? null)
  })

  const allAssets = [...dasAssets, ...mappedNiftyAssets]

  for (const asset of allAssets) {
    asset.staked = stakedMints.has(asset.mint)
  }

  const collectionsMap = new Map<string, DASCollection>()
  for (const col of dasCollections) {
    collectionsMap.set(col.id, col)
  }

  for (const niftyAsset of niftyAssets) {
    if (niftyAsset.group) {
      const collectionId = niftyAsset.group === DANDIES_NIFTY_COLLECTION ? DANDIES_PNFT_COLLECTION : niftyAsset.group
      const existing = collectionsMap.get(collectionId)
      if (existing) {
        existing.count++
      } else {
        const collectionData = niftyCollections.get(niftyAsset.group)
        collectionsMap.set(collectionId, {
          id: collectionId,
          name: collectionData?.name ?? niftyAsset.group,
          image: collectionData?.image ?? null,
          count: 1,
        })
      }
    }
  }

  return { mints: allAssets, collections: Array.from(collectionsMap.values()) }
}

function saveNftCache(env: HonoEnv["Bindings"], wallet: string, mints: DASAsset[], collections: DASCollection[]) {
  const cacheId = env.NFT_CACHE_DO.idFromName(wallet)
  const cacheStub = env.NFT_CACHE_DO.get(cacheId)
  const cacheNfts = mints.map((a) => ({
    mint: a.mint,
    name: a.name,
    image: a.image,
    collectionId: a.collectionId ?? "",
    collectionName: a.collectionName,
    attributes: a.attributes,
    frozen: a.frozen,
    delegate: a.delegate,
    compressed: a.compressed,
    tokenStandard: a.tokenStandard,
    staked: a.staked,
  }))
  const cacheCollections = collections.map((col) => ({
    id: col.id,
    name: col.name,
    image: col.image ?? "",
    numMints: col.count,
  }))
  void cacheStub.fetch(
    new Request("http://do/cache", {
      method: "PUT",
      body: JSON.stringify({ nfts: cacheNfts, collections: cacheCollections }),
    })
  )
}

type CachedNft = {
  mint: string
  name: string
  image: string
  collectionId: string
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  frozen: boolean
  delegate: string | null
  compressed: boolean
  tokenStandard: string
  staked?: boolean
}

type CachedCollection = { id: string; name: string; image: string; numMints: number }

type CacheResponse = {
  cached: boolean
  stale?: boolean
  nfts?: CachedNft[]
  collections?: CachedCollection[]
}

async function fetchWalletFromCache(env: HonoEnv["Bindings"], wallet: string) {
  const cacheId = env.NFT_CACHE_DO.idFromName(wallet)
  const cacheStub = env.NFT_CACHE_DO.get(cacheId)
  const cacheRes = await cacheStub.fetch(new Request("http://do/cache"))
  return cacheRes.json<CacheResponse>()
}

function cachedToAssets(cacheData: CacheResponse, owner: string) {
  const mints: DASAsset[] = (cacheData.nfts ?? []).map((nft) => ({
    ...nft,
    owner,
    tokenStandard: nft.tokenStandard as DASAsset["tokenStandard"],
    ruleSet: null,
    staked: nft.staked ?? false,
  }))
  const collections: DASCollection[] = (cacheData.collections ?? []).map((col) => ({
    id: col.id,
    name: col.name,
    image: col.image,
    count: col.numMints,
  }))
  return { mints, collections }
}

function mergeCollections(allCollections: DASCollection[][]): DASCollection[] {
  const map = new Map<string, DASCollection>()
  for (const collections of allCollections) {
    for (const col of collections) {
      const existing = map.get(col.id)
      if (existing) {
        existing.count += col.count
      } else {
        map.set(col.id, { ...col })
      }
    }
  }
  return Array.from(map.values())
}

nftsRoutes.get("/by-owner/:wallet", async (c) => {
  const wallet = c.req.param("wallet")

  try {
    const linkedWallets = await getLinkedWallets(c.env.DB, wallet)
    const isMultiWallet = linkedWallets.length > 1

    if (!isMultiWallet) {
      const cacheData = await fetchWalletFromCache(c.env, wallet)

      if (cacheData.cached && cacheData.nfts && cacheData.collections) {
        const { mints, collections } = cachedToAssets(cacheData, wallet)

        c.executionCtx.waitUntil(
          fetchFreshNfts(c.env, wallet).then(({ mints, collections }) => {
            saveNftCache(c.env, wallet, mints, collections)
          }).catch((err) => console.error("[nfts/by-owner] Background refresh failed:", err))
        )

        return c.json({
          collections,
          mints,
          total: mints.length,
          stale: cacheData.stale ?? false,
        })
      }

      const { mints, collections } = await fetchFreshNfts(c.env, wallet)
      saveNftCache(c.env, wallet, mints, collections)

      return c.json({
        collections,
        mints,
        total: mints.length,
      })
    }

    // Multi-wallet: try cache for all wallets
    const cacheResults = await Promise.all(linkedWallets.map((w) => fetchWalletFromCache(c.env, w)))
    const allCached = cacheResults.every((r) => r.cached && r.nfts && r.collections)

    if (allCached) {
      const allMints: DASAsset[] = []
      const allCollections: DASCollection[][] = []

      for (let i = 0; i < linkedWallets.length; i++) {
        const { mints, collections } = cachedToAssets(cacheResults[i], linkedWallets[i])
        allMints.push(...mints)
        allCollections.push(collections)
      }

      c.executionCtx.waitUntil(
        Promise.all(linkedWallets.map((w) =>
          fetchFreshNfts(c.env, w).then(({ mints, collections }) => {
            saveNftCache(c.env, w, mints, collections)
          })
        )).catch((err) => console.error("[nfts/by-owner] Background refresh failed:", err))
      )

      return c.json({
        collections: mergeCollections(allCollections),
        mints: allMints,
        total: allMints.length,
        stale: cacheResults.some((r) => r.stale),
        linkedWallets,
      })
    }

    // Not all cached - fetch fresh for all wallets
    const freshResults = await Promise.all(linkedWallets.map((w) => fetchFreshNfts(c.env, w)))
    const allMints: DASAsset[] = []
    const allCollections: DASCollection[][] = []

    for (let i = 0; i < linkedWallets.length; i++) {
      const { mints, collections } = freshResults[i]
      const mintsWithOwner = mints.map((m) => ({ ...m, owner: linkedWallets[i] }))
      allMints.push(...mintsWithOwner)
      allCollections.push(collections)
      saveNftCache(c.env, linkedWallets[i], mints, collections)
    }

    return c.json({
      collections: mergeCollections(allCollections),
      mints: allMints,
      total: allMints.length,
      linkedWallets,
    })
  } catch (err) {
    console.error("Error fetching NFTs:", err)
    return c.json({ error: "Failed to fetch NFTs" }, 500)
  }
})

// Get single NFT by mint address with enriched lock state
nftsRoutes.get("/:mint", async (c) => {
  const mint = c.req.param("mint")

  try {
    const asset = await getAsset(c.env, mint)

    if (!asset) {
      return c.json({ error: "Asset not found" }, 404)
    }

    // Update the cache for this NFT's owner (fire and forget)
    if (asset.owner) {
      const cacheId = c.env.NFT_CACHE_DO.idFromName(asset.owner)
      const cacheStub = c.env.NFT_CACHE_DO.get(cacheId)
      void cacheStub.fetch(
        new Request("http://do/cache", {
          method: "PATCH",
          body: JSON.stringify({
            mint: asset.mint,
            name: asset.name,
            image: asset.image,
            collectionId: asset.collectionId ?? "",
            collectionName: asset.collectionName,
            attributes: asset.attributes,
            frozen: asset.frozen,
            delegate: asset.delegate,
            compressed: asset.compressed,
            tokenStandard: asset.tokenStandard,
            staked: asset.staked,
          }),
        })
      )
    }

    return c.json(asset)
  } catch (err) {
    console.error("Error fetching NFT:", err)
    return c.json({ error: "Failed to fetch NFT" }, 500)
  }
})

// Batch fetch multiple NFTs by mint addresses with enriched lock state
nftsRoutes.post("/batch", async (c) => {
  try {
    const { mints } = await c.req.json<{ mints: string[] }>()

    if (!mints || !Array.isArray(mints) || mints.length === 0) {
      return c.json({ error: "mints array required" }, 400)
    }

    if (mints.length > 100) {
      return c.json({ error: "Maximum 100 mints per request" }, 400)
    }

    const assets = await getAssetBatch(c.env, mints)

    // Update cache for each NFT grouped by owner (fire and forget)
    const assetsByOwner = new Map<string, typeof assets>()
    for (const asset of assets) {
      if (asset.owner) {
        const ownerAssets = assetsByOwner.get(asset.owner) ?? []
        ownerAssets.push(asset)
        assetsByOwner.set(asset.owner, ownerAssets)
      }
    }

    for (const [owner, ownerAssets] of assetsByOwner) {
      const cacheId = c.env.NFT_CACHE_DO.idFromName(owner)
      const cacheStub = c.env.NFT_CACHE_DO.get(cacheId)
      for (const asset of ownerAssets) {
        void cacheStub.fetch(
          new Request("http://do/cache", {
            method: "PATCH",
            body: JSON.stringify({
              mint: asset.mint,
              name: asset.name,
              image: asset.image,
              collectionId: asset.collectionId ?? "",
              collectionName: asset.collectionName,
              attributes: asset.attributes,
              frozen: asset.frozen,
              delegate: asset.delegate,
              compressed: asset.compressed,
              tokenStandard: asset.tokenStandard,
              staked: asset.staked,
            }),
          })
        )
      }
    }

    return c.json({ assets })
  } catch (err) {
    console.error("Error fetching NFT batch:", err)
    return c.json({ error: "Failed to fetch NFTs" }, 500)
  }
})

// Get single asset from Helius (for detailed metadata)
nftsRoutes.get("/asset/:id", async (c) => {
  const id = c.req.param("id")

  try {
    const asset = await heliusService.getAsset(c.env.HELIUS_API_KEY, id)
    return c.json(asset)
  } catch (err) {
    console.error("Error fetching asset:", err)
    return c.json({ error: "Failed to fetch asset" }, 500)
  }
})

// Get assets by collection from Helius
nftsRoutes.get("/by-collection/:collectionId", async (c) => {
  const collectionId = c.req.param("collectionId")
  const page = parseInt(c.req.query("page") ?? "1")

  try {
    const result = await heliusService.getAssetsByGroup(c.env.HELIUS_API_KEY, "collection", collectionId, page)
    return c.json(result)
  } catch (err) {
    console.error("Error fetching collection:", err)
    return c.json({ error: "Failed to fetch collection" }, 500)
  }
})

// Get assets by update authority using GPA (not DAS)
nftsRoutes.get("/by-authority/:authority", async (c) => {
  const authority = c.req.param("authority")

  try {
    const assets = await getAssetsByAuthority(c.env, authority)
    return c.json({ assets })
  } catch (err) {
    console.error("Error fetching assets by authority:", err)
    return c.json({ error: "Failed to fetch assets by authority" }, 500)
  }
})
