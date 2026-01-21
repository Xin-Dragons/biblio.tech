import { chunk, flatten, groupBy, isEqual, mapValues } from "lodash"
import { PriorityFees } from "../constants"

// Types for Helius DAS API responses
export interface GetAssetResponse {
  interface: string
  id: string
  content?: {
    $schema: string
    json_uri: string
    files?: Array<{ uri?: string; mime?: string; cdn_uri?: string }>
    metadata: {
      attributes?: Array<{ value: string; trait_type: string }>
      description: string
      name: string
      symbol: string
      token_standard?: string
    }
    links?: { external_url?: string; image?: string; animation_url?: string }
  }
  authorities?: Array<{ address: string; scopes: string[] }>
  compression?: {
    eligible: boolean
    compressed: boolean
    data_hash: string
    creator_hash: string
    asset_hash: string
    tree: string
    seq: number
    leaf_id: number
  }
  grouping?: Array<{ group_key: string; group_value: string; verified?: boolean; collection_metadata?: any }>
  royalty?: {
    royalty_model: string
    target?: string
    percent: number
    basis_points: number
    primary_sale_happened: boolean
    locked: boolean
  }
  ownership: {
    frozen: boolean
    delegated: boolean
    delegate?: string
    ownership_model: string
    owner: string
  }
  creators?: Array<{ address: string; share: number; verified: boolean }>
  uses?: { use_method: string; remaining: number; total: number }
  supply?: { print_max_supply: number; print_current_supply: number; edition_nonce?: number }
  mutable: boolean
  burnt: boolean
  mint_extensions?: any
  token_info?: any
}

export interface GetAssetResponseList {
  grand_total?: number
  total: number
  limit: number
  page?: number
  cursor?: string
  items: GetAssetResponse[]
  nativeBalance?: { lamports: number; price_per_sol: number; total_price: number }
}

export interface GetAssetProofResponse {
  root: string
  proof: Array<string>
  node_index: number
  leaf: string
  tree_id: string
}

// Helper to call backend Helius API
async function heliusRpc<T>(method: string, params: any): Promise<T> {
  const res = await fetch(`/api/helius/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || "Helius API Error")
  }

  return res.json()
}

async function getByCollection(collection: string, page: number) {
  return await heliusRpc<GetAssetResponseList>("getAssetsByGroup", {
    groupKey: "collection",
    groupValue: collection,
    page,
    displayOptions: {
      showGrandTotal: true,
    },
  })
}

async function getByCreator(creator: string, page: number) {
  return await heliusRpc<GetAssetResponseList>("getAssetsByCreator", {
    creatorAddress: creator,
    onlyVerified: true,
    page,
    displayOptions: {
      showGrandTotal: true,
    },
  })
}

async function getAllByCreator(creator: string) {
  const nfts: GetAssetResponse[] = []
  let total = 1001
  let page = 1
  while (nfts.length < total) {
    const result = await getByCreator(creator, page)
    total = result.grand_total as number
    nfts.push(...result.items)
    page++
  }

  return nfts
}

async function getFungiblesByOwner(ownerAddress: string, page: number) {
  try {
    const result = await heliusRpc<GetAssetResponseList>("searchAssets", {
      ownerAddress,
      page,
      tokenType: "fungible",
    })
    return result
  } catch (err) {
    console.log(err)
  }
}

export async function getPriorityFeesForTx(tx: string, feeLevel: PriorityFees) {
  try {
    const result = await heliusRpc<{ priorityFeeEstimate: number }>("getPriorityFeeEstimate", [
      {
        transaction: tx,
        options: { priorityLevel: feeLevel },
      },
    ])
    return result?.priorityFeeEstimate || 0
  } catch (err) {
    console.log(err)
    return 0
  }
}

async function getByOwner(ownerAddress: string, page: number) {
  try {
    const result = await heliusRpc<GetAssetResponseList>("getAssetsByOwner", {
      ownerAddress,
      page,
      displayOptions: {
        showGrandTotal: true,
        showUnverifiedCollections: true,
        showCollectionMetadata: true,
      },
    })
    return result
  } catch (err) {
    console.log(err)
  }
}

export async function getAllByOwner(owner: string) {
  const nfts: GetAssetResponse[] = []
  let page = 1
  let result
  while ((result = await getByOwner(owner, page++))?.items.length) {
    nfts.push(...result.items)
  }

  return nfts
}

export async function getAllFungiblesByOwner(owner: string) {
  const nfts: GetAssetResponse[] = []
  let page = 1
  let result
  while ((result = await getFungiblesByOwner(owner, page++))?.items.length) {
    nfts.push(...result.items)
  }

  return nfts
}

async function getAllByCollection(collection: string) {
  const nfts: GetAssetResponse[] = []
  let total = 1001
  const first = await getByCollection(collection, 1)
  if (!first) {
    throw new Error("Error looking up collection")
  }
  nfts.push(...first.items)
  total = first.grand_total as number

  const pages = Math.ceil(total / 1000) - 1

  if (pages) {
    await Promise.all(
      Array.from(new Array(pages).keys())
        .map((k) => k + 2)
        .map(async (page) => {
          const result = await getByCollection(collection, page)
          nfts.push(...result.items)
        })
    )
  }

  return nfts
}

export async function getMintlist(data: any) {
  let nfts: GetAssetResponse[] = []
  if (data.collections) {
    const nftsByCollection = flatten(await Promise.all(data.collections.map(getAllByCollection)))
    nfts = nfts.concat(...nftsByCollection)
  }

  if (data.creators) {
    const nftsByCreator = flatten(await Promise.all(data.creators.map(getAllByCreator)))
    nfts = nfts.concat(...nftsByCreator)
  }

  if (data.filters && data.filters.length) {
    data.filters.forEach((filter: { trait_type: string; value: any }) => {
      nfts = nfts.filter((nft) => {
        return nft.content?.metadata.attributes?.find((item) => isEqual(item, filter))
      })
    })
  }

  return nfts.map((n) => n.id)
}

export async function getNfts(mints: string[]) {
  const nfts = flatten(
    await Promise.all(chunk(mints, 1_000).map(async (ids) => heliusRpc<GetAssetResponse[]>("getAssetBatch", { ids })))
  )

  const grouped = groupBy(nfts, (nft) => nft.ownership.owner)

  return mapValues(grouped, (value) => {
    return {
      amount: value.length,
      mints: value.map((v) => v.id),
    }
  })
}

export async function getDigitalAssets(mints: string[]) {
  const nfts = flatten(
    await Promise.all(chunk(mints, 1_000).map(async (ids) => heliusRpc<GetAssetResponse[]>("getAssetBatch", { ids })))
  )

  return nfts
}

export async function getDigitalAsset(id: string) {
  const da = await heliusRpc<GetAssetResponse>("getAsset", { id })
  return da
}

async function getDandiesForWallet(ownerAddress: string) {
  const dandies = await heliusRpc<GetAssetResponseList>("searchAssets", {
    ownerAddress,
    grouping: ["collection", process.env.NEXT_PUBLIC_COLLECTION_ID!],
    page: 1,
    limit: 1000,
  })
  return dandies.items
}

export async function getDandies(wallets: string[]) {
  const dandies = flatten(await Promise.all(wallets.map((wallet) => getDandiesForWallet(wallet)))).filter(
    (d) => !d.burnt
  )

  return dandies
}

export async function getAssetProof(id: string) {
  return await heliusRpc<GetAssetProofResponse>("getAssetProof", { id })
}
