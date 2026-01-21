import { useState } from "react"
import { Gift, X, Loader2 } from "lucide-react"
import { Transaction } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAtomValue } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stakerAtom, collectionsAtom, emissionsAtom, userStakeRecordsAtom, pendingRewardsAtom } from "@/stores/stake"
import { buildClaimInstructions } from "@/hooks/use-staking"

interface ClaimDialogProps {
  onClose: () => void
  onSuccess: () => void
}

function formatRewardAmount(amount: bigint): string {
  if (amount === 0n) {
    return "0"
  }
  const asNumber = Number(amount)
  if (asNumber >= 1_000_000) {
    return `${(asNumber / 1_000_000).toFixed(2)}M`
  }
  if (asNumber >= 1_000) {
    return `${(asNumber / 1_000).toFixed(2)}K`
  }
  return asNumber.toLocaleString()
}

export function ClaimDialog({ onClose, onSuccess }: ClaimDialogProps) {
  const [claiming, setClaiming] = useState(false)
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const stakeRecords = useAtomValue(userStakeRecordsAtom)
  const pendingRewards = useAtomValue(pendingRewardsAtom)

  const totalPending = pendingRewards.reduce((sum, p) => sum + p.amount, 0n)

  const handleClaim = async () => {
    if (!publicKey || !signTransaction || !staker || collections.length === 0) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    if (stakeRecords.length === 0) {
      toast.error("No staked NFTs to claim rewards for")
      return
    }

    setClaiming(true)

    try {
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
            owner: publicKey,
          })
          instructions.push(...claimIxs)
        }
      }

      if (instructions.length === 0) {
        toast.error("No rewards to claim")
        setClaiming(false)
        return
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      transaction.add(...instructions)

      const signed = await signTransaction(transaction)
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: true,
      })

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed")

      toast.success("Rewards claimed successfully!")
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Claim failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to claim rewards")
    } finally {
      setClaiming(false)
    }
  }

  const isReady = !!publicKey && !!signTransaction && !!staker && collections.length > 0
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
