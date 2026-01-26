import { useState, useCallback, useRef, useEffect } from "react"
import { useWallet, useKitTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import type { Address, TransactionSigner } from "@solana/kit"
import { stakerAtom, collectionsAtom, emissionsAtom } from "@/stores/stake"
import {
  buildStakeInstructions,
  buildStakeNiftyInstructions,
  buildUnstakeInstructions,
  buildUnstakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
  fetchStakeRecord,
} from "@/hooks/use-staking"
import { setNftStakedAtom, type NFT } from "@/stores/nfts"
import { createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"

export function useLockDandy() {
  const [lockingMint, setLockingMint] = useState<string | null>(null)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const setNftStaked = useSetAtom(setNftStakedAtom)

  useEffect(() => {
    signerRef.current = signer
  }, [signer])

  const getConnectedSigner = useCallback(() => {
    if (!signerRef.current) throw new Error("No signer available")
    return signerRef.current
  }, [])

  const handlePhantomAccountChange = useCallback(async () => {
    await disconnect()
    await connect("wallet-standard:phantom" as Parameters<typeof connect>[0])
  }, [disconnect, connect])

  const lock = useCallback(
    async (nft: NFT) => {
      const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : nft.collectionId
      const collection = collections.find((c) => c.collectionMint === collectionMintToFind)

      if (!account || !signer || !ready || !staker || !collection) {
        toast.error("Wallet not connected or locking not available")
        return
      }

      setLockingMint(nft.mint)

      try {
        const ownerAddress = account as Address
        const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]
        const noopSigners = new Map<string, TransactionSigner>()
        noopSigners.set(ownerAddress, createNoopSigner(ownerAddress))

        const instructions = isNiftyAsset(nft)
          ? await buildStakeNiftyInstructions({ nft, staker, collection, owner: ownerAddress })
          : await buildStakeInstructions({ nft, staker, collection, owner: ownerAddress })

        await signWithMultipleWallets({
          instructions,
          requiredSigners,
          noopSigners,
          getConnectedSigner,
          onPhantomAccountChange: handlePhantomAccountChange,
        })

        setNftStaked({ mint: nft.mint, staked: true })
        toast.success(`Locked ${nft.name}`)
      } catch (err) {
        console.error("Lock failed:", err)
        toast.error(err instanceof Error ? err.message : "Failed to lock")
      } finally {
        setLockingMint(null)
      }
    },
    [account, signer, ready, staker, collections, getConnectedSigner, handlePhantomAccountChange, setNftStaked]
  )

  return { lock, lockingMint }
}

export function useUnlockDandy() {
  const [unlockingMint, setUnlockingMint] = useState<string | null>(null)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const setNftStaked = useSetAtom(setNftStakedAtom)

  useEffect(() => {
    signerRef.current = signer
  }, [signer])

  const getConnectedSigner = useCallback(() => {
    if (!signerRef.current) throw new Error("No signer available")
    return signerRef.current
  }, [])

  const handlePhantomAccountChange = useCallback(async () => {
    await disconnect()
    await connect("wallet-standard:phantom" as Parameters<typeof connect>[0])
  }, [disconnect, connect])

  const unlock = useCallback(
    async (nft: NFT) => {
      const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : nft.collectionId
      const collection = collections.find((c) => c.collectionMint === collectionMintToFind)

      if (!account || !signer || !ready || !staker || !collection) {
        toast.error("Wallet not connected or unlocking not available")
        return
      }

      setUnlockingMint(nft.mint)

      try {
        const stakeRecord = await fetchStakeRecord(nft.mint)
        if (!stakeRecord) {
          toast.error("Stake record not found")
          return
        }

        const ownerAddress = account as Address
        const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]
        const noopSigners = new Map<string, TransactionSigner>()
        noopSigners.set(ownerAddress, createNoopSigner(ownerAddress))

        const instructions = isNiftyAsset(nft)
          ? await buildUnstakeNiftyInstructions({
              nft,
              stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
            })
          : await buildUnstakeInstructions({ nft, stakeRecord, staker, collection, emissions, owner: ownerAddress })

        await signWithMultipleWallets({
          instructions,
          requiredSigners,
          noopSigners,
          getConnectedSigner,
          onPhantomAccountChange: handlePhantomAccountChange,
        })

        setNftStaked({ mint: nft.mint, staked: false })
        toast.success(`Unlocked ${nft.name}`)
      } catch (err) {
        console.error("Unlock failed:", err)
        toast.error(err instanceof Error ? err.message : "Failed to unlock")
      } finally {
        setUnlockingMint(null)
      }
    },
    [
      account,
      signer,
      ready,
      staker,
      collections,
      emissions,
      getConnectedSigner,
      handlePhantomAccountChange,
      setNftStaked,
    ]
  )

  return { unlock, unlockingMint }
}
