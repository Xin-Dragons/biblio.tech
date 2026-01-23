import { useState } from "react"
import { Unlock, X, Loader2, AlertTriangle } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { PublicKey } from "@solana/web3.js"
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
  confirmTransactionViaWebSocket,
} from "@/lib/transaction"
import { logger } from "@/lib/logger"
import type { NFT } from "@/stores/nfts"

interface UnlockDialogProps {
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

export function UnlockDialog({ nft, stakeRecord, onClose, onSuccess }: UnlockDialogProps) {
  const [unlocking, setUnlocking] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
  const removeStakeRecord = useSetAtom(removeStakeRecordAtom)

  const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION.toBase58() : nft.collectionId
  const collection = collections.find((c) => c.collectionMint === collectionMintToFind)

  const lockedAtSeconds = Number(stakeRecord.stakedAt)
  const minLockPeriodSeconds = collection?.minStakePeriod ? Number(collection.minStakePeriod) : 0
  const currentTimeSeconds = Math.floor(Date.now() / 1000)
  const timeLockedSeconds = currentTimeSeconds - lockedAtSeconds
  const remainingSeconds = minLockPeriodSeconds - timeLockedSeconds
  const isMinPeriodMet = minLockPeriodSeconds === 0 || remainingSeconds <= 0

  const handleUnlock = async () => {
    if (!account || !signer || !capabilities.canSign || !staker || !collection) {
      toast.error("Wallet not connected or membership not available")
      return
    }

    setUnlocking(true)

    try {
      const ownerPubkey = new PublicKey(account)

      logger.debug("Building unlock instruction with:", {
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
      logger.debug("Unlock instruction built:", instructions[0])

      const blockhash = await getBlockhash()
      const { unitsConsumed } = await simulateTransaction(instructions, ownerPubkey, blockhash)
      const cuLimit = Math.ceil(unitsConsumed * 1.1)
      logger.debug(`Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

      const priorityFee = await getPriorityFee(instructions, ownerPubkey, blockhash, cuLimit)
      logger.debug(`Priority fee estimate: ${priorityFee} microLamports`)

      const transaction = buildTransaction(instructions, ownerPubkey, blockhash, cuLimit, priorityFee)

      const txBytes = transaction.serialize({ requireAllSignatures: false })
      const signedBytes = await signer.signTransaction(txBytes)
      const signedBase64 = Buffer.from(signedBytes as Uint8Array).toString("base64")

      const signature = await sendTransaction(signedBase64)
      logger.debug("Transaction sent:", signature)

      await confirmTransactionViaWebSocket(signature)

      removeStakeRecord(nft.mint)

      invalidateStakeRecordsCache(account)
      toast.success(`Unlocked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Unlock failed:", err)
      if (err && typeof err === "object") {
        console.error("Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
        if ("logs" in err) console.error("Transaction logs:", (err as { logs: string[] }).logs)
      }
      toast.error(err instanceof Error ? err.message : "Failed to unlock Dandy")
    } finally {
      setUnlocking(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && !!collection

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Unlock Dandy</h2>
          <button
            onClick={onClose}
            disabled={unlocking}
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
              <p className="font-medium text-yellow-500">Minimum lock period not met</p>
              <p className="text-muted-foreground">
                {formatDuration(remainingSeconds)} remaining. You can still unlock early.
              </p>
            </div>
          </div>
        )}

        <p className="mb-4 text-sm text-muted-foreground">
          {isMinPeriodMet
            ? "Are you sure you want to unlock this Dandy?"
            : "Are you sure you want to unlock this Dandy early?"}
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={unlocking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleUnlock} disabled={!isReady || unlocking} className="flex-1">
            {unlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unlock
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
