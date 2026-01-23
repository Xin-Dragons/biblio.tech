import { useState } from "react"
import { Shield, Unlock, AlertTriangle, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { useSetAtom } from "jotai"
import toast from "react-hot-toast"
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
import type { NFT } from "@/stores/nfts"
import { removeVaultedMintsAtom } from "@/stores/vault"
import { buildUnlockInstructions } from "@/lib/vault-transactions"
import { prepareAndSendTransaction } from "@/lib/transaction"

interface UnvaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSuccess: () => void
}

export function UnvaultDialog({ open, onOpenChange, nfts, onSuccess }: UnvaultDialogProps) {
  const [isUnvaulting, setIsUnvaulting] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const removeVaultedMints = useSetAtom(removeVaultedMintsAtom)

  const connectedAddress = account as Address | undefined

  const nftsWithAuthority = nfts.map((nft) => ({
    nft,
    delegate: nft.delegate as Address | null,
    hasAuthority: connectedAddress ? nft.delegate === connectedAddress : false,
  }))

  const nftsWithoutAuthority = nftsWithAuthority.filter((item) => !item.hasAuthority)
  const hasUnauthorizedNfts = nftsWithoutAuthority.length > 0
  const allUnauthorized = nftsWithoutAuthority.length === nfts.length

  const handleUnvault = async () => {
    if (!account || !signer || !capabilities.canSign) {
      toast.error("Wallet not connected")
      return
    }

    if (nfts.length === 0) {
      toast.error("No NFTs selected")
      return
    }

    const nftsToUnvault = nftsWithAuthority.filter((item) => item.hasAuthority).map((item) => item.nft)

    if (nftsToUnvault.length === 0) {
      toast.error("No NFTs with unlock authority")
      return
    }

    setIsUnvaulting(true)

    try {
      const ownerAddress = account as Address

      const allInstructions = await Promise.all(
        nftsToUnvault.map((nft) =>
          buildUnlockInstructions({
            nft,
            owner: ownerAddress,
            delegate: nft.delegate as Address,
            payer: signer as unknown as TransactionSigner,
          })
        )
      )

      const flatInstructions = allInstructions.flat()

      await prepareAndSendTransaction({
        instructions: flatInstructions,
        feePayer: signer as unknown as TransactionSigner,
      })

      removeVaultedMints(nftsToUnvault.map((nft) => nft.mint))

      toast.success(`Unvaulted ${nftsToUnvault.length} NFT${nftsToUnvault.length === 1 ? "" : "s"}`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Unvault failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to unvault NFTs")
    } finally {
      setIsUnvaulting(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && nfts.length > 0
  const isUnvaultDisabled = !isReady || isUnvaulting || allUnauthorized

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-teal-400" />
            Unvault {nfts.length} NFT{nfts.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Remove protection from your NFTs. Unvaulted NFTs can be transferred freely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasUnauthorizedNfts && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-amber-500">Authority Required</div>
                  <div className="text-xs text-muted-foreground">
                    {allUnauthorized
                      ? "Your connected wallet does not have unlock authority for any of these NFTs."
                      : `${nftsWithoutAuthority.length} of ${nfts.length} NFT${nfts.length === 1 ? "" : "s"} cannot be unvaulted because your wallet does not have unlock authority.`}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-sm font-medium">NFTs to Unvault</span>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {nftsWithAuthority.map(({ nft, delegate, hasAuthority }) => (
                <div
                  key={nft.mint}
                  className={`flex items-center gap-3 p-2 rounded ${
                    hasAuthority ? "bg-background" : "bg-background/50 opacity-60"
                  }`}
                >
                  <img src={nft.image} alt={nft.name} className="h-10 w-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{nft.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {delegate ? (
                        <>
                          Authority: {delegate.slice(0, 4)}...{delegate.slice(-4)}
                          {hasAuthority && <span className="text-teal-400 ml-1">(you)</span>}
                        </>
                      ) : (
                        <span className="text-amber-500">No delegate set</span>
                      )}
                    </div>
                  </div>
                  {hasAuthority ? (
                    <Shield className="h-4 w-4 text-teal-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUnvaulting}>
            Cancel
          </Button>
          <Button onClick={handleUnvault} disabled={isUnvaultDisabled} className="bg-teal-600 hover:bg-teal-700">
            {isUnvaulting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unvaulting...
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unvault
                {!allUnauthorized && nftsWithoutAuthority.length > 0
                  ? ` (${nfts.length - nftsWithoutAuthority.length})`
                  : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
