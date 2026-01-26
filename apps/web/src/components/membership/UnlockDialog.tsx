import { useState, useEffect, useRef, useCallback } from "react"
import { Unlock, Loader2 } from "lucide-react"
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
import { stakerAtom, collectionsAtom, emissionsAtom, type StakeRecordAccount } from "@/stores/stake"
import {
  buildUnstakeInstructions,
  buildUnstakeNiftyInstructions,
  isNiftyAsset,
  DANDIES_NIFTY_COLLECTION_ADDRESS,
  fetchStakeRecord,
} from "@/hooks/use-staking"
import { setNftStakedAtom, type NFT } from "@/stores/nfts"
import { createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"

interface UnlockDialogProps {
  nft: NFT
  onClose: () => void
}

export function UnlockDialog({ nft, onClose }: UnlockDialogProps) {
  const [unlocking, setUnlocking] = useState(false)
  const [stakeRecord, setStakeRecord] = useState<StakeRecordAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const emissions = useAtomValue(emissionsAtom)
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

  useEffect(() => {
    async function loadStakeRecord() {
      setLoading(true)
      const record = await fetchStakeRecord(nft.mint)
      setStakeRecord(record)
      setLoading(false)
    }
    loadStakeRecord()
  }, [nft.mint])

  const handleUnlock = async () => {
    if (!account || !signer || !ready || !staker || !collection || !stakeRecord) {
      toast.error("Wallet not connected or membership not available")
      return
    }

    setUnlocking(true)

    try {
      const ownerAddress = account as Address

      const requiredSigners: RequiredSigner[] = [{ address: ownerAddress, label: "Owner" }]

      const noopSigners = new Map<string, TransactionSigner>()
      noopSigners.set(ownerAddress, createNoopSigner(ownerAddress))

      const instructions = isNiftyAsset(nft)
        ? await buildUnstakeNiftyInstructions({
            nft,
            stakeRecord,
            staker,
            collection,
            emissions,
            owner: ownerAddress,
          })
        : await buildUnstakeInstructions({
            nft,
            stakeRecord,
            staker,
            collection,
            emissions,
            owner: ownerAddress,
          })

      await signWithMultipleWallets({
        instructions,
        requiredSigners,
        noopSigners,
        getConnectedSigner,
        onPhantomAccountChange: handlePhantomAccountChange,
      })

      setNftStaked({ mint: nft.mint, staked: false })

      toast.success(`Unlocked ${nft.name} successfully!`)
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

  const isReady = !!account && !!signer && ready && !!staker && !!collection && !!stakeRecord

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Unlock Dandy
          </DialogTitle>
          <DialogDescription>Unlock your Dandy to transfer or sell it.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
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
          <Button variant="outline" onClick={onClose} disabled={unlocking}>
            Cancel
          </Button>
          <Button onClick={handleUnlock} disabled={!isReady || unlocking || loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : unlocking ? (
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
