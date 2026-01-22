import { useState, useMemo } from "react"
import { Lock, X, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { Transaction, ComputeBudgetProgram, PublicKey, type TransactionInstruction } from "@solana/web3.js"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stakerAtom, collectionsAtom, addStakeRecordAtom } from "@/stores/stake"
import { buildStakeInstructions, buildStakeNiftyInstructions, isNiftyAsset } from "@/hooks/use-staking"
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
import type { NFT } from "@/stores/nfts"

const CU_PER_STAKE = 250_000
const MAX_CU_PER_TX = 1_400_000
const MAX_STAKES_PER_TX = Math.floor(MAX_CU_PER_TX / CU_PER_STAKE)

interface BulkStakeDialogProps {
  nfts: NFT[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkStakeDialog({ nfts, onClose, onSuccess }: BulkStakeDialogProps) {
  const [staking, setStaking] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const addStakeRecord = useSetAtom(addStakeRecordAtom)

  const getEmissionAddresses = (collectionMint: string): string[] => {
    const collection = collections.find((c) => c.collectionMint === collectionMint)
    if (!collection) return []
    const emissions: string[] = []
    if (collection.tokenEmission.__option === "Some") emissions.push(collection.tokenEmission.value)
    if (collection.selectionEmission.__option === "Some") emissions.push(collection.selectionEmission.value)
    if (collection.pointsEmission.__option === "Some") emissions.push(collection.pointsEmission.value)
    if (collection.distributionEmission.__option === "Some") emissions.push(collection.distributionEmission.value)
    return emissions
  }

  const estimatedTxCount = useMemo(() => {
    if (!staker || nfts.length === 0) return 1

    const dummyBlockhash = "11111111111111111111111111111111"
    const dummyFeePayer = new PublicKey("11111111111111111111111111111111")

    let txCount = 0
    let currentCount = 0
    let currentInstructions: ReturnType<typeof buildStakeInstructions>[] = []

    for (const nft of nfts) {
      const collection = collections.find((c) => c.collectionMint === nft.collectionId)
      if (!collection) continue

      if (currentCount >= MAX_STAKES_PER_TX) {
        txCount++
        currentCount = 0
        currentInstructions = []
      }

      const instructions = isNiftyAsset(nft)
        ? buildStakeNiftyInstructions({ nft, staker, collection, owner: dummyFeePayer.toBase58() })
        : buildStakeInstructions({ nft, staker, collection, owner: dummyFeePayer.toBase58() })

      const testTx = new Transaction()
      testTx.recentBlockhash = dummyBlockhash
      testTx.feePayer = dummyFeePayer
      testTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CU_PER_STAKE * (currentCount + 1) }))
      for (const ix of currentInstructions) testTx.add(...ix)
      testTx.add(...instructions)

      const size = getTransactionSize(testTx)

      if (size > MAX_TX_SIZE - SIZE_BUFFER && currentCount > 0) {
        txCount++
        currentCount = 0
        currentInstructions = []
      }

      currentCount++
      currentInstructions.push(instructions)
    }

    if (currentCount > 0) txCount++
    return txCount
  }, [nfts, staker, collections])

  const handleBulkStake = async () => {
    if (!account || !signer || !capabilities.canSign || !staker) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    setStaking(true)

    try {
      const ownerPubkey = new PublicKey(account)
      const blockhash = await getBlockhash()

      const nftInstructions: { nft: NFT; instructions: ReturnType<typeof buildStakeInstructions> }[] = []
      for (const nft of nfts) {
        const collection = collections.find((c) => c.collectionMint === nft.collectionId)
        if (!collection) {
          console.warn(`No collection found for NFT ${nft.name}, skipping`)
          continue
        }

        const instructions = isNiftyAsset(nft)
          ? buildStakeNiftyInstructions({
              nft,
              staker,
              collection,
              owner: account,
            })
          : buildStakeInstructions({
              nft,
              staker,
              collection,
              owner: account,
            })
        nftInstructions.push({ nft, instructions })
      }

      if (nftInstructions.length === 0) {
        toast.error("No valid NFTs to stake")
        setStaking(false)
        return
      }

      const batches: { nfts: NFT[]; instructions: ReturnType<typeof buildStakeInstructions>[] }[] = []
      let currentBatch: { nfts: NFT[]; instructions: ReturnType<typeof buildStakeInstructions>[] } = {
        nfts: [],
        instructions: [],
      }

      for (const { nft, instructions } of nftInstructions) {
        if (currentBatch.nfts.length >= MAX_STAKES_PER_TX) {
          batches.push(currentBatch)
          currentBatch = { nfts: [], instructions: [] }
        }

        const testTx = new Transaction()
        testTx.recentBlockhash = blockhash
        testTx.feePayer = ownerPubkey
        testTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: CU_PER_STAKE * (currentBatch.nfts.length + 1) }))
        for (const ix of currentBatch.instructions) testTx.add(...ix)
        testTx.add(...instructions)

        const size = getTransactionSize(testTx)

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentBatch.nfts.length > 0) {
          batches.push(currentBatch)
          currentBatch = { nfts: [], instructions: [] }
        }

        currentBatch.nfts.push(nft)
        currentBatch.instructions.push(instructions)
      }

      if (currentBatch.nfts.length > 0) {
        batches.push(currentBatch)
      }

      setProgress({ current: 0, total: batches.length })

      const transactions: { tx: Transaction; nfts: NFT[] }[] = []
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const flatInstructions = batch.instructions.flat() as TransactionInstruction[]

        const { unitsConsumed } = await simulateTransaction(flatInstructions, ownerPubkey, blockhash)
        const cuLimit = Math.ceil(unitsConsumed * 1.1)
        console.log(`Batch ${i + 1}: Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

        const priorityFee = await getPriorityFee(flatInstructions, ownerPubkey, blockhash, cuLimit)
        console.log(`Batch ${i + 1}: Priority fee estimate: ${priorityFee} microLamports`)

        const tx = buildTransaction(flatInstructions, ownerPubkey, blockhash, cuLimit, priorityFee)
        transactions.push({ tx, nfts: batch.nfts })
      }

      const signatures: string[] = []
      const successfulNfts: NFT[] = []

      for (let i = 0; i < transactions.length; i++) {
        setProgress({ current: i + 1, total: transactions.length })
        const { tx, nfts: batchNfts } = transactions[i]
        const txBytes = tx.serialize({ requireAllSignatures: false })
        const signedBytes = await signer.signTransaction(txBytes)
        const signedBase64 = Buffer.from(signedBytes as Uint8Array).toString("base64")

        const signature = await sendTransaction(signedBase64)
        signatures.push(signature)
        successfulNfts.push(...batchNfts)
      }

      await confirmMultipleTransactionsViaWebSocket(signatures)

      for (const nft of successfulNfts) {
        addStakeRecord({
          nftMint: nft.mint,
          owner: account,
          staker: staker.address,
          emissions: getEmissionAddresses(nft.collectionId),
        })
      }

      toast.success(`Staked ${successfulNfts.length} NFTs in ${transactions.length} transactions!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Bulk stake failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to stake NFTs")
    } finally {
      setStaking(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && nfts.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stake All NFTs</h2>
          <button
            onClick={onClose}
            disabled={staking}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">NFTs to stake</span>
            <span className="font-semibold">{nfts.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Transactions needed</span>
            <span className="font-semibold">{estimatedTxCount}</span>
          </div>
        </div>

        {nfts.length > 0 && (
          <div className="mb-4 flex -space-x-2 overflow-hidden">
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

        <p className="mb-4 text-sm text-muted-foreground">
          This will stake all {nfts.length} NFTs. You'll need to approve {estimatedTxCount} transaction
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
          <Button variant="outline" onClick={onClose} disabled={staking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleBulkStake} disabled={!isReady || staking} className="flex-1">
            {staking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Stake All
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
