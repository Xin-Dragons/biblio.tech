/**
 * DAS (Digital Asset Standard) Service
 * Uses Helius RPC with @solana/kit for fetching NFTs
 */

import type { Asset, GetAssetResponseList, Grouping } from "helius-sdk/types/das"
import { type Address, getProgramDerivedAddress, getAddressEncoder } from "@solana/kit"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { tokenMetadata } from "@biblio/solana-programs"
import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address

/**
 * Derives the Metadata PDA for an NFT mint
 */
async function getMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: ["metadata", getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS), getAddressEncoder().encode(mint)],
  })
  return pda
}

/**
 * Fetches the rule set address from a pNFT's metadata account
 * Returns null if no rule set is configured
 */
async function fetchMetadataRuleSet(rpc: SolanaClient, mint: Address): Promise<Address | null> {
  try {
    const metadataPda = await getMetadataPda(mint)
    const metadata = await tokenMetadata.fetchMaybeMetadata(rpc, metadataPda)

    if (!metadata.exists) {
      return null
    }

    // Check if programmableConfig exists and has a rule set
    const programmableConfig = metadata.data.programmableConfig
    if (programmableConfig.__option === "Some") {
      const config = programmableConfig.value
      if (config.__kind === "V1" && config.ruleSet.__option === "Some") {
        return config.ruleSet.value
      }
    }

    return null
  } catch (error) {
    console.error(`[DAS] Error fetching metadata rule set for ${mint}:`, error)
    return null
  }
}

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
export async function findAta(mint: Address, owner: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    mint,
    owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  return ata
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
  ruleSet: string | null
  staked: boolean
}

export type DASCollection = {
  id: string
  name: string
  image: string | null
  count: number
}

/**
 * Enriches pNFT lock state by fetching Token Record accounts
 * Updates the frozen field in place for any pNFTs in the array
 */
export async function enrichPnftLockState(rpc: SolanaClient, assets: DASAsset[]): Promise<void> {
  const pnfts = assets.filter((a) => a.tokenStandard === "ProgrammableNonFungible" && a.owner)

  if (pnfts.length === 0) {
    return
  }

  console.log(`[DAS] Enriching lock state for ${pnfts.length} pNFTs`)

  // Derive Token Record PDAs for all pNFTs
  const tokenRecordPdas = await Promise.all(
    pnfts.map(async (pnft) => {
      const ata = await findAta(pnft.mint as Address, pnft.owner as Address)
      return getTokenRecordPda(pnft.mint as Address, ata)
    })
  )

  // Batch fetch Token Records
  const BATCH_SIZE = 1000
  for (let i = 0; i < tokenRecordPdas.length; i += BATCH_SIZE) {
    const batchPdas = tokenRecordPdas.slice(i, i + BATCH_SIZE)
    const batchPnfts = pnfts.slice(i, i + BATCH_SIZE)

    const tokenRecords = await tokenMetadata.fetchAllMaybeTokenRecord(rpc, batchPdas)

    for (let j = 0; j < tokenRecords.length; j++) {
      const tokenRecord = tokenRecords[j]
      if (tokenRecord.exists) {
        batchPnfts[j].frozen = tokenRecord.data.state === tokenMetadata.TokenState.Locked
      }
    }
  }
}

/**
 * Processes a raw Helius DAS asset into our DASAsset format
 * Also updates collectionsMap as a side effect for bulk operations
 */
export function processItem(item: CoreAsset, collectionsMap: Map<string, DASCollection>): DASAsset | null {
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
    ruleSet: null,
    staked: false,
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

  // Set owner for all assets (needed for pNFT lock state enrichment)
  for (const asset of allAssets) {
    asset.owner = wallet
  }

  // Enrich pNFT lock state from Token Records
  await enrichPnftLockState(rpc, allAssets)

  console.log(`[DAS] Final: ${allAssets.length} NFTs, ${collectionsMap.size} collections`)
  return {
    assets: allAssets,
    collections: Array.from(collectionsMap.values()),
  }
}

/**
 * Fetches a single asset by mint address and enriches pNFT lock state
 * Returns null if asset not found or not a valid NFT type
 */
export async function getAsset(env: Env, mint: string): Promise<DASAsset | null> {
  const rpc = getClient(env)

  try {
    const asset = await rpc.getAsset({ id: mint }).send()

    if (!asset) {
      return null
    }

    const collectionsMap = new Map<string, DASCollection>()
    const dasAsset = processItem(asset as CoreAsset, collectionsMap)

    if (!dasAsset) {
      return null
    }

    // Add owner from raw asset
    if (asset.ownership?.owner) {
      dasAsset.owner = asset.ownership.owner
    }

    // Enrich pNFT lock state from Token Record
    await enrichPnftLockState(rpc, [dasAsset])

    // For pNFTs, fetch the rule set from metadata
    if (dasAsset.tokenStandard === "ProgrammableNonFungible") {
      const ruleSet = await fetchMetadataRuleSet(rpc, mint as Address)
      dasAsset.ruleSet = ruleSet
    }

    return dasAsset
  } catch (error) {
    console.error(`[DAS] Error fetching asset ${mint}:`, error)
    return null
  }
}

/**
 * Fetches multiple assets by mint addresses and enriches pNFT lock state
 * More efficient than calling getAsset multiple times
 */
export async function getAssetBatch(env: Env, mints: string[]): Promise<DASAsset[]> {
  if (mints.length === 0) return []

  const rpc = getClient(env)
  const collectionsMap = new Map<string, DASCollection>()
  const assets: DASAsset[] = []

  try {
    // Fetch all assets in parallel
    const rawAssets = await Promise.all(
      mints.map(async (mint) => {
        try {
          return await rpc.getAsset({ id: mint }).send()
        } catch {
          return null
        }
      })
    )

    // Process each asset
    for (const rawAsset of rawAssets) {
      if (!rawAsset) continue

      const dasAsset = processItem(rawAsset as CoreAsset, collectionsMap)
      if (!dasAsset) continue

      if (rawAsset.ownership?.owner) {
        dasAsset.owner = rawAsset.ownership.owner
      }

      assets.push(dasAsset)
    }

    // Enrich pNFT lock states in batch (single batch fetch for all pNFTs)
    await enrichPnftLockState(rpc, assets)

    // Fetch rule sets for pNFTs
    const pnfts = assets.filter((a) => a.tokenStandard === "ProgrammableNonFungible")
    if (pnfts.length > 0) {
      const ruleSets = await Promise.all(pnfts.map((pnft) => fetchMetadataRuleSet(rpc, pnft.mint as Address)))
      for (let i = 0; i < pnfts.length; i++) {
        pnfts[i].ruleSet = ruleSets[i]
      }
    }

    return assets
  } catch (error) {
    console.error(`[DAS] Error fetching asset batch:`, error)
    return []
  }
}
