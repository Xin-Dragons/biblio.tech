import { useState, useEffect } from "react"
import { Wallet, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useWalletLinking } from "@/hooks/use-wallet-linking"

interface LinkWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkWalletDialog({ open, onOpenChange }: LinkWalletDialogProps) {
  const [isLedger, setIsLedger] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const {
    isWatching,
    detectedWallet,
    connectedWalletName,
    otherWallets,
    startWatching,
    cancelWatching,
    connectOtherWallet,
    confirmLink,
  } = useWalletLinking()

  useEffect(() => {
    if (open && !isWatching && !detectedWallet) {
      startWatching()
    }
  }, [open, isWatching, detectedWallet, startWatching])

  const handleClose = () => {
    cancelWatching()
    setIsLedger(false)
    setIsLinking(false)
    onOpenChange(false)
  }

  const handleConfirm = async () => {
    setIsLinking(true)
    const success = await confirmLink(isLedger)
    setIsLinking(false)
    if (success) {
      setIsLedger(false)
      onOpenChange(false)
    }
  }

  const walletName = connectedWalletName || "your wallet"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Link New Wallet
          </DialogTitle>
          <DialogDescription>
            {detectedWallet
              ? "New wallet detected. Confirm and sign a message to link it to your account."
              : `Switch to a different account in ${walletName}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {detectedWallet ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Detected from {detectedWallet.providerName}</p>
                    <p className="font-mono text-sm font-medium">{detectedWallet.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ledger" className="cursor-pointer">
                    Ledger Wallet
                  </Label>
                  <p className="text-xs text-muted-foreground">Enable if this is a Ledger hardware wallet</p>
                </div>
                <Switch id="ledger" checked={isLedger} onCheckedChange={setIsLedger} disabled={isLinking} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-4">
                <div className="relative mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Wallet className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">Waiting for wallet change...</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">Switch accounts in {walletName}</p>
              </div>

              {otherWallets.length > 0 && (
                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-center text-xs text-muted-foreground">Or link from another wallet</p>
                  <div className="flex justify-center gap-2">
                    {otherWallets.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => connectOtherWallet(wallet)}
                        className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background transition-colors hover:border-primary/30 hover:bg-accent/50"
                        title={wallet.name}
                      >
                        <img src={wallet.icon} alt={wallet.name} className="h-6 w-6" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {detectedWallet && (
            <Button onClick={handleConfirm} disabled={isLinking}>
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Wallet"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
