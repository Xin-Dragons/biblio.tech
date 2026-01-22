import { useState } from "react"
import { Unlock, X, Loader2, AlertTriangle } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { Transaction, ComputeBudgetProgram, PublicKey } from "@solana/web3.js"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  stakerAtom,
  collectionsAtom,
  emissionsAtom,
  removeStakeRecordAtom,
  type StakeRecordAccount,
} from "@/stores/stake"
import { buildUnstakeInstructions, buildUnstakeNiftyInstructions, isNiftyAsset } from "@/hooks/use-staking"
import { confirmTransactionViaWebSocket } from "@/lib/transaction"
import { decodeSimulationError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import type { NFT } from "@/stores/nfts"

interface UnstakeDialogProps {
  nft: NFT
  stakeRecord: StakeRecordAccount
  onClose: () => void
  onSuccess: () => void
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours !== 1 ? "s" : ""}`
  }
  const days = Math.floor(seconds / 86400)
  return `${days} day${days !== 1 ? "s" : ""}`
}

export function UnstakeDialog({ nft, stakeRecord, onClose, onSuccess }: UnstakeDialogProps) {
  const [unstaking, setUnstaking] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const removeStakeRecord = useSetAtom(removeStakeRecordAtom)

  const collection = collections.find((c) => c.collectionMint === nft.collectionId)

  const stakedAtSeconds = Number(stakeRecord.stakedAt)
  const minStakePeriodSeconds = collection ? Number(collection.minStakePeriod) : 0
  const currentTimeSeconds = Math.floor(Date.now() / 1000)
  const timeStakedSeconds = currentTimeSeconds - stakedAtSeconds
  const remainingSeconds = minStakePeriodSeconds - timeStakedSeconds
  const isMinPeriodMet = remainingSeconds <= 0

  const handleUnstake = async () => {
    if (!account || !signer || !capabilities.canSign || !staker || !collection) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    setUnstaking(true)

    try {
      const ownerPubkey = new PublicKey(account)

      logger.debug("Building unstake instruction with:", {
        nft: { mint: nft.mint, name: nft.name, collectionId: nft.collectionId },
        stakeRecord: { address: stakeRecord.address, nftMint: stakeRecord.nftMint, owner: stakeRecord.owner },
        staker: { address: staker.address },
        collection: { address: collection.address, collectionMint: collection.collectionMint },
        owner: account,
      })

      const instructions = isNiftyAsset(nft)
        ? buildUnstakeNiftyInstructions({
            nft,
            stakeRecord,
            staker,
            collection,
            emissions,
            owner: account,
          })
        : buildUnstakeInstructions({
            nft,
            stakeRecord,
            staker,
            collection,
            emissions,
            owner: account,
          })
      logger.debug("Unstake instruction built:", instructions[0])

      // Get blockhash via RPC proxy
      const blockhashResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      })
      const blockhashData = (await blockhashResponse.json()) as {
        result?: { value: { blockhash: string; lastValidBlockHeight: number } }
      }
      const blockhash = blockhashData.result?.value.blockhash
      if (!blockhash) throw new Error("Failed to get blockhash")

      // First simulate with high CU limit to get actual units consumed
      const simTx = new Transaction()
      simTx.recentBlockhash = blockhash
      simTx.feePayer = ownerPubkey
      simTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }))
      simTx.add(...instructions)

      const simResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "simulateTransaction",
          params: [simTx.serialize({ requireAllSignatures: false }).toString("base64"), { encoding: "base64" }],
        }),
      })
      const simData = (await simResponse.json()) as {
        result?: { value: { err: unknown; logs: string[]; unitsConsumed: number } }
      }

      if (simData.result?.value.err) {
        console.error("Unstake simulation failed:", simData.result.value.err)
        console.error("Simulation logs:", simData.result.value.logs)
        const decodedError = decodeSimulationError(
          simData.result.value.err as { InstructionError?: [number, { Custom?: number }] }
        )
        throw new Error(decodedError || `Transaction simulation failed: ${JSON.stringify(simData.result.value.err)}`)
      }

      // Calculate CU limit: actual consumed + 10% buffer
      const unitsConsumed = simData.result?.value.unitsConsumed ?? 200_000
      const cuLimit = Math.ceil(unitsConsumed * 1.1)
      logger.debug(`Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

      // Build transaction to get priority fee estimate
      const txForFeeEstimate = new Transaction()
      txForFeeEstimate.recentBlockhash = blockhash
      txForFeeEstimate.feePayer = ownerPubkey
      txForFeeEstimate.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
      txForFeeEstimate.add(...instructions)

      // Get priority fee estimate from Helius
      const serializedTx = txForFeeEstimate.serialize({ requireAllSignatures: false }).toString("base64")
      const feeResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getPriorityFeeEstimate",
          params: [{ transaction: serializedTx, options: { priorityLevel: "Medium" } }],
        }),
      })
      const feeData = (await feeResponse.json()) as { result?: number }
      const priorityFeeEstimate = feeData.result ?? 1000
      logger.debug(`Priority fee estimate: ${priorityFeeEstimate} microLamports`)

      // Build final transaction with correct CU limit and priority fee
      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = ownerPubkey
      transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
      transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFeeEstimate }))
      transaction.add(...instructions)

      // Serialize and sign via connector
      const txBytes = transaction.serialize({ requireAllSignatures: false })
      const signedBytes = await signer.signTransaction(txBytes)

      // Send via Helius Sender for faster landing
      const sendResponse = await fetch("/api/rpc/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: Buffer.from(signedBytes as Uint8Array).toString("base64") }),
      })
      const sendResult = (await sendResponse.json()) as {
        result?: string
        error?: { message: string }
      }
      logger.debug("Helius Sender response:", sendResult)

      if (sendResult.error) {
        throw new Error(sendResult.error.message || JSON.stringify(sendResult.error))
      }

      if (!sendResult.result) {
        throw new Error(`No signature returned from Helius Sender: ${JSON.stringify(sendResult)}`)
      }

      const signature = sendResult.result
      logger.debug("Transaction sent via Helius Sender:", signature)

      await confirmTransactionViaWebSocket(signature)

      removeStakeRecord(nft.mint)

      toast.success(`Unstaked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Unstake failed:", err)
      if (err && typeof err === "object") {
        console.error("Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
        if ("logs" in err) console.error("Transaction logs:", (err as { logs: string[] }).logs)
      }
      toast.error(err instanceof Error ? err.message : "Failed to unstake NFT")
    } finally {
      setUnstaking(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && !!collection

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Unstake NFT</h2>
          <button
            onClick={onClose}
            disabled={unstaking}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 overflow-hidden rounded-lg border border-border">
          <div className="aspect-square overflow-hidden">
            <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="truncate font-medium">{nft.name}</h3>
            <p className="text-sm text-muted-foreground">{nft.collectionName ?? "Dandies"}</p>
          </div>
        </div>

        {!isMinPeriodMet && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
            <div className="text-sm">
              <p className="font-medium text-yellow-500">Minimum stake period not met</p>
              <p className="text-muted-foreground">
                {formatDuration(remainingSeconds)} remaining. You can still unstake, but you may forfeit rewards.
              </p>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          {isMinPeriodMet
            ? "Are you sure you want to unstake this NFT? Your staking rewards will stop accumulating."
            : "Are you sure you want to unstake this NFT early?"}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={unstaking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUnstake} disabled={!isReady || unstaking} className="flex-1">
            {unstaking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unstaking...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unstake
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
