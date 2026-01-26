import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import { nftsAtom, type NFT } from "./nfts"
import { linkedWalletsAtom } from "./linked-wallets"

/**
 * Vault store for managing locked/frozen NFT state
 * Used to track which NFTs are currently vaulted (frozen with delegate authority)
 */

/**
 * Set of mint addresses for NFTs that are currently vaulted
 */
export const vaultedMintsSetAtom = atom<Set<string>>(new Set<string>())

/**
 * Atom family to check if a specific mint is vaulted
 * More reliable than selectAtom for virtualized grids
 */
export const isVaultedAtom = atomFamily((mint: string) => atom((get) => get(vaultedMintsSetAtom).has(mint)))

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
 * Derived atom that filters nftsAtom to only include NFTs that can be vaulted
 * (not frozen, not already vaulted)
 */
export const unvaultedNftsAtom = atom<NFT[]>((get) => {
  const nfts = get(nftsAtom)
  const vaultedMints = get(vaultedMintsSetAtom)
  return nfts.filter((nft) => !nft.frozen && !vaultedMints.has(nft.mint))
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

/**
 * Action to detect vaulted NFTs from the loaded NFT data.
 * An NFT is considered vaulted if it is frozen AND has a delegate that is
 * either the connected wallet or a linked wallet.
 *
 * IMPORTANT: This is additive ONLY - it preserves existing optimistic mints
 * and only adds newly detected ones. It NEVER removes mints.
 * Removal only happens via explicit removeVaultedMintsAtom calls during unvault.
 */
export const detectVaultedNftsAtom = atom(null, (get, set, connectedWallet: string | null) => {
  const nfts = get(nftsAtom)
  const linkedWallets = get(linkedWalletsAtom)
  const currentVaulted = get(vaultedMintsSetAtom)

  if (!connectedWallet) {
    set(vaultedMintsSetAtom, new Set<string>())
    return
  }

  const validDelegates = new Set<string>([connectedWallet, ...linkedWallets.map((w) => w.publicKey)])

  // Start with existing optimistic mints
  const vaultedMints = new Set<string>(currentVaulted)

  // Add any newly detected vaulted NFTs from the data
  for (const nft of nfts) {
    if (nft.frozen && nft.delegate && validDelegates.has(nft.delegate)) {
      vaultedMints.add(nft.mint)
    }
  }

  set(vaultedMintsSetAtom, vaultedMints)
})
