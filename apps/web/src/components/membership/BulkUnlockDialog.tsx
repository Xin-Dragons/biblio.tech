import { useState, useEffect } from "react"
import { Unlock, X, Loader2, AlertTriangle } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  stakerAtom,
  collectionsAtom,
  emissionsAtom,
  removeStakeRecordAtom,
  invalidateStakeRecordsCache,
  type StakeRecordAccount,
} from "@/stores/stake"
import {
  buildUnstakeInstructions,
  buildUnstakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
} from "@/hooks/use-staking"
import {
  getBlockhash,
  sendTransaction,
  confirmMultipleTransactionsViaWebSocket,
  getEncodedTransactionSize,
  prepareSignedTransaction,
  MAX_TX_SIZE,
  SIZE_BUFFER,
} from "@/lib/transaction"
import { logger } from "@/lib/logger"
import type { NFT } from "@/stores/nfts"
import type { Address, Instruction, TransactionSigner } from "@solana/kit"

interface BulkUnlockItem {
  nft: NFT
  stakeRecord: StakeRecordAccount
}

interface BulkUnlockDialogProps {
  items: BulkUnlockItem[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkUnlockDialog({ items, onClose, onSuccess }: BulkUnlockDialogProps) {
  const [unlocking, setUnlocking] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [estimatedTxCount, setEstimatedTxCount] = useState(1)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const removeStakeRecord = useSetAtom(removeStakeRecordAtom)

  const itemsNotMeetingMinPeriod = items.filter((item) => {
    const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : item.nft.collectionId
    const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
    if (!collection) return false
    const minStakePeriodSeconds = collection.minStakePeriod ? Number(collection.minStakePeriod) : 0
    if (minStakePeriodSeconds === 0) return false
    const lockedAtSeconds = Number(item.stakeRecord.stakedAt)
    const currentTimeSeconds = Math.floor(Date.now() / 1000)
    const timeLockedSeconds = currentTimeSeconds - lockedAtSeconds
    return timeLockedSeconds < minStakePeriodSeconds
  })

  useEffect(() => {
    if (!staker || !account || !signer || items.length === 0) {
      setEstimatedTxCount(1)
      return
    }

    const estimateTxCount = async () => {
      const ownerAddress = account as Address
      const { blockhash, lastValidBlockHeight } = await getBlockhash()

      let txCount = 0
      let currentInstructions: Instruction[] = []

      for (const item of items) {
        const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : item.nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) continue

        const instructions = isNiftyAsset(item.nft)
          ? await buildUnstakeNiftyInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
            })
          : await buildUnstakeInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
            })

        const testInstructions = [...currentInstructions, ...instructions]
        const size = await getEncodedTransactionSize(
          testInstructions,
          signer as unknown as TransactionSigner,
          blockhash,
          lastValidBlockHeight
        )

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentInstructions.length > 0) {
          txCount++
          currentInstructions = []
        }

        currentInstructions.push(...instructions)
      }

      if (currentInstructions.length > 0) txCount++
      setEstimatedTxCount(txCount)
    }

    estimateTxCount().catch(console.error)
  }, [items, staker, collections, emissions, account, signer])

  const handleBulkUnlock = async () => {
    if (!account || !signer || !capabilities.canSign || !staker) {
      toast.error("Wallet not connected or membership not available")
      return
    }

    setUnlocking(true)

    try {
      const ownerAddress = account as Address
      const { blockhash, lastValidBlockHeight } = await getBlockhash()

      const itemInstructions: { item: BulkUnlockItem; instructions: Instruction[] }[] = []
      for (const item of items) {
        const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : item.nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) {
          logger.warn(`No collection found for NFT ${item.nft.name}, skipping`)
          continue
        }

        const instructions = isNiftyAsset(item.nft)
          ? await buildUnstakeNiftyInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
            })
          : await buildUnstakeInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: ownerAddress,
            })
        itemInstructions.push({ item, instructions })
      }

      if (itemInstructions.length === 0) {
        toast.error("No valid Dandies to unlock")
        setUnlocking(false)
        return
      }

      const batches: { items: BulkUnlockItem[]; instructions: Instruction[] }[] = []
      let currentBatch: { items: BulkUnlockItem[]; instructions: Instruction[] } = {
        items: [],
        instructions: [],
      }

      for (const { item, instructions } of itemInstructions) {
        const testInstructions = [...currentBatch.instructions, ...instructions]
        const size = await getEncodedTransactionSize(
          testInstructions,
          signer as unknown as TransactionSigner,
          blockhash,
          lastValidBlockHeight
        )

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentBatch.items.length > 0) {
          batches.push(currentBatch)
          currentBatch = { items: [], instructions: [] }
        }

        currentBatch.items.push(item)
        currentBatch.instructions.push(...instructions)
      }

      if (currentBatch.items.length > 0) {
        batches.push(currentBatch)
      }

      setProgress({ current: 0, total: batches.length })

      const transactions: { signedBase64: string; items: BulkUnlockItem[] }[] = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]

        logger.debug(`Batch ${i + 1}: Preparing transaction with ${batch.instructions.length} instructions`)

        const signedBase64 = await prepareSignedTransaction({
          instructions: batch.instructions,
          feePayer: signer as unknown as TransactionSigner,
          blockhash,
          lastValidBlockHeight,
        })

        transactions.push({ signedBase64, items: batch.items })
      }

      const signatures: string[] = []
      const successfulItems: BulkUnlockItem[] = []

      for (let i = 0; i < transactions.length; i++) {
        setProgress({ current: i + 1, total: transactions.length })
        const { signedBase64, items: batchItems } = transactions[i]

        const signature = await sendTransaction(signedBase64)
        signatures.push(signature)
        successfulItems.push(...batchItems)
      }

      await confirmMultipleTransactionsViaWebSocket(signatures)

      for (const item of successfulItems) {
        removeStakeRecord(item.nft.mint)
      }

      invalidateStakeRecordsCache(account)
      toast.success(`Unlocked ${successfulItems.length} Dandies in ${transactions.length} transactions!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Bulk unlock failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to unlock Dandies")
    } finally {
      setUnlocking(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && items.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Unlock All Dandies</h2>
          <button
            onClick={onClose}
            disabled={unlocking}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dandies to unlock</span>
            <span className="font-semibold">{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transactions needed</span>
            <span className="font-semibold">{estimatedTxCount}</span>
          </div>
        </div>

        {itemsNotMeetingMinPeriod.length > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">
                {itemsNotMeetingMinPeriod.length} Dand{itemsNotMeetingMinPeriod.length > 1 ? "ies" : "y"} haven't met
                minimum lock period
              </p>
              <p className="text-muted-foreground">You can still unlock, but minimum lock period not met.</p>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="mb-4 flex -space-x-2 overflow-hidden">
            {items.slice(0, 8).map((item) => (
              <img
                key={item.nft.mint}
                src={item.nft.image}
                alt={item.nft.name}
                className="h-10 w-10 rounded-full border-2 border-card object-cover"
              />
            ))}
            {items.length > 8 && (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium">
                +{items.length - 8}
              </div>
            )}
          </div>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          This will unlock all {items.length} Dandies. You'll need to approve {estimatedTxCount} transaction
          {estimatedTxCount > 1 ? "s" : ""}.
        </p>

        {progress.total > 0 && (
          <div className="mb-4">
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

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={unlocking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleBulkUnlock} disabled={!isReady || unlocking} className="flex-1">
            {unlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
