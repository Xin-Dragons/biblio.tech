import { useState } from "react"
import { Unlock, X, Loader2, AlertTriangle } from "lucide-react"
import { Transaction } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAtomValue } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stakerAtom, collectionsAtom, type StakeRecordAccount } from "@/stores/stake"
import { buildUnstakeCoreInstructions } from "@/hooks/use-staking"
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
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)

  const collection = collections.find((c) => c.collectionMint === nft.collectionId)

  const stakedAtSeconds = Number(stakeRecord.stakedAt)
  const minStakePeriodSeconds = collection ? Number(collection.minStakePeriod) : 0
  const currentTimeSeconds = Math.floor(Date.now() / 1000)
  const timeStakedSeconds = currentTimeSeconds - stakedAtSeconds
  const remainingSeconds = minStakePeriodSeconds - timeStakedSeconds
  const isMinPeriodMet = remainingSeconds <= 0

  const handleUnstake = async () => {
    if (!publicKey || !signTransaction || !staker || !collection) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    setUnstaking(true)

    try {
      const instructions = buildUnstakeCoreInstructions({
        nft,
        stakeRecord,
        staker,
        collection,
        owner: publicKey,
      })

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

      toast.success(`Unstaked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Unstake failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to unstake NFT")
    } finally {
      setUnstaking(false)
    }
  }

  const isReady = !!publicKey && !!signTransaction && !!staker && !!collection

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
