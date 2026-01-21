import { useState } from "react"
import { Lock, X, Loader2 } from "lucide-react"
import { Transaction } from "@solana/web3.js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAtomValue } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stakerAtom, collectionsAtom } from "@/stores/stake"
import { buildStakeCoreInstructions } from "@/hooks/use-staking"
import type { NFT } from "@/stores/nfts"

interface StakeDialogProps {
  nft: NFT
  onClose: () => void
  onSuccess: () => void
}

export function StakeDialog({ nft, onClose, onSuccess }: StakeDialogProps) {
  const [staking, setStaking] = useState(false)
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)

  const collection = collections.find((c) => c.collectionMint === nft.collectionId)

  const handleStake = async () => {
    if (!publicKey || !signTransaction || !staker || !collection) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    setStaking(true)

    try {
      const instructions = buildStakeCoreInstructions({
        nft,
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

      toast.success(`Staked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Stake failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to stake NFT")
    } finally {
      setStaking(false)
    }
  }

  const isReady = !!publicKey && !!signTransaction && !!staker && !!collection

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stake NFT</h2>
          <button
            onClick={onClose}
            disabled={staking}
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

        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to stake this NFT? You can unstake at any time.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={staking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleStake} disabled={!isReady || staking} className="flex-1">
            {staking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Stake
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
