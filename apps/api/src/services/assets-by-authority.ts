/**
 * Assets By Authority Service
 * Fetches NFTs by update authority using DAS + SDK validation
 * - Core/pNFT: DAS searchAssets, then validate Core with SDK
 * - Nifty: GPA (not in DAS)
 */

import { type Address } from "@solana/kit"
import { mplCore } from "@biblio/solana-programs"
import { getRpc, type SolanaClient } from "../lib/solana-client"
import { getNiftyAssetsByAuthority } from "./nifty"
import type { Env } from "../types"

export type AssetByAuthority = {
  mint: string
  name: string
  uri: string
  image: string | null
  standard: "core" | "nifty" | "pnft"
}

function getClient(env: Env): SolanaClient {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  return getRpc(rpcUrl)
}

/**
 * Fetches assets by update authority:
 * 1. DAS searchAssets for Core/pNFT candidates (fast, indexed)
 * 2. Validate Core assets with SDK (burned = doesn't exist)
 * 3. GPA for Nifty assets (not in DAS)
 */
export async function getAssetsByAuthority(env: Env, authority: string): Promise<AssetByAuthority[]> {
  const rpc = getClient(env)
  const candidates: Array<{
    mint: string
    name: string
    uri: string
    image: string | null
    standard: "core" | "pnft"
  }> = []

  // Step 1: Get Core/pNFT candidates from DAS (Nifty is NOT in DAS)
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await rpc
      .searchAssets({
        authorityAddress: authority,
        page,
        limit: 1000,
        options: {
          showGrandTotal: true,
        },
      } as Parameters<typeof rpc.searchAssets>[0])
      .send()

    if (response.items.length === 0) {
      hasMore = false
      break
    }

    for (const item of response.items) {
      if (item.burnt) continue

      const isCollection =
        (item as { specification_asset_class?: string }).specification_asset_class === "nft_collection" ||
        item.interface === "MplCoreCollection"
      if (isCollection) continue

      const rawImage = item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? ""

      let standard: "core" | "pnft"
      if (item.interface === "MplCoreAsset") {
        standard = "core"
      } else if (item.interface === "ProgrammableNFT") {
        standard = "pnft"
      } else {
        continue
      }

      candidates.push({
        mint: item.id,
        name: item.content?.metadata?.name ?? "Unknown",
        uri: item.content?.json_uri ?? "",
        image: rawImage || null,
        standard,
      })
    }

    if (response.items.length < 1000) {
      hasMore = false
    } else {
      page++
    }
  }

  // Step 2: Validate Core assets with SDK (burned = doesn't exist)
  const validatedAssets: AssetByAuthority[] = []
  const coreAssets = candidates.filter((c) => c.standard === "core")
  const pnftAssets = candidates.filter((c) => c.standard === "pnft")

  const BATCH_SIZE = 100
  for (let i = 0; i < coreAssets.length; i += BATCH_SIZE) {
    const batch = coreAssets.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (asset) => {
        try {
          const fetched = await mplCore.fetchMaybeAssetV1(rpc, asset.mint as Address)
          if (fetched.exists) {
            return asset
          }
          return null
        } catch {
          return null
        }
      })
    )

    for (const result of results) {
      if (result) {
        validatedAssets.push(result)
      }
    }
  }

  // Add pNFTs (DAS burnt flag is reliable for these)
  validatedAssets.push(...pnftAssets)

  // Step 3: Get Nifty assets via GPA (not in DAS)
  const niftyAssets = await getNiftyAssetsByAuthority(env, authority)
  for (const nifty of niftyAssets) {
    validatedAssets.push({
      mint: nifty.address,
      name: nifty.name,
      uri: nifty.uri ?? "",
      image: nifty.image,
      standard: "nifty",
    })
  }

  return validatedAssets
}
