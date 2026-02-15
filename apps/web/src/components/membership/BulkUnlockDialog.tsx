import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Unlock, Loader2, ArrowRightLeft } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { stakerAtom, collectionsAtom, emissionsAtom, type StakeRecordAccount } from "@/stores/stake"
import {
  buildUnstakeInstructions,
  buildUnstakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
  fetchStakeRecord,
} from "@/hooks/use-staking"
import { batchInstructionsBySize, type InstructionGroup } from "@/lib/transaction"
import { logger } from "@/lib/logger"
import { setNftsBatchStakedAtom, type NFT } from "@/stores/nfts"
import { createNoopSigner, buildTransferInstructions } from "@/lib/vault-transactions"
import { linkedWalletsAtom } from "@/stores/linked-wallets"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"

interface BulkUnlockItem {
  nft: NFT
  stakeRecord: StakeRecordAccount
}

interface BulkUnlockDialogProps {
  nfts: NFT[]
  onClose: () => void
}

export function BulkUnlockDialog({ nfts, onClose }: BulkUnlockDialogProps) {
  const [unlocking, setUnlocking] = useState(false)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<BulkUnlockItem[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [estimatedTxCount, setEstimatedTxCount] = useState(1)
  const [recoverMode, setRecoverMode] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const setNftsBatchStaked = useSetAtom(setNftsBatchStakedAtom)

  const otherWallets = useMemo(
    () => linkedWallets.map((w) => w.publicKey).filter((w) => w !== account),
    [linkedWallets, account]
  )

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
    async function loadStakeRecords() {
      setLoading(true)
      const loadedItems: BulkUnlockItem[] = []

      const records = await Promise.all(nfts.map((nft) => fetchStakeRecord(nft.mint)))

      for (let i = 0; i < nfts.length; i++) {
        const record = records[i]
        if (record) {
          loadedItems.push({ nft: nfts[i], stakeRecord: record })
        }
      }

      setItems(loadedItems)
      setLoading(false)
    }
    loadStakeRecords()
  }, [nfts])

  useEffect(() => {
    if (!staker || !account || !signer || items.length === 0) {
      setEstimatedTxCount(1)
      return
    }

    const estimateTxCount = async () => {
      const ownerAddress = account as Address
      const noopSigner = createNoopSigner(ownerAddress)
      const destinationAddress = recoverMode && selectedDestination ? (selectedDestination as Address) : null
      const noopSignersMap = new Map<string, TransactionSigner>()
      noopSignersMap.set(ownerAddress, noopSigner)

      const itemInstructions: InstructionGroup<BulkUnlockItem>[] = []
      for (const item of items) {
        const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : item.nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) continue

        const unstakeIxs = isNiftyAsset(item.nft)
          ? await buildUnstakeNiftyInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
              ownerSigner: noopSigner,
            })
          : await buildUnstakeInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
              ownerSigner: noopSigner,
            })
        const transferIxs = destinationAddress
          ? await buildTransferInstructions({ nft: item.nft, owner: ownerAddress, destination: destinationAddress, signers: noopSignersMap })
          : []
        itemInstructions.push({ item, instructions: [...unstakeIxs, ...transferIxs] })
      }

      const batches = await batchInstructionsBySize(itemInstructions, noopSigner)
      setEstimatedTxCount(batches.length)
    }

    estimateTxCount().catch(console.error)
  }, [items, staker, collections, emissions, account, signer, recoverMode, selectedDestination])

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setUnlocking(false)
    setProgress({ current: 0, total: 0 })
    onClose()
  }

  const handleBulkUnlock = async () => {
    if (!account || !signer || !ready || !staker) {
      toast.error("Wallet not connected or membership not available")
      return
    }

    abortControllerRef.current = new AbortController()
    setUnlocking(true)

    try {
      const ownerAddress = account as Address
      const noopSigner = createNoopSigner(ownerAddress)

      const destinationAddress = recoverMode && selectedDestination ? (selectedDestination as Address) : null
      const noopSigners = new Map<string, TransactionSigner>()
      noopSigners.set(ownerAddress, noopSigner)

      const itemInstructions: InstructionGroup<BulkUnlockItem>[] = []
      for (const item of items) {
        const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : item.nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) {
          logger.warn(`No collection found for NFT ${item.nft.name}, skipping`)
          continue
        }

        const unstakeIxs = isNiftyAsset(item.nft)
          ? await buildUnstakeNiftyInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
              ownerSigner: noopSigner,
            })
          : await buildUnstakeInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
              ownerSigner: noopSigner,
            })
        const transferIxs = destinationAddress
          ? await buildTransferInstructions({ nft: item.nft, owner: ownerAddress, destination: destinationAddress, signers: noopSigners })
          : []
        itemInstructions.push({ item, instructions: [...unstakeIxs, ...transferIxs] })
      }

      if (itemInstructions.length === 0) {
        toast.error("No valid Dandies to unlock")
        setUnlocking(false)
        return
      }

      const batches = await batchInstructionsBySize(itemInstructions, noopSigner)

      setProgress({ current: 0, total: batches.length })

      const successfulItems: BulkUnlockItem[] = []
      const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]

      for (let i = 0; i < batches.length; i++) {
        if (abortControllerRef.current.signal.aborted) break

        setProgress({ current: i + 1, total: batches.length })
        const batch = batches[i]

        logger.debug(`Batch ${i + 1}: Signing and sending transaction with ${batch.instructions.length} instructions`)

        await signWithMultipleWallets({
          instructions: batch.instructions,
          requiredSigners,
          noopSigners,
          getConnectedSigner,
          onPhantomAccountChange: handlePhantomAccountChange,
          signal: abortControllerRef.current.signal,
        })

        successfulItems.push(...batch.items)
      }

      setNftsBatchStaked({ mints: successfulItems.map((item) => item.nft.mint), staked: false })

      const action = destinationAddress ? "Recovered" : "Unlocked"
      toast.success(`${action} ${successfulItems.length} Dandies in ${batches.length} transactions!`)
      onClose()
    } catch (err) {
      console.error("Bulk unlock failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to unlock Dandies")
    } finally {
      setUnlocking(false)
      setProgress({ current: 0, total: 0 })
      abortControllerRef.current = null
    }
  }

  const isReady = !!account && !!signer && ready && !!staker && items.length > 0 && !loading

  return (
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Unlock {nfts.length === 1 ? nfts[0].name : `${nfts.length} Dandies`}
          </DialogTitle>
          <DialogDescription>
            Unlock {nfts.length === 1 ? "this Dandy" : `${nfts.length} Dandies`} to transfer or sell {nfts.length === 1 ? "it" : "them"}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dandies to unlock</span>
              <span className="font-medium">{loading ? "..." : items.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transactions needed</span>
              <span className="font-medium">{loading ? "..." : estimatedTxCount}</span>
            </div>
          </div>

          {otherWallets.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recoverMode}
                  onChange={(e) => {
                    setRecoverMode(e.target.checked)
                    if (!e.target.checked) setSelectedDestination(null)
                  }}
                  className="rounded border-border"
                />
                <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                <span className="text-sm">Transfer to another wallet after unlock</span>
              </label>
              {recoverMode && (
                <Select value={selectedDestination ?? ""} onValueChange={setSelectedDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherWallets.map((wallet) => (
                      <SelectItem key={wallet} value={wallet}>
                        {wallet.slice(0, 4)}...{wallet.slice(-4)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

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
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleBulkUnlock} disabled={!isReady || unlocking || (recoverMode && !selectedDestination)}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : unlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                {recoverMode ? <ArrowRightLeft className="mr-2 h-4 w-4" /> : <Unlock className="mr-2 h-4 w-4" />}
                {recoverMode ? "Recover" : "Unlock"}{nfts.length > 1 ? " All" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
