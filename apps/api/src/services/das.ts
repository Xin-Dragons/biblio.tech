/**
 * DAS (Digital Asset Standard) Service
 * Uses Helius RPC with @solana/kit for fetching NFTs
 */

import type { Asset, GetAssetResponseList, Grouping } from "helius-sdk/types/das"
import { type Address, getProgramDerivedAddress, getAddressEncoder } from "@solana/kit"
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address

/**
 * Derives the Token Record PDA for a pNFT
 * Token Record accounts track the state (locked/unlocked) of programmable NFTs
 */
export async function getTokenRecordPda(mint: Address, tokenAccount: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      "metadata",
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      "token_record",
      getAddressEncoder().encode(tokenAccount),
    ],
  })
  return pda
}

/**
 * Derives the Associated Token Address for a mint and owner
 */
export function getAssociatedTokenAddress(mint: Address, owner: Address): Address {
  const ata = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), false, TOKEN_PROGRAM_ID)
  return ata.toBase58() as Address
}

// Helius SDK doesn't include plugins type for Core assets - extend it
type CorePlugin = {
  type: string
  data?: { frozen?: boolean }
  authority?: { address?: string }
}

type CoreAsset = Asset & {
  plugins?: CorePlugin[] | Record<string, CorePlugin>
}

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
  owner?: string
}

export type DASCollection = {
  id: string
  name: string
  image: string | null
  count: number
}

function processItem(item: CoreAsset, collectionsMap: Map<string, DASCollection>): DASAsset | null {
  const isLegacyNft = item.interface === "V1_NFT" || item.interface === "ProgrammableNFT"
  const isCore = item.interface === "MplCoreAsset"

  if (!isLegacyNft && !isCore) {
    return null
  }

  const collectionGrouping = item.grouping?.find((g: Grouping) => g.group_key === "collection")
  const collectionId = collectionGrouping?.group_value ?? null
  const collectionMeta = collectionGrouping?.collection_metadata

  const rawImage = item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? ""

  let tokenStandard: TokenStandard = "NonFungible"
  if (item.interface === "ProgrammableNFT") {
    tokenStandard = "ProgrammableNonFungible"
  } else if (isCore) {
    tokenStandard = "Core"
  }

  let frozen = false
  let delegate: string | null = null

  if (isCore) {
    const plugins = item.plugins
    let freezeDelegate: CorePlugin | undefined
    if (Array.isArray(plugins)) {
      freezeDelegate = plugins.find((p: CorePlugin) => p.type === "FreezeDelegate")
    } else if (plugins && typeof plugins === "object") {
      freezeDelegate =
        (plugins as Record<string, CorePlugin>).FreezeDelegate ?? (plugins as Record<string, CorePlugin>).freezeDelegate
    }
    frozen = freezeDelegate?.data?.frozen ?? false
    delegate = freezeDelegate?.authority?.address ?? null
  } else {
    frozen = item.ownership?.frozen ?? false
    delegate = item.ownership?.delegate ?? null
  }

  const result: DASAsset = {
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

  return result
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
  const PAGE_SIZE = 1000

  // Fetch first page to get total count
  const firstResponse: GetAssetResponseList = await rpc
    .getAssetsByOwner({
      ownerAddress: wallet,
      page: 1,
      limit: PAGE_SIZE,
      displayOptions: {
        showCollectionMetadata: true,
        showFungible: false,
        showNativeBalance: false,
        showGrandTotal: true,
      },
    })
    .send()

  const grandTotal = firstResponse.grand_total ?? firstResponse.total
  console.log(
    `[DAS] First page: ${firstResponse.items.length} items, total: ${firstResponse.total}, grandTotal: ${grandTotal}`
  )

  // Process first page
  for (const item of firstResponse.items) {
    const asset = processItem(item as CoreAsset, collectionsMap)
    if (asset) allAssets.push(asset)
  }

  // Calculate remaining pages and fetch in parallel
  const totalPages = Math.ceil(grandTotal / PAGE_SIZE)

  if (totalPages > 1) {
    console.log(`[DAS] Fetching pages 2-${totalPages} in parallel`)
    const pagePromises: Promise<GetAssetResponseList>[] = []
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        rpc
          .getAssetsByOwner({
            ownerAddress: wallet,
            page,
            limit: PAGE_SIZE,
            displayOptions: {
              showCollectionMetadata: true,
              showFungible: false,
              showNativeBalance: false,
              showGrandTotal: true,
            },
          })
          .send()
      )
    }

    const responses = await Promise.all(pagePromises)
    for (const response of responses) {
      for (const item of response.items) {
        const asset = processItem(item as CoreAsset, collectionsMap)
        if (asset) allAssets.push(asset)
      }
    }
  }

  console.log(`[DAS] Final: ${allAssets.length} NFTs, ${collectionsMap.size} collections`)
  return {
    assets: allAssets,
    collections: Array.from(collectionsMap.values()),
  }
}
