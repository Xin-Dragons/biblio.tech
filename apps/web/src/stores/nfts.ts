import { atom } from "jotai"
import { searchQueryAtom, sortOptionAtom } from "./ui"
import { junkAtom, customOrderAtom } from "./user"

function getAuthHeaders(): HeadersInit {
  try {
    const sessionStr = localStorage.getItem("biblio-session")
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      if (session?.token) {
        return { Authorization: `Bearer ${session.token}` }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {}
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)
  const authHeaders = getAuthHeaders()
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value)
  }
  return fetch(url, { ...options, headers })
}

function isAuthenticated(): boolean {
  try {
    const sessionStr = localStorage.getItem("biblio-session")
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      return !!session?.token
    }
  } catch {
    // Ignore parse errors
  }
  return false
}

export type TokenStandard =
  | "NonFungible"
  | "ProgrammableNonFungible"
  | "NonFungibleEdition"
  | "ProgrammableNonFungibleEdition"

export interface NFT {
  mint: string
  name: string
  image: string
  collectionId: string
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  rarityRank: number | null
  frozen: boolean
  compressed: boolean
  tokenStandard: TokenStandard
  listing: {
    price: string | null
    source: string
  } | null
}

export interface Collection {
  id: string
  name: string
  image: string
  numMints: number
}

// Base atoms
export const isLoadingAtom = atom(false)
export const isRefreshingAtom = atom(false) // True when refreshing in background
export const errorAtom = atom<string | null>(null)
export const fetchedWalletAtom = atom<string | null>(null)
export const cacheLoadedAtom = atom(false)

// NFTs atom
export const nftsAtom = atom<NFT[]>([])
export const collectionsAtom = atom<Collection[]>([])

// Helper to map API response to NFT type
function mapNftData(mint: Record<string, unknown>): NFT {
  return {
    mint: mint.mint as string,
    name: mint.name as string,
    image: mint.image as string,
    collectionId: (mint.collectionId as string) ?? "",
    collectionName: (mint.collectionName as string) ?? null,
    attributes: (mint.attributes as Array<{ trait_type: string; value: string }>) ?? [],
    rarityRank: null,
    frozen: mint.frozen as boolean,
    compressed: mint.compressed as boolean,
    tokenStandard: (mint.tokenStandard as TokenStandard) ?? "NonFungible",
    listing: null,
  }
}

function mapCollectionData(col: Record<string, unknown>): Collection {
  return {
    id: col.id as string,
    name: col.name as string,
    image: (col.image as string) ?? "",
    numMints: col.count as number,
  }
}

// Save to cache (fire and forget)
async function saveToCache(wallet: string, nfts: NFT[], collections: Collection[]) {
  if (!isAuthenticated()) return
  try {
    await authFetch(`/api/user/nft-cache/${wallet}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nfts, collections }),
    })
  } catch {
    // Ignore cache save errors
  }
}

// Fetch NFTs action - loads from cache first if available
export const fetchNftsAtom = atom(null, async (get, set, wallet: string) => {
  const fetchedWallet = get(fetchedWalletAtom)
  const existingNfts = get(nftsAtom)
  const cacheLoaded = get(cacheLoadedAtom)

  // If already have data for this wallet, just refresh in background
  if (fetchedWallet === wallet && existingNfts.length > 0) {
    // Background refresh if cache was loaded
    if (cacheLoaded) {
      set(isRefreshingAtom, true)
      try {
        const response = await fetch(`/api/nfts/by-owner/${wallet}`)
        if (response.ok) {
          const data = await response.json()
          const nfts: NFT[] = data.mints.map(mapNftData)
          const collections: Collection[] = data.collections.map(mapCollectionData)
          set(nftsAtom, nfts)
          set(collectionsAtom, collections)
          set(cacheLoadedAtom, false)
          // Save updated data to cache
          saveToCache(wallet, nfts, collections)
        }
      } catch {
        // Ignore background refresh errors
      } finally {
        set(isRefreshingAtom, false)
      }
    }
    return
  }

  // Try to load from cache first (only if authenticated)
  if (isAuthenticated()) {
    try {
      const cacheRes = await authFetch(`/api/user/nft-cache/${wallet}`)
      if (cacheRes.ok) {
        const cache = await cacheRes.json()
        if (cache && cache.nfts && cache.nfts.length > 0) {
          // Have cached data - load it immediately
          const cachedNfts: NFT[] = cache.nfts.map((n: Record<string, unknown>) => ({
            ...n,
            rarityRank: null,
            listing: null,
          }))
          set(nftsAtom, cachedNfts)
          set(collectionsAtom, cache.collections)
          set(fetchedWalletAtom, wallet)
          set(cacheLoadedAtom, true)
          // Now fetch fresh data in background
          set(isRefreshingAtom, true)
          fetch(`/api/nfts/by-owner/${wallet}`)
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json()
                const nfts: NFT[] = data.mints.map(mapNftData)
                const collections: Collection[] = data.collections.map(mapCollectionData)
                set(nftsAtom, nfts)
                set(collectionsAtom, collections)
                set(cacheLoadedAtom, false)
                // Save updated data to cache
                saveToCache(wallet, nfts, collections)
              }
            })
            .catch(() => {
              // Ignore background refresh errors
            })
            .finally(() => {
              set(isRefreshingAtom, false)
            })
          return
        }
      }
    } catch {
      // Cache not available, continue with normal fetch
    }
  }

  // No cache - do full load
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await fetch(`/api/nfts/by-owner/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch NFTs")
    }

    const data = await response.json()
    const nfts: NFT[] = data.mints.map(mapNftData)
    const collections: Collection[] = data.collections.map(mapCollectionData)

    set(nftsAtom, nfts)
    set(collectionsAtom, collections)
    set(fetchedWalletAtom, wallet)
    set(cacheLoadedAtom, false)

    // Save to cache
    saveToCache(wallet, nfts, collections)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

// Force refresh - ignores cache
export const refreshNftsAtom = atom(null, async (get, set) => {
  const wallet = get(fetchedWalletAtom)
  if (!wallet) return

  set(fetchedWalletAtom, null)
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await fetch(`/api/nfts/by-owner/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch NFTs")
    }

    const data = await response.json()

    const nfts: NFT[] = data.mints.map((mint: Record<string, unknown>) => ({
      mint: mint.mint as string,
      name: mint.name as string,
      image: mint.image as string,
      collectionId: (mint.collectionId as string) ?? "",
      collectionName: (mint.collectionName as string) ?? null,
      attributes: (mint.attributes as Array<{ trait_type: string; value: string }>) ?? [],
      rarityRank: null,
      frozen: mint.frozen as boolean,
      compressed: mint.compressed as boolean,
      tokenStandard: (mint.tokenStandard as TokenStandard) ?? "NonFungible",
      listing: null,
    }))

    const collections: Collection[] = data.collections.map((col: Record<string, unknown>) => ({
      id: col.id as string,
      name: col.name as string,
      image: (col.image as string) ?? "",
      numMints: col.count as number,
    }))

    set(nftsAtom, nfts)
    set(collectionsAtom, collections)
    set(fetchedWalletAtom, wallet)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

// Derived atom for filtered and sorted NFTs (excludes junk)
export const filteredNftsAtom = atom((get) => {
  const nfts = get(nftsAtom)
  const junk = get(junkAtom)
  const searchQuery = get(searchQueryAtom).toLowerCase()
  const sortOption = get(sortOptionAtom)
  const customOrder = get(customOrderAtom)

  let filtered = nfts.filter((nft) => !junk.has(nft.mint))

  if (searchQuery) {
    filtered = filtered.filter(
      (nft) =>
        nft.name.toLowerCase().includes(searchQuery) ||
        nft.collectionName?.toLowerCase().includes(searchQuery) ||
        nft.mint.toLowerCase().includes(searchQuery)
    )
  }

  const sorted = [...filtered]
  switch (sortOption) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case "rarity":
      sorted.sort((a, b) => (a.rarityRank ?? Infinity) - (b.rarityRank ?? Infinity))
      break
    case "collection":
      sorted.sort((a, b) => (a.collectionName ?? "").localeCompare(b.collectionName ?? ""))
      break
    case "custom": {
      const orderMap = new Map(customOrder.map((mint, index) => [mint, index]))
      sorted.sort((a, b) => {
        const aIndex = orderMap.get(a.mint) ?? Infinity
        const bIndex = orderMap.get(b.mint) ?? Infinity
        return aIndex - bIndex
      })
      break
    }
    case "recent":
    default:
      break
  }

  return sorted
})

// Derived atom for filtered collections
export const filteredCollectionsAtom = atom((get) => {
  const collections = get(collectionsAtom)
  const searchQuery = get(searchQueryAtom).toLowerCase()

  if (!searchQuery) return collections

  return collections.filter((col) => col.name.toLowerCase().includes(searchQuery))
})

// Get NFTs for a specific collection
export const nftsByCollectionIdAtom = atom((get) => {
  const nfts = get(filteredNftsAtom)
  return (collectionId: string) => nfts.filter((nft) => nft.collectionId === collectionId)
})

// Selected NFT for detail modal
export const selectedNftAtom = atom<NFT | null>(null)

// SPL Tokens
export interface Token {
  mint: string
  name: string
  symbol: string
  image: string
  balance: string
  decimals: number
  uiBalance: number
}

export const tokensAtom = atom<Token[]>([])
export const tokensLoadingAtom = atom(false)
export const tokensFetchedWalletAtom = atom<string | null>(null)

export const fetchTokensAtom = atom(null, async (get, set, wallet: string) => {
  const fetchedWallet = get(tokensFetchedWalletAtom)
  const existingTokens = get(tokensAtom)

  if (fetchedWallet === wallet && existingTokens.length > 0) {
    return
  }

  set(tokensLoadingAtom, true)

  try {
    const response = await fetch(`/api/tokens/by-owner/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch tokens")
    }

    const data = await response.json()
    set(tokensAtom, data.tokens)
    set(tokensFetchedWalletAtom, wallet)
  } catch (err) {
    console.error("Failed to fetch tokens:", err)
  } finally {
    set(tokensLoadingAtom, false)
  }
})
