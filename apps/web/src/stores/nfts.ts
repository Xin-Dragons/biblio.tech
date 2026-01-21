import { atom } from "jotai"
import { searchQueryAtom, sortOptionAtom } from "./ui"
import { junkAtom, customOrderAtom } from "./user"

export type TokenStandard = "NonFungible" | "ProgrammableNonFungible" | "NonFungibleEdition" | "ProgrammableNonFungibleEdition"

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
export const errorAtom = atom<string | null>(null)
export const fetchedWalletAtom = atom<string | null>(null)

// NFTs atom
export const nftsAtom = atom<NFT[]>([])
export const collectionsAtom = atom<Collection[]>([])

// Fetch NFTs action - only fetches if wallet changed
export const fetchNftsAtom = atom(null, async (get, set, wallet: string) => {
  const fetchedWallet = get(fetchedWalletAtom)
  const existingNfts = get(nftsAtom)

  if (fetchedWallet === wallet && existingNfts.length > 0) {
    return
  }

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
