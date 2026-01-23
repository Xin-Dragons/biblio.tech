import { useState } from "react"
import { Shield, AlertTriangle, ArrowRightLeft, Loader2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { NFT } from "@/stores/nfts"
import { removeVaultedMintsAtom } from "@/stores/vault"
import { buildRecoverInstructions } from "@/lib/vault-transactions"
import { prepareAndSendTransaction } from "@/lib/transaction"

interface RecoverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSuccess: () => void
}

export function RecoverDialog({ open, onOpenChange, nfts, onSuccess }: RecoverDialogProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const removeVaultedMints = useSetAtom(removeVaultedMintsAtom)

  const connectedAddress = account as Address | undefined

  const linkedWallets: string[] = []
  const hasLinkedWallets = linkedWallets.length > 0
  const otherWallets = linkedWallets.filter((w) => w !== account)

  const nftsWithAuthority = nfts.map((nft) => ({
    nft,
    delegate: nft.delegate as Address | null,
    hasAuthority: connectedAddress ? nft.delegate === connectedAddress : false,
  }))

  const nftsWithoutAuthority = nftsWithAuthority.filter((item) => !item.hasAuthority)
  const hasUnauthorizedNfts = nftsWithoutAuthority.length > 0
  const allUnauthorized = nftsWithoutAuthority.length === nfts.length

  const handleRecover = async () => {
    if (!account || !signer || !capabilities.canSign) {
      toast.error("Wallet not connected")
      return
    }

    if (nfts.length === 0) {
      toast.error("No NFTs selected")
      return
    }

    if (!selectedDestination) {
      toast.error("Please select a destination wallet")
      return
    }

    const nftsToRecover = nftsWithAuthority.filter((item) => item.hasAuthority).map((item) => item.nft)

    if (nftsToRecover.length === 0) {
      toast.error("No NFTs with unlock authority")
      return
    }

    setIsRecovering(true)

    try {
      const ownerAddress = account as Address
      const destinationAddress = selectedDestination as Address

      const allInstructions = await Promise.all(
        nftsToRecover.map((nft) =>
          buildRecoverInstructions({
            nft,
            owner: ownerAddress,
            delegate: nft.delegate as Address,
            destination: destinationAddress,
            payer: signer as unknown as TransactionSigner,
          })
        )
      )

      const flatInstructions = allInstructions.flat()

      await prepareAndSendTransaction({
        instructions: flatInstructions,
        feePayer: signer as unknown as TransactionSigner,
      })

      removeVaultedMints(nftsToRecover.map((nft) => nft.mint))

      toast.success(`Recovered ${nftsToRecover.length} NFT${nftsToRecover.length === 1 ? "" : "s"}`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Recover failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to recover NFTs")
    } finally {
      setIsRecovering(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && nfts.length > 0 && hasLinkedWallets
  const isRecoverDisabled = !isReady || isRecovering || allUnauthorized || !selectedDestination

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-500" />
            Recover {nfts.length} NFT{nfts.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>Emergency recovery to transfer vaulted NFTs to a safe wallet.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-amber-500">Warning</div>
                <div className="text-xs text-muted-foreground">
                  This will unlock AND transfer your NFTs in one transaction. Use this for emergency recovery only.
                </div>
              </div>
            </div>
          </div>

          {hasUnauthorizedNfts && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-amber-500">Authority Required</div>
                  <div className="text-xs text-muted-foreground">
                    {allUnauthorized
                      ? "Your connected wallet does not have unlock authority for any of these NFTs."
                      : `${nftsWithoutAuthority.length} of ${nfts.length} NFT${nfts.length === 1 ? "" : "s"} cannot be recovered because your wallet does not have unlock authority.`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasLinkedWallets ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm font-medium mb-1">No Linked Wallets</div>
              <div className="text-xs text-muted-foreground">
                Link additional wallets to enable emergency recovery. You can transfer NFTs to any of your linked
                wallets.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-sm font-medium">Destination Wallet</span>
              <Select value={selectedDestination ?? ""} onValueChange={setSelectedDestination}>
                <SelectTrigger id="destination-wallet">
                  <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {otherWallets.map((wallet) => (
                    <SelectItem key={wallet} value={wallet}>
                      {wallet.slice(0, 4)}...{wallet.slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">NFTs will be unlocked and transferred to this wallet.</p>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-sm font-medium">NFTs to Recover</span>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRecovering}>
            Cancel
          </Button>
          <Button
            onClick={handleRecover}
            disabled={isRecoverDisabled}
            variant="destructive"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isRecovering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recovering...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Recover
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
