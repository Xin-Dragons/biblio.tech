import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { rateLimiterMiddleware } from "../middleware/rate-limiter"
import { heliusService } from "../services/helius"
import { getAssetsByOwner, type DASAsset, type DASCollection } from "../services/das"
import { getNiftyAssetsByOwner, fetchNiftyCollections, type NiftyAsset } from "../services/nifty"

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
  }
}

// Get NFTs for a wallet using Helius DAS API + nifty-oss assets
nftsRoutes.get("/by-owner/:wallet", async (c) => {
  const wallet = c.req.param("wallet")

  try {
    const [dasResult, niftyAssets] = await Promise.all([
      getAssetsByOwner(c.env, wallet),
      getNiftyAssetsByOwner(c.env, wallet),
    ])

    const { assets: dasAssets, collections: dasCollections } = dasResult

    const niftyCollectionIds = niftyAssets.map((a) => a.group).filter((g): g is string => g !== null)
    const niftyCollections = await fetchNiftyCollections(c.env, niftyCollectionIds)

    const mappedNiftyAssets: DASAsset[] = niftyAssets.map((niftyAsset) => {
      const collection = niftyAsset.group ? niftyCollections.get(niftyAsset.group) : null
      return mapNiftyAssetToDASFormat(niftyAsset, collection?.name ?? null)
    })

    const allAssets = [...dasAssets, ...mappedNiftyAssets]

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
