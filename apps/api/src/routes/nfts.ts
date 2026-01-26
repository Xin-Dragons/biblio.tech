import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { rateLimiterMiddleware } from "../middleware/rate-limiter"
import { heliusService } from "../services/helius"
import { getAssetsByOwner, getAsset, getAssetBatch, type DASAsset, type DASCollection } from "../services/das"
import { getNiftyAssetsByOwner, fetchNiftyCollections, type NiftyAsset } from "../services/nifty"
import { getCachedStakeRecords } from "./stake"

export const nftsRoutes = new Hono<HonoEnv>()

// Dandies collection IDs - nifty Dandies should be merged into pNFT Dandies collection
const DANDIES_PNFT_COLLECTION = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"
const DANDIES_NIFTY_COLLECTION = "BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF"

// Apply rate limiting to all NFT routes
nftsRoutes.use("*", rateLimiterMiddleware(10))

function mapNiftyAssetToDASFormat(niftyAsset: NiftyAsset, collectionName: string | null): DASAsset {
  // Normalize nifty Dandies to use the pNFT Dandies collection ID
  // Debug: Check if group comparison works correctly
  const groupMatches = niftyAsset.group === DANDIES_NIFTY_COLLECTION
  if (niftyAsset.group && !groupMatches) {
    console.log(
      `[nfts] Nifty asset group mismatch - asset: ${niftyAsset.address}, group: "${niftyAsset.group}", expected: "${DANDIES_NIFTY_COLLECTION}", match: ${groupMatches}`
    )
  }

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
    ruleSet: null,
    staked: false,
  }
}

// Get NFTs for a wallet using Helius DAS API + nifty-oss assets
nftsRoutes.get("/by-owner/:wallet", async (c) => {
  const wallet = c.req.param("wallet")

  try {
    const [dasResult, niftyAssets, stakeRecords] = await Promise.all([
      getAssetsByOwner(c.env, wallet),
      getNiftyAssetsByOwner(c.env, wallet),
      getCachedStakeRecords(c.env, wallet),
    ])

    // Build set of staked mints
    const stakedMints = new Set(stakeRecords.map((r) => r.nftMint))

    const { assets: dasAssets, collections: dasCollections } = dasResult

    const niftyCollectionIds = niftyAssets.map((a) => a.group).filter((g): g is string => g !== null)
    const niftyCollections = await fetchNiftyCollections(c.env, niftyCollectionIds)

    const mappedNiftyAssets: DASAsset[] = niftyAssets.map((niftyAsset) => {
      const collection = niftyAsset.group ? niftyCollections.get(niftyAsset.group) : null
      return mapNiftyAssetToDASFormat(niftyAsset, collection?.name ?? null)
    })

    const allAssets = [...dasAssets, ...mappedNiftyAssets]

    // Enrich assets with staked status
    for (const asset of allAssets) {
      asset.staked = stakedMints.has(asset.mint)
    }

    const collectionsMap = new Map<string, DASCollection>()
    for (const col of dasCollections) {
      collectionsMap.set(col.id, col)
    }

    for (const niftyAsset of niftyAssets) {
      if (niftyAsset.group) {
        // Normalize nifty Dandies to pNFT Dandies collection
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

    const allCollections = Array.from(collectionsMap.values())

    return c.json({
      collections: allCollections,
      mints: allAssets,
      total: allAssets.length,
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
