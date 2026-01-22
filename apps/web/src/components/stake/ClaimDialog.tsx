import { useState } from "react"
import { Gift, X, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { Transaction, PublicKey } from "@solana/web3.js"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  stakerAtom,
  collectionsAtom,
  emissionsAtom,
  userStakeRecordsAtom,
  pendingRewardsAtom,
  clearPendingRewardsAtom,
} from "@/stores/stake"
import { buildClaimInstructions } from "@/hooks/use-staking"
import { confirmMultipleTransactionsViaWebSocket } from "@/lib/transaction"

const ANCHOR_ERROR_CODES: Record<number, string> = {
  3000: "AccountDiscriminatorAlreadySet",
  3001: "AccountDiscriminatorNotFound",
  3002: "AccountDiscriminatorMismatch",
  3003: "AccountDidNotDeserialize",
  3004: "AccountDidNotSerialize",
  3005: "AccountNotEnoughKeys",
  3006: "AccountNotMutable",
  3007: "AccountOwnedByWrongProgram",
  3008: "InvalidProgramId",
  3009: "InvalidProgramExecutable",
  3010: "AccountNotSigner",
  3011: "AccountNotSystemOwned",
  3012: "AccountNotInitialized - A required account does not exist",
  3013: "AccountNotProgramData",
  3014: "AccountNotAssociatedTokenAccount",
  3015: "AccountSysvarMismatch",
}

function decodeSimulationError(err: { InstructionError?: [number, { Custom?: number }] }): string | null {
  if (!err.InstructionError) return null
  const [ixIndex, errDetail] = err.InstructionError
  if (typeof errDetail === "object" && errDetail.Custom !== undefined) {
    const code = errDetail.Custom
    const anchorMsg = ANCHOR_ERROR_CODES[code]
    if (anchorMsg) {
      return `Instruction ${ixIndex} failed: ${anchorMsg} (code ${code})`
    }
    return `Instruction ${ixIndex} failed with custom error: ${code}`
  }
  return `Instruction ${ixIndex} failed: ${JSON.stringify(errDetail)}`
}

interface ClaimDialogProps {
  onClose: () => void
  onSuccess: () => void
}

const TOKEN_DECIMALS = 9

function formatRewardAmount(amount: bigint): string {
  if (amount === 0n) {
    return "0"
  }
  const humanReadable = Number(amount) / 10 ** TOKEN_DECIMALS
  if (humanReadable >= 1_000_000) {
    return `${(humanReadable / 1_000_000).toFixed(2)}M`
  }
  if (humanReadable >= 1_000) {
    return `${(humanReadable / 1_000).toFixed(2)}K`
  }
  return humanReadable.toFixed(2)
}

export function ClaimDialog({ onClose, onSuccess }: ClaimDialogProps) {
  const [claiming, setClaiming] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const stakeRecords = useAtomValue(userStakeRecordsAtom)
  const pendingRewards = useAtomValue(pendingRewardsAtom)
  const clearPendingRewards = useSetAtom(clearPendingRewardsAtom)

  const totalPending = pendingRewards.reduce((sum, p) => sum + p.amount, 0n)

  const handleClaim = async () => {
    if (!account || !signer || !capabilities.canSign || !staker || collections.length === 0) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    if (stakeRecords.length === 0) {
      toast.error("No staked NFTs to claim rewards for")
      return
    }

    setClaiming(true)

    try {
      const ownerPubkey = new PublicKey(account)
      const instructions = []

      for (const stakeRecord of stakeRecords) {
        for (const emissionAddress of stakeRecord.emissions) {
          const emission = emissions.find((e) => e.address === emissionAddress)
          if (!emission) continue

          const collection = collections.find((c) => c.address === emission.collection)
          if (!collection) continue

          const claimIxs = buildClaimInstructions({
            stakeRecord,
            emission,
            staker,
            collection,
            owner: account,
          })
          instructions.push(...claimIxs)
        }
      }

      if (instructions.length === 0) {
        toast.error("No rewards to claim")
        setClaiming(false)
        return
      }

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

      // Batch instructions - ~5 claims per tx to stay within size limits
      const BATCH_SIZE = 5
      const transactions: Transaction[] = []
      for (let i = 0; i < instructions.length; i += BATCH_SIZE) {
        const batch = instructions.slice(i, i + BATCH_SIZE)
        const transaction = new Transaction()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = ownerPubkey
        transaction.add(...batch)
        transactions.push(transaction)
      }

      // Simulate all transactions before signing
      for (let i = 0; i < transactions.length; i++) {
        const simResponse = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: "simulateTransaction",
            params: [
              transactions[i].serialize({ requireAllSignatures: false }).toString("base64"),
              { encoding: "base64" },
            ],
          }),
        })
        const simData = (await simResponse.json()) as {
          result?: { value: { err: unknown; logs: string[] } }
        }

        if (simData.result?.value.err) {
          console.error(`Claim simulation failed for tx ${i + 1}:`, simData.result.value.err)
          console.error("Simulation logs:", simData.result.value.logs)
          const decodedError = decodeSimulationError(
            simData.result.value.err as { InstructionError?: [number, { Custom?: number }] }
          )
          throw new Error(
            decodedError || `Transaction ${i + 1} simulation failed: ${JSON.stringify(simData.result.value.err)}`
          )
        }
      }

      // Sign and send each transaction
      const signatures: string[] = []
      for (const tx of transactions) {
        const txBytes = tx.serialize({ requireAllSignatures: false })
        const signedBytes = await signer.signTransaction(txBytes)

        const sendResponse = await fetch("/api/rpc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: crypto.randomUUID(),
            method: "sendTransaction",
            params: [
              Buffer.from(signedBytes as Uint8Array).toString("base64"),
              { encoding: "base64", skipPreflight: true },
            ],
          }),
        })
        const sendResult = (await sendResponse.json()) as { result?: string; error?: { message: string } }

        if (sendResult.error) {
          throw new Error(sendResult.error.message || JSON.stringify(sendResult.error))
        }

        if (sendResult.result) {
          signatures.push(sendResult.result)
        }
      }

      await confirmMultipleTransactionsViaWebSocket(signatures)

      clearPendingRewards()

      toast.success(`Claimed rewards in ${transactions.length} transactions!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Claim failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to claim rewards")
    } finally {
      setClaiming(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && collections.length > 0
  const hasRewards = totalPending > 0n

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Claim Rewards</h2>
          <button
            onClick={onClose}
            disabled={claiming}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-col items-center rounded-lg border border-border p-6">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Pending Rewards</p>
          <p className="text-3xl font-bold">{formatRewardAmount(totalPending)}</p>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {hasRewards
            ? "Claim your accumulated staking rewards. This will claim rewards from all your staked NFTs."
            : "You don't have any pending rewards to claim."}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={claiming} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleClaim} disabled={!isReady || !hasRewards || claiming} className="flex-1">
            {claiming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Claim
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
