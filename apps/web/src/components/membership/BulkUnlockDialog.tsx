import { useState, useMemo } from "react"
import { Unlock, X, Loader2, AlertTriangle } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { Transaction, ComputeBudgetProgram, PublicKey, type TransactionInstruction } from "@solana/web3.js"
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
  DANDIES_NIFTY_COLLECTION,
} from "@/hooks/use-staking"
import {
  getBlockhash,
  simulateTransaction,
  getPriorityFee,
  buildTransaction,
  sendTransaction,
  confirmMultipleTransactionsViaWebSocket,
  MAX_TX_SIZE,
  SIZE_BUFFER,
  getTransactionSize,
} from "@/lib/transaction"
import { logger } from "@/lib/logger"
import type { NFT } from "@/stores/nfts"

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
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const removeStakeRecord = useSetAtom(removeStakeRecordAtom)

  const itemsNotMeetingMinPeriod = items.filter((item) => {
    const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION.toBase58() : item.nft.collectionId
    const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
    if (!collection) return false
    const minStakePeriodSeconds = collection.minStakePeriod ? Number(collection.minStakePeriod) : 0
    if (minStakePeriodSeconds === 0) return false
    const lockedAtSeconds = Number(item.stakeRecord.stakedAt)
    const currentTimeSeconds = Math.floor(Date.now() / 1000)
    const timeLockedSeconds = currentTimeSeconds - lockedAtSeconds
    return timeLockedSeconds < minStakePeriodSeconds
  })

  const estimatedTxCount = useMemo(() => {
    if (!staker || !account || items.length === 0) return 1

    const dummyBlockhash = "11111111111111111111111111111111"
    const ownerPubkey = new PublicKey(account)

    let txCount = 0
    let currentTx = new Transaction()
    currentTx.recentBlockhash = dummyBlockhash
    currentTx.feePayer = ownerPubkey
    currentTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))

    for (const item of items) {
      const collectionMintToFind = isNiftyAsset(item.nft) ? DANDIES_NIFTY_COLLECTION.toBase58() : item.nft.collectionId
      const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
      if (!collection) continue

      const instructions = isNiftyAsset(item.nft)
        ? buildUnstakeNiftyInstructions({
            nft: item.nft,
            stakeRecord: item.stakeRecord,
            staker,
            collection,
            emissions,
            owner: account,
          })
        : buildUnstakeInstructions({
            nft: item.nft,
            stakeRecord: item.stakeRecord,
            staker,
            collection,
            emissions,
            owner: account,
          })

      const testTx = new Transaction()
      testTx.recentBlockhash = dummyBlockhash
      testTx.feePayer = ownerPubkey
      testTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
      testTx.instructions = [...currentTx.instructions, ...instructions]

      const size = getTransactionSize(testTx)

      if (size > MAX_TX_SIZE - SIZE_BUFFER && currentTx.instructions.length > 1) {
        txCount++
        currentTx = new Transaction()
        currentTx.recentBlockhash = dummyBlockhash
        currentTx.feePayer = ownerPubkey
        currentTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
      }

      currentTx.add(...instructions)
    }

    if (currentTx.instructions.length > 1) txCount++
    return txCount
  }, [items, staker, collections, emissions, account])

  const handleBulkUnlock = async () => {
    if (!account || !signer || !capabilities.canSign || !staker) {
      toast.error("Wallet not connected or membership not available")
      return
    }

    setUnlocking(true)

    try {
      const ownerPubkey = new PublicKey(account)
      const blockhash = await getBlockhash()

      const itemInstructions: { item: BulkUnlockItem; instructions: ReturnType<typeof buildUnstakeInstructions> }[] = []
      for (const item of items) {
        const collectionMintToFind = isNiftyAsset(item.nft)
          ? DANDIES_NIFTY_COLLECTION.toBase58()
          : item.nft.collectionId
        const collection = collections.find((c) => c.collectionMint === collectionMintToFind)
        if (!collection) {
          logger.warn(`No collection found for NFT ${item.nft.name}, skipping`)
          continue
        }

        const instructions = isNiftyAsset(item.nft)
          ? buildUnstakeNiftyInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: account,
            })
          : buildUnstakeInstructions({
              nft: item.nft,
              stakeRecord: item.stakeRecord,
              staker,
              collection,
              emissions,
              owner: account,
            })
        itemInstructions.push({ item, instructions })
      }

      if (itemInstructions.length === 0) {
        toast.error("No valid Dandies to unlock")
        setUnlocking(false)
        return
      }

      const batches: { items: BulkUnlockItem[]; instructions: TransactionInstruction[][] }[] = []
      let currentBatch: { items: BulkUnlockItem[]; instructions: TransactionInstruction[][] } = {
        items: [],
        instructions: [],
      }

      for (const { item, instructions } of itemInstructions) {
        const testTx = new Transaction()
        testTx.recentBlockhash = blockhash
        testTx.feePayer = ownerPubkey
        testTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
        for (const ix of currentBatch.instructions) testTx.add(...ix)
        testTx.add(...instructions)

        const size = getTransactionSize(testTx)

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentBatch.items.length > 0) {
          batches.push(currentBatch)
          currentBatch = { items: [], instructions: [] }
        }

        currentBatch.items.push(item)
        currentBatch.instructions.push(instructions)
      }

      if (currentBatch.items.length > 0) {
        batches.push(currentBatch)
      }

      setProgress({ current: 0, total: batches.length })

      const transactions: { tx: Transaction; items: BulkUnlockItem[] }[] = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const flatInstructions = batch.instructions.flat() as TransactionInstruction[]

        const { unitsConsumed } = await simulateTransaction(flatInstructions, ownerPubkey, blockhash)
        const cuLimit = Math.ceil(unitsConsumed * 1.1)
        logger.debug(`Batch ${i + 1}: Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

        const priorityFee = await getPriorityFee(flatInstructions, ownerPubkey, blockhash, cuLimit)
        logger.debug(`Batch ${i + 1}: Priority fee estimate: ${priorityFee} microLamports`)

        const tx = buildTransaction(flatInstructions, ownerPubkey, blockhash, cuLimit, priorityFee)
        transactions.push({ tx, items: batch.items })
      }

      const signatures: string[] = []
      const successfulItems: BulkUnlockItem[] = []

      for (let i = 0; i < transactions.length; i++) {
        setProgress({ current: i + 1, total: transactions.length })
        const { tx, items: batchItems } = transactions[i]
        const txBytes = tx.serialize({ requireAllSignatures: false })
        const signedBytes = await signer.signTransaction(txBytes)
        const signedBase64 = Buffer.from(signedBytes as Uint8Array).toString("base64")

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
