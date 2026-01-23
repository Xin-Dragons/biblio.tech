import { useState } from "react"
import { Lock, X, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { PublicKey } from "@solana/web3.js"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import {
  stakerAtom,
  collectionsAtom,
  addStakeRecordAtom,
  getEmissionAddresses,
  invalidateStakeRecordsCache,
} from "@/stores/stake"
import {
  buildStakeInstructions,
  buildStakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION,
} from "@/hooks/use-staking"
import {
  getBlockhash,
  simulateTransaction,
  buildTransaction,
  sendTransaction,
  confirmTransactionViaWebSocket,
} from "@/lib/transaction"
import type { NFT } from "@/stores/nfts"

interface LockDialogProps {
  nft: NFT
  onClose: () => void
  onSuccess: () => void
}

export function LockDialog({ nft, onClose, onSuccess }: LockDialogProps) {
  const [locking, setLocking] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const addStakeRecord = useSetAtom(addStakeRecordAtom)

  // For nifty assets, use the nifty collection; for pNFTs use the NFT's collectionId
  const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION.toBase58() : nft.collectionId
  const collection = collections.find((c) => c.collectionMint === collectionMintToFind)

  const handleLock = async () => {
    if (!account || !signer || !capabilities.canSign || !staker || !collection) {
      toast.error("Wallet not connected or locking not available")
      return
    }

    setLocking(true)

    try {
      const ownerPubkey = new PublicKey(account)

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

      const blockhash = await getBlockhash()
      const { unitsConsumed } = await simulateTransaction(instructions, ownerPubkey, blockhash)
      const cuLimit = Math.ceil(unitsConsumed * 1.1)

      const transaction = buildTransaction(instructions, ownerPubkey, blockhash, cuLimit, 1000)

      const txBytes = transaction.serialize({ requireAllSignatures: false })
      const signedBytes = await signer.signTransaction(txBytes)
      const signedBase64 = Buffer.from(signedBytes as Uint8Array).toString("base64")

      const signature = await sendTransaction(signedBase64)
      await confirmTransactionViaWebSocket(signature)

      addStakeRecord({
        nftMint: nft.mint,
        owner: account,
        staker: staker.address,
        emissions: collection ? getEmissionAddresses(collection) : [],
      })

      invalidateStakeRecordsCache(account)
      toast.success(`Locked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Lock failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to lock Dandy")
    } finally {
      setLocking(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && !!collection

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lock Dandy</h2>
          <button
            onClick={onClose}
            disabled={locking}
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
          Are you sure you want to lock this Dandy? You can unlock at any time.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={locking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleLock} disabled={!isReady || locking} className="flex-1">
            {locking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Locking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Lock
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
