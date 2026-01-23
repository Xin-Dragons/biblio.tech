import { atom } from "jotai"
import { nftsAtom, type NFT } from "./nfts"

/**
 * Vault store for managing locked/frozen NFT state
 * Used to track which NFTs are currently vaulted (frozen with delegate authority)
 */

/**
 * Set of mint addresses for NFTs that are currently vaulted
 */
export const vaultedMintsSetAtom = atom<Set<string>>(new Set<string>())

/**
 * Loading state for vault operations
 */
export const vaultLoadingAtom = atom<boolean>(false)

/**
 * Error state for vault operations
 */
export const vaultErrorAtom = atom<string | null>(null)

/**
 * Derived atom that filters nftsAtom to only include vaulted NFTs
 */
export const vaultedNftsAtom = atom<NFT[]>((get) => {
  const nfts = get(nftsAtom)
  const vaultedMints = get(vaultedMintsSetAtom)
  return nfts.filter((nft) => vaultedMints.has(nft.mint))
})

/**
 * Action to add mint addresses to vaulted set
 */
export const addVaultedMintsAtom = atom(null, (get, set, mints: string[]) => {
  const current = get(vaultedMintsSetAtom)
  const updated = new Set(current)
  for (const mint of mints) {
    updated.add(mint)
  }
  set(vaultedMintsSetAtom, updated)
})

/**
 * Action to remove mint addresses from vaulted set
 */
export const removeVaultedMintsAtom = atom(null, (get, set, mints: string[]) => {
  const current = get(vaultedMintsSetAtom)
  const updated = new Set(current)
  for (const mint of mints) {
    updated.delete(mint)
  }
  set(vaultedMintsSetAtom, updated)
})

/**
 * Action to set the complete vaulted mints set (used during detection)
 */
export const setVaultedMintsAtom = atom(null, (_get, set, mints: Set<string>) => {
  set(vaultedMintsSetAtom, mints)
})
