import { useState, useEffect, useRef, useCallback } from "react"
import { Lock, Loader2 } from "lucide-react"
import { useWallet, useKitTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import type { Address, TransactionSigner } from "@solana/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { stakerAtom, collectionsAtom } from "@/stores/stake"
import {
  buildStakeInstructions,
  buildStakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
} from "@/hooks/use-staking"
import { batchInstructionsBySize, type InstructionGroup } from "@/lib/transaction"
import { logger } from "@/lib/logger"
import { setNftsBatchStakedAtom, type NFT } from "@/stores/nfts"
import { createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"

const CU_PER_STAKE = 250_000
const MAX_CU_PER_TX = 1_400_000

interface BulkLockDialogProps {
  nfts: NFT[]
  onClose: () => void
}

export function BulkLockDialog({ nfts, onClose }: BulkLockDialogProps) {
  const [locking, setLocking] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [estimatedTxCount, setEstimatedTxCount] = useState(1)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const setNftsBatchStaked = useSetAtom(setNftsBatchStakedAtom)

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

  useEffect(() => {
    if (!staker || !signer || nfts.length === 0) {
      setEstimatedTxCount(1)
      return
    }

    const estimateTxCount = async () => {
      const ownerAddress = (account ?? "") as Address
      const noopSigner = createNoopSigner(ownerAddress)

      const nftInstructions: InstructionGroup<NFT>[] = []
      for (const nft of nfts) {
        const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) continue

        const instructions = isNiftyAsset(nft)
          ? await buildStakeNiftyInstructions({ nft, staker, collection, owner: ownerAddress })
          : await buildStakeInstructions({ nft, staker, collection, owner: ownerAddress })
        nftInstructions.push({ item: nft, instructions })
      }

      const batches = await batchInstructionsBySize(nftInstructions, noopSigner, {
        maxCuPerTx: MAX_CU_PER_TX,
        cuPerItem: CU_PER_STAKE,
      })
      setEstimatedTxCount(batches.length)
    }

    estimateTxCount().catch(console.error)
  }, [nfts, staker, collections, account, signer])

  const handleBulkLock = async () => {
    if (!account || !signer || !ready || !staker) {
      toast.error("Wallet not connected or locking not available")
      return
    }

    setLocking(true)

    try {
      const ownerAddress = account as Address
      const noopSigner = createNoopSigner(ownerAddress)

      const nftInstructions: InstructionGroup<NFT>[] = []
      for (const nft of nfts) {
        const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) {
          logger.warn(`No collection found for NFT ${nft.name}, skipping`)
          continue
        }

        const instructions = isNiftyAsset(nft)
          ? await buildStakeNiftyInstructions({ nft, staker, collection, owner: ownerAddress })
          : await buildStakeInstructions({ nft, staker, collection, owner: ownerAddress })
        nftInstructions.push({ item: nft, instructions })
      }

      if (nftInstructions.length === 0) {
        toast.error("No valid Dandies to lock")
        setLocking(false)
        return
      }

      const batches = await batchInstructionsBySize(nftInstructions, noopSigner, {
        maxCuPerTx: MAX_CU_PER_TX,
        cuPerItem: CU_PER_STAKE,
      })

      setProgress({ current: 0, total: batches.length })

      const successfulNfts: NFT[] = []
      const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]
      const noopSigners = new Map<string, TransactionSigner>()
      noopSigners.set(ownerAddress, noopSigner)

      for (let i = 0; i < batches.length; i++) {
        setProgress({ current: i + 1, total: batches.length })
        const batch = batches[i]

        logger.debug(`Batch ${i + 1}: Signing and sending transaction with ${batch.instructions.length} instructions`)

        await signWithMultipleWallets({
          instructions: batch.instructions,
          requiredSigners,
          noopSigners,
          getConnectedSigner,
          onPhantomAccountChange: handlePhantomAccountChange,
        })

        successfulNfts.push(...batch.items)
      }

      setNftsBatchStaked({ mints: successfulNfts.map((nft) => nft.mint), staked: true })

      toast.success(`Locked ${successfulNfts.length} Dandies in ${batches.length} transactions!`)
      onClose()
    } catch (err) {
      console.error("Bulk lock failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to lock Dandies")
    } finally {
      setLocking(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const isReady = !!account && !!signer && ready && !!staker && nfts.length > 0

  return (
    <Dialog open onOpenChange={(open) => !open && !locking && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Lock All Dandies
          </DialogTitle>
          <DialogDescription>Lock {nfts.length} Dandies to earn membership rewards.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dandies to lock</span>
              <span className="font-medium">{nfts.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transactions needed</span>
              <span className="font-medium">{estimatedTxCount}</span>
            </div>
          </div>

          {nfts.length > 0 && (
            <div className="flex -space-x-2 overflow-hidden">
              {nfts.slice(0, 8).map((nft) => (
                <img
                  key={nft.mint}
                  src={nft.image}
                  alt={nft.name}
                  className="h-10 w-10 rounded-full border-2 border-card object-cover"
                />
              ))}
              {nfts.length > 8 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                  +{nfts.length - 8}
                </div>
              )}
            </div>
          )}

          {progress.total > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Signing transactions</span>
                <span>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={locking}>
            Cancel
          </Button>
          <Button onClick={handleBulkLock} disabled={!isReady || locking}>
            {locking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Locking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
