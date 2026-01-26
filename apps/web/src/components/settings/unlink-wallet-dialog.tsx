import { useState } from "react"
import { useWallet, useDisconnectWallet } from "@solana/connector/react"
import { Loader2, AlertTriangle } from "lucide-react"
import { useSetAtom } from "jotai"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { unlinkWalletAtom, fetchLinkedWalletsAtom, type LinkedWallet } from "@/stores/linked-wallets"

interface UnlinkWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: LinkedWallet | null
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function UnlinkWalletDialog({ open, onOpenChange, wallet }: UnlinkWalletDialogProps) {
  const { account } = useWallet()
  const { disconnect } = useDisconnectWallet()
  const unlinkWallet = useSetAtom(unlinkWalletAtom)
  const fetchLinkedWallets = useSetAtom(fetchLinkedWalletsAtom)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const handleUnlink = async () => {
    if (!wallet) return

    const isConnectedWallet = wallet.publicKey === account

    setIsUnlinking(true)

    try {
      const unlinkPromise = unlinkWallet(wallet.publicKey)

      toast.promise(unlinkPromise, {
        loading: "Unlinking wallet...",
        success: "Wallet unlinked successfully!",
        error: (err) => err.message || "Failed to unlink wallet",
      })

      await unlinkPromise

      if (isConnectedWallet) {
        await disconnect()
      } else {
        await fetchLinkedWallets()
      }

      onOpenChange(false)
    } catch (err) {
      console.error("Unlink error:", err)
    } finally {
      setIsUnlinking(false)
    }
  }

  if (!wallet) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Unlink Wallet
          </DialogTitle>
          <DialogDescription>Are you sure you want to unlink this wallet from your account?</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <p className="font-mono text-sm text-center">{shortenAddress(wallet.publicKey)}</p>
            {wallet.nickname && <p className="text-xs text-muted-foreground text-center mt-1">{wallet.nickname}</p>}
          </div>

          <div className="mt-4 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Warning:</strong> If you have NFTs vaulted with this wallet as
              delegate, you will need this wallet to unvault them.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUnlinking}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleUnlink} disabled={isUnlinking}>
            {isUnlinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unlinking...
              </>
            ) : (
              "Unlink Wallet"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
