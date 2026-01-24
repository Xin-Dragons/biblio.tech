/**
 * DAS (Digital Asset Standard) Service
 * Uses Helius RPC with @solana/kit for fetching NFTs
 */

import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

function mapImageToCdn(imageUrl: string, slug?: string): string {
  if (!imageUrl) return ""
  if (slug) {
    const encodedUrl = encodeURIComponent(imageUrl)
    return `https://prod-image-cdn.tensor.trade/images/slug=${slug}/400x400/freeze=false/${encodedUrl}`
  }
  return imageUrl
}

function getClient(env: Env): SolanaClient {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  return getRpc(rpcUrl)
}

export type TokenStandard =
  | "NonFungible"
  | "ProgrammableNonFungible"
  | "NonFungibleEdition"
  | "ProgrammableNonFungibleEdition"
  | "Core"
  | "Nifty"

export type DASAsset = {
  mint: string
  name: string
  image: string
  collectionId: string | null
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  compressed: boolean
  frozen: boolean
  delegate: string | null
  tokenStandard: TokenStandard
}

export type DASCollection = {
  id: string
  name: string
  image: string | null
  count: number
}

export async function getAssetsByOwner(
  env: Env,
  wallet: string
): Promise<{
  assets: DASAsset[]
  collections: DASCollection[]
}> {
  const rpc = getClient(env)
  const allAssets: DASAsset[] = []
  const collectionsMap = new Map<string, DASCollection>()

  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await rpc
      .getAssetsByOwner({
        ownerAddress: wallet,
        page,
        limit: 1000,
        displayOptions: {
          showCollectionMetadata: true,
          showFungible: false,
          showNativeBalance: false,
        },
      })
      .send()

    for (const item of response.items) {
      const isLegacyNft = item.interface === "V1_NFT" || item.interface === "ProgrammableNFT"
      const isCore = item.interface === "MplCoreAsset"

      if (!isLegacyNft && !isCore) {
        continue
      }

      const collectionId = item.grouping?.find((g) => g.group_key === "collection")?.group_value ?? null
      const collectionMeta = item.grouping?.find((g) => g.group_key === "collection")?.collection_metadata

      const rawImage = item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? ""

      let tokenStandard: TokenStandard = "NonFungible"
      if (item.interface === "ProgrammableNFT") {
        tokenStandard = "ProgrammableNonFungible"
      } else if (isCore) {
        tokenStandard = "Core"
      }

      // Core assets use different structure for frozen/delegate
      let frozen = false
      let delegate: string | null = null

      if (isCore) {
        // Core assets: check plugins for freeze delegate
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plugins = (item as any).plugins
        const freezeDelegate = plugins?.find((p: { type: string }) => p.type === "FreezeDelegate")
        frozen = freezeDelegate?.data?.frozen ?? false
        delegate = freezeDelegate?.authority?.address ?? null
      } else {
        frozen = item.ownership?.frozen ?? false
        delegate = (item.ownership?.delegate as string) ?? null
      }

      const asset: DASAsset = {
        mint: item.id,
        name: item.content?.metadata?.name ?? "Unknown",
        image: mapImageToCdn(rawImage, collectionId ?? undefined),
        collectionId,
        collectionName: collectionMeta?.name ?? null,
        attributes: Array.isArray(item.content?.metadata?.attributes)
          ? item.content.metadata.attributes.map((a) => ({
              trait_type: String(a.trait_type ?? ""),
              value: String(a.value ?? ""),
            }))
          : [],
        compressed: item.compression?.compressed ?? false,
        frozen,
        delegate,
        tokenStandard,
      }

      allAssets.push(asset)

      if (collectionId) {
        const existing = collectionsMap.get(collectionId)
        if (existing) {
          existing.count++
        } else {
          collectionsMap.set(collectionId, {
            id: collectionId,
            name: collectionMeta?.name ?? collectionId,
            image: collectionMeta?.image ?? null,
            count: 1,
          })
        }
      }
    }

    hasMore = response.items.length === 1000
    page++

    if (page > 10) break
  }

  return {
    assets: allAssets,
    collections: Array.from(collectionsMap.values()),
  }
}
