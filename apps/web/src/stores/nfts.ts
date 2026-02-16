import { atom } from "jotai"
import { searchQueryAtom, sortOptionAtom, tagFilterAtom, showUntaggedFilterAtom } from "./ui"
import { junkAtom, nftTagsAtom } from "./user"
import { API_BASE } from "@/lib/api"

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
  | "Nifty"
  | "Core"

export interface NFT {
  mint: string
  name: string
  image: string
  collectionId: string
  collectionName: string | null
  attributes: Array<{ trait_type: string; value: string }>
  rarityRank: number | null
  frozen: boolean
  delegate: string | null
  compressed: boolean
  tokenStandard: TokenStandard
  owner: string
  ruleSet: string | null
  staked: boolean
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
export const userNftsFetchedAtom = atom(false) // True when /api/user/nfts has been fetched

// NFTs atom
export const nftsAtom = atom<NFT[]>([])
export const collectionsAtom = atom<Collection[]>([])

// Helper to map API response to NFT type
function mapNftData(mint: Record<string, unknown>, defaultOwner?: string): NFT {
  return {
    mint: mint.mint as string,
    name: mint.name as string,
    image: mint.image as string,
    collectionId: (mint.collectionId as string) ?? "",
    collectionName: (mint.collectionName as string) ?? null,
    attributes: (mint.attributes as Array<{ trait_type: string; value: string }>) ?? [],
    rarityRank: null,
    frozen: mint.frozen as boolean,
    delegate: (mint.delegate as string) ?? null,
    compressed: mint.compressed as boolean,
    tokenStandard: (mint.tokenStandard as TokenStandard) ?? "NonFungible",
    owner: (mint.owner as string) ?? defaultOwner ?? "",
    ruleSet: (mint.ruleSet as string) ?? null,
    staked: (mint.staked as boolean) ?? false,
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
    await authFetch(`${API_BASE}/user/nft-cache/${wallet}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nfts, collections }),
    })
  } catch {
    // Ignore cache save errors
  }
}

// Background refresh helper
async function doBackgroundRefresh(set: (atom: unknown, value: unknown) => void) {
  set(isRefreshingAtom, true)
  try {
    const response = await authFetch(`${API_BASE}/user/nfts?refresh=true`)
    if (response.ok) {
      const data = await response.json()
      const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m))
      const collections: Collection[] = data.collections.map(mapCollectionData)
      set(nftsAtom, nfts)
      set(collectionsAtom, collections)
    }
  } catch {
    // Ignore background refresh errors
  } finally {
    set(isRefreshingAtom, false)
  }
}

// Fetch NFTs for all linked wallets (authenticated endpoint)
export const fetchUserNftsAtom = atom(null, async (get, set) => {
  const alreadyFetched = get(userNftsFetchedAtom)
  const existingNfts = get(nftsAtom)

  // If already fetched, do background refresh
  if (alreadyFetched && existingNfts.length > 0) {
    await doBackgroundRefresh(set as (atom: unknown, value: unknown) => void)
    return
  }

  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await authFetch(`${API_BASE}/user/nfts`)
    if (!response.ok) {
      throw new Error("Failed to fetch NFTs")
    }

    const data = await response.json()
    const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m))
    const collections: Collection[] = data.collections.map(mapCollectionData)

    set(nftsAtom, nfts)
    set(collectionsAtom, collections)
    set(userNftsFetchedAtom, true)

    // If data was stale, trigger background refresh for fresh data
    if (data.stale) {
      doBackgroundRefresh(set as (atom: unknown, value: unknown) => void)
    }
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

// Force refresh for authenticated users (bypasses cache)
export const refreshUserNftsAtom = atom(null, async (_get, set) => {
  set(isLoadingAtom, true)
  set(errorAtom, null)

  try {
    const response = await authFetch(`${API_BASE}/user/nfts?refresh=true`)
    if (!response.ok) {
      throw new Error("Failed to fetch NFTs")
    }

    const data = await response.json()
    const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m))
    const collections: Collection[] = data.collections.map(mapCollectionData)

    set(nftsAtom, nfts)
    set(collectionsAtom, collections)
    set(userNftsFetchedAtom, true)
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
  }
})

// Fetch NFTs action for single wallet (unauthenticated fallback)
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
        const response = await fetch(`${API_BASE}/nfts/by-owner/${wallet}`)
        if (response.ok) {
          const data = await response.json()
          const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m, wallet))
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
      const cacheRes = await authFetch(`${API_BASE}/user/nft-cache/${wallet}`)
      if (cacheRes.ok) {
        const cache = await cacheRes.json()
        if (cache && cache.nfts && cache.nfts.length > 0) {
          // Have cached data - load it immediately
          const cachedNfts: NFT[] = cache.nfts.map((n: Record<string, unknown>) => ({
            ...n,
            owner: (n.owner as string) ?? wallet,
            rarityRank: null,
            staked: (n.staked as boolean) ?? false,
            listing: null,
          }))
          set(nftsAtom, cachedNfts)
          set(collectionsAtom, cache.collections)
          set(fetchedWalletAtom, wallet)
          set(cacheLoadedAtom, true)
          // Now fetch fresh data in background
          set(isRefreshingAtom, true)
          fetch(`${API_BASE}/nfts/by-owner/${wallet}`)
            .then(async (response) => {
              if (response.ok) {
                const data = await response.json()
                const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m, wallet))
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
    const response = await fetch(`${API_BASE}/nfts/by-owner/${wallet}`)
    if (!response.ok) {
      throw new Error("Failed to fetch NFTs")
    }

    const data = await response.json()
    const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m, wallet))
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

// Force refresh - uses authenticated endpoint if available (bypasses cache)
export const refreshNftsAtom = atom(null, async (get, set) => {
  const hasExistingData = get(nftsAtom).length > 0
  if (hasExistingData) {
    set(isRefreshingAtom, true)
  } else {
    set(isLoadingAtom, true)
  }
  set(errorAtom, null)

  try {
    // If authenticated, use the user endpoint for all wallets
    if (isAuthenticated()) {
      const response = await authFetch(`${API_BASE}/user/nfts?refresh=true`)
      if (!response.ok) {
        throw new Error("Failed to fetch NFTs")
      }

      const data = await response.json()
      const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m))
      const collections: Collection[] = data.collections.map(mapCollectionData)

      set(nftsAtom, nfts)
      set(collectionsAtom, collections)
      set(userNftsFetchedAtom, true)
    } else {
      // Not authenticated - use single wallet endpoint
      const wallet = get(fetchedWalletAtom)
      if (!wallet) return

      set(fetchedWalletAtom, null)

      const response = await fetch(`${API_BASE}/nfts/by-owner/${wallet}`)
      if (!response.ok) {
        throw new Error("Failed to fetch NFTs")
      }

      const data = await response.json()
      const nfts: NFT[] = data.mints.map((m: Record<string, unknown>) => mapNftData(m, wallet))
      const collections: Collection[] = data.collections.map(mapCollectionData)

      set(nftsAtom, nfts)
      set(collectionsAtom, collections)
      set(fetchedWalletAtom, wallet)
    }
  } catch (err) {
    set(errorAtom, err instanceof Error ? err.message : "Unknown error")
  } finally {
    set(isLoadingAtom, false)
    set(isRefreshingAtom, false)
  }
})

// Derived atom for filtered and sorted NFTs (excludes junk)
export const filteredNftsAtom = atom((get) => {
  const nfts = get(nftsAtom)
  const junk = get(junkAtom)
  const searchQuery = get(searchQueryAtom).toLowerCase()
  const sortOption = get(sortOptionAtom)
  const tagFilter = get(tagFilterAtom)
  const showUntagged = get(showUntaggedFilterAtom)
  const nftTags = get(nftTagsAtom)

  let filtered = nfts.filter((nft) => !junk.has(nft.mint))

  // Apply tag filter (OR logic - show NFTs in ANY of the selected tags)
  if (tagFilter.size > 0 || showUntagged) {
    filtered = filtered.filter((nft) => {
      const mintTags = nftTags[nft.mint] ?? []
      // Check if untagged filter is active and NFT has no tags
      if (showUntagged && mintTags.length === 0) {
        return true
      }
      // Check if NFT is in any of the selected tags (OR logic)
      if (tagFilter.size > 0 && mintTags.some((tagId) => tagFilter.has(tagId))) {
        return true
      }
      return false
    })
  }

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

// Optimistic update for staked status - immediately updates UI without waiting for API
export const setNftStakedAtom = atom(null, (get, set, { mint, staked }: { mint: string; staked: boolean }) => {
  const currentNfts = get(nftsAtom)
  const newNfts = currentNfts.map((nft) => (nft.mint === mint ? { ...nft, staked } : nft))
  set(nftsAtom, newNfts)
})

// Optimistic update for multiple NFTs staked status
export const setNftsBatchStakedAtom = atom(
  null,
  (get, set, { mints, staked }: { mints: string[]; staked: boolean }) => {
    const mintSet = new Set(mints)
    const currentNfts = get(nftsAtom)
    const newNfts = currentNfts.map((nft) => (mintSet.has(nft.mint) ? { ...nft, staked } : nft))
    set(nftsAtom, newNfts)
  }
)

// Refetch a single NFT by mint address and update in local array
export const refetchNftAtom = atom(null, async (get, set, mint: string) => {
  const currentNfts = get(nftsAtom)

  // Only proceed if the NFT exists in local array
  const existingIndex = currentNfts.findIndex((nft) => nft.mint === mint)
  if (existingIndex === -1) {
    return
  }

  try {
    const response = await authFetch(`${API_BASE}/nfts/${mint}`)
    if (!response.ok) {
      return
    }

    const data = await response.json()
    const updatedNft = mapNftData(data, currentNfts[existingIndex].owner)

    // Create new array with updated NFT
    const newNfts = currentNfts.map((nft, index) => (index === existingIndex ? updatedNft : nft))
    set(nftsAtom, newNfts)
  } catch {
    // Ignore refetch errors silently
  }
})

// Refetch multiple NFTs by mint addresses in a single batch request
export const refetchNftBatchAtom = atom(null, async (get, set, mints: string[]): Promise<NFT[]> => {
  if (mints.length === 0) return []

  const currentNfts = get(nftsAtom)

  // Filter to only mints that exist in local array
  const existingMints = new Set(currentNfts.map((nft) => nft.mint))
  const mintsToFetch = mints.filter((mint) => existingMints.has(mint))

  if (mintsToFetch.length === 0) return []

  try {
    const response = await authFetch(`${API_BASE}/nfts/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mints: mintsToFetch }),
    })

    if (!response.ok) return []

    const data = await response.json()
    const updatedAssets = data.assets as Array<Record<string, unknown>>

    if (!updatedAssets || updatedAssets.length === 0) return []

    // Create map of updated NFTs
    const updatedMap = new Map<string, NFT>()
    for (const asset of updatedAssets) {
      const existingNft = currentNfts.find((n) => n.mint === asset.mint)
      if (existingNft) {
        updatedMap.set(asset.mint as string, mapNftData(asset, existingNft.owner))
      }
    }

    // Update local array
    const newNfts = currentNfts.map((nft) => updatedMap.get(nft.mint) ?? nft)
    set(nftsAtom, newNfts)

    // Return the updated NFTs for immediate use
    return Array.from(updatedMap.values())
  } catch {
    // Ignore refetch errors silently
    return []
  }
})

export const fetchTokensAtom = atom(null, async (get, set, wallet: string) => {
  const fetchedWallet = get(tokensFetchedWalletAtom)
  const existingTokens = get(tokensAtom)

  if (fetchedWallet === wallet && existingTokens.length > 0) {
    return
  }

  set(tokensLoadingAtom, true)

  try {
    const response = await fetch(`${API_BASE}/tokens/by-owner/${wallet}`)
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
