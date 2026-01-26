import { useState, useRef, useEffect, useCallback } from "react"
import { Lock, Loader2 } from "lucide-react"
import { useWallet, useKitTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import type { Address, TransactionSigner } from "@solana/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { stakerAtom, collectionsAtom } from "@/stores/stake"
import {
  buildStakeInstructions,
  buildStakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
} from "@/hooks/use-staking"
import { setNftStakedAtom, type NFT } from "@/stores/nfts"
import { createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"

interface LockDialogProps {
  nft: NFT
  onClose: () => void
}

export function LockDialog({ nft, onClose }: LockDialogProps) {
  const [locking, setLocking] = useState(false)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const setNftStaked = useSetAtom(setNftStakedAtom)

  useEffect(() => {
    signerRef.current = signer
  }, [signer])

  const getConnectedSigner = useCallback(() => {
    if (!signerRef.current) throw new Error("No signer available")
    return signerRef.current
  }, [])

  const handlePhantomAccountChange = useCallback(async () => {
    await disconnect()
    await connect("wallet-standard:phantom" as Parameters<typeof connect>[0])
  }, [disconnect, connect])

  const collectionMintToFind = isNiftyAsset(nft) ? DANDIES_NIFTY_COLLECTION_ADDRESS : nft.collectionId
  const collection = collections.find((c) => c.collectionMint === collectionMintToFind)

  const handleLock = async () => {
    if (!account || !signer || !ready || !staker || !collection) {
      toast.error("Wallet not connected or locking not available")
      return
    }

    setLocking(true)

    try {
      const ownerAddress = account as Address

      const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]

      const noopSigners = new Map<string, TransactionSigner>()
      noopSigners.set(ownerAddress, createNoopSigner(ownerAddress))

      const instructions = isNiftyAsset(nft)
        ? await buildStakeNiftyInstructions({
            nft,
            staker,
            collection,
            owner: ownerAddress,
          })
        : await buildStakeInstructions({
            nft,
            staker,
            collection,
            owner: ownerAddress,
          })

      await signWithMultipleWallets({
        instructions,
        requiredSigners,
        noopSigners,
        getConnectedSigner,
        onPhantomAccountChange: handlePhantomAccountChange,
      })

      setNftStaked({ mint: nft.mint, staked: true })

      toast.success(`Locked ${nft.name} successfully!`)
      onClose()
    } catch (err) {
      console.error("Lock failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to lock Dandy")
    } finally {
      setLocking(false)
    }
  }

  const isReady = !!account && !!signer && ready && !!staker && !!collection

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Lock Dandy
          </DialogTitle>
          <DialogDescription>Lock your Dandy to earn membership rewards.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="aspect-square overflow-hidden">
              <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-3">
              <h3 className="truncate font-medium">{nft.name}</h3>
              <p className="text-sm text-muted-foreground">{nft.collectionName ?? "Dandies"}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={locking}>
            Cancel
          </Button>
          <Button onClick={handleLock} disabled={!isReady || locking}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
