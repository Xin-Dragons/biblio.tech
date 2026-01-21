/**
 * Tensor REST API Service
 * Based on https://api.mainnet.tensordev.io/api/v1/
 */

import type { Env } from "../types"

const TENSOR_API = "https://api.mainnet.tensordev.io/api/v1"
const MAX_INVENTORY_LIMIT = 250
const MAX_PAGINATION_PAGES = 100

// === Types ===

export type TensorStatsV2 = {
  currency: string | null
  buyNowPrice: string | null
  buyNowPriceNetFees: string | null
  sellNowPrice: string | null
  sellNowPriceNetFees: string | null
  numListed: number
  numBids: number
  numMints: number
  floor1h: number | null
  floor24h: number | null
  floor7d: number | null
  sales1h: number
  sales24h: number
  sales7d: number
  salesAll: number
  volume1h: string
  volume24h: string
  volume7d: string
  volumeAll: string
  pctListed: number
  marketCap: string | null
}

export type TensorPortfolioCollection = {
  id: string
  slug: string
  slugDisplay: string
  slugMe: string | null
  name: string
  symbol: string | null
  imageUri: string
  description: string | null
  twitter: string | null
  discord: string | null
  website: string | null
  tensorVerified: boolean
  compressed: boolean
  hidden: boolean
  flagReason: string | null
  tokenStandard: string
  statsV2: TensorStatsV2
  mintCount: number
  listedCount: number
  bidCount: number
  favCount: number
  firstListDate: string | null
  createdAt: string
  updatedAt: string
}

export type TensorLastSale = {
  price: string
  priceUnit: string | null
  txAt: string
  txId: string
  buyer: string
  seller: string
  source: string
  blockNumber: string
}

export type TensorListing = {
  price: string | null
  txId: string
  txAt: string
  seller: string | null
  source: string
  blockNumber: string
  priceUnit: string | null
  privateTaker: string | null
}

export type TensorInventoryMint = {
  mint: string
  slug: string
  frozen: boolean
  attributes: Array<{ trait_type: string; value: string }>
  imageUri: string
  lastSale: TensorLastSale | null
  metadataFetchedAt: string
  metadataUri: string
  animationUri: string | null
  name: string
  rarityRank: number | null
  royaltyBps: number
  tokenEdition: number | null
  tokenStandard: string
  hidden: boolean
  compressed: boolean
  verifiedCollection: string | null
  updateAuthority: string
  owner: string
  listing: TensorListing | null
  tokenProgram: string | null
  metadataProgram: string | null
  transferHookProgram: string | null
}

type TensorInventoryResponse = {
  mints: TensorInventoryMint[]
  page: {
    endCursor: string
    hasMore: boolean
  }
}

// === Rate Limiter ===

function getRateLimiter(env: Env) {
  const id = env.TENSOR_RATE_LIMITER_DO.idFromName("global")
  return env.TENSOR_RATE_LIMITER_DO.get(id)
}

// === Helpers ===

async function tensorFetch<T>(env: Env, endpoint: string, params: Record<string, string | number>): Promise<T> {
  const rateLimiter = getRateLimiter(env)
  await rateLimiter.acquire(1)

  const url = new URL(`${TENSOR_API}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value))
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-tensor-api-key": env.TENSOR_API_KEY,
      },
      redirect: "follow",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Tensor API error: ${response.status} ${response.statusText}`)
    }

    return response.json() as Promise<T>
  } catch (error) {
    clearTimeout(timeoutId)
    if ((error as Error).name === "AbortError") {
      throw new Error("Tensor API request timeout after 30s")
    }
    throw error
  }
}

// === Service Functions ===

export async function getPortfolio(env: Env, wallet: string): Promise<TensorPortfolioCollection[]> {
  return tensorFetch<TensorPortfolioCollection[]>(env, "/user/portfolio", {
    wallet,
    includeUnverified: "true",
  })
}

export async function getInventory(
  env: Env,
  wallet: string,
  collId: string,
  cursor?: string
): Promise<TensorInventoryResponse> {
  const params: Record<string, string | number> = {
    wallet,
    collId,
    limit: MAX_INVENTORY_LIMIT,
  }

  if (cursor) {
    params.cursor = cursor
  }

  return tensorFetch<TensorInventoryResponse>(env, "/user/inventory_by_collection", params)
}

export async function getAllInventoryForCollection(
  env: Env,
  wallet: string,
  collId: string
): Promise<TensorInventoryMint[]> {
  const allMints: TensorInventoryMint[] = []
  let cursor: string | undefined
  let pageCount = 0

  do {
    if (pageCount >= MAX_PAGINATION_PAGES) {
      break
    }

    const response = await getInventory(env, wallet, collId, cursor)
    allMints.push(...response.mints)
    pageCount++

    if (response.page.hasMore) {
      cursor = response.page.endCursor
    } else {
      cursor = undefined
    }
  } while (cursor)

  return allMints
}

export async function getFullInventory(
  env: Env,
  wallet: string
): Promise<{
  collections: Array<{
    id: string
    slug: string
    name: string
    image: string
    description: string | null
    floorPrice: string | null
    numMints: number
    tensorVerified: boolean
    compressed: boolean
  }>
  mints: TensorInventoryMint[]
}> {
  const portfolio = await getPortfolio(env, wallet)

  const collections = portfolio.map((col) => ({
    id: col.id,
    slug: col.slug,
    name: col.name,
    image: col.imageUri,
    description: col.description,
    floorPrice: col.statsV2.buyNowPrice,
    numMints: col.mintCount,
    tensorVerified: col.tensorVerified,
    compressed: col.compressed,
  }))

  const allMints: TensorInventoryMint[] = []
  const CONCURRENCY = 5

  for (let i = 0; i < portfolio.length; i += CONCURRENCY) {
    const batch = portfolio.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((col) => getAllInventoryForCollection(env, wallet, col.id)))
    allMints.push(...results.flat())
  }

  return { collections, mints: allMints }
}
