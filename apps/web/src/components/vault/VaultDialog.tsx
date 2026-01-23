import { useState } from "react"
import { Shield, Lock, Info } from "lucide-react"
import { useWallet } from "@solana/connector/react"
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

type FreezeType = "basic" | "secure"

interface VaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSuccess: () => void
}

export function VaultDialog({ open, onOpenChange, nfts, onSuccess }: VaultDialogProps) {
  const [freezeType, setFreezeType] = useState<FreezeType>("basic")
  const [selectedDelegate, setSelectedDelegate] = useState<string | null>(null)
  const { account } = useWallet()

  const linkedWallets: string[] = []
  const hasLinkedWallets = linkedWallets.length > 0
  const otherWallets = linkedWallets.filter((w) => w !== account)
  const canSecureFreeze = otherWallets.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-400" />
            Vault {nfts.length} NFT{nfts.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Protect your NFTs by freezing them. Frozen NFTs cannot be transferred until unlocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <span className="text-sm font-medium">Freeze Type</span>

            <button
              type="button"
              onClick={() => setFreezeType("basic")}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                freezeType === "basic"
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Lock
                  className={`h-5 w-5 mt-0.5 ${freezeType === "basic" ? "text-teal-400" : "text-muted-foreground"}`}
                />
                <div className="flex-1">
                  <div className="font-medium">Basic Freeze</div>
                  <div className="text-sm text-muted-foreground">
                    Owner wallet retains unlock authority. You can unlock anytime with your current wallet.
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => canSecureFreeze && setFreezeType("secure")}
              disabled={!canSecureFreeze}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                freezeType === "secure"
                  ? "border-teal-500 bg-teal-500/10"
                  : canSecureFreeze
                    ? "border-border hover:border-muted-foreground/50"
                    : "border-border opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-start gap-3">
                <Shield
                  className={`h-5 w-5 mt-0.5 ${freezeType === "secure" ? "text-teal-400" : "text-muted-foreground"}`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Secure Freeze</span>
                    <span className="text-xs text-amber-500">(recommended)</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Select a different linked wallet as unlock authority. More secure if your wallet is compromised.
                  </div>
                  {!hasLinkedWallets && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5" />
                      <span>Link additional wallets to enable secure freeze</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>

          {freezeType === "secure" && canSecureFreeze && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Unlock Authority Wallet</span>
              <Select value={selectedDelegate ?? ""} onValueChange={setSelectedDelegate}>
                <SelectTrigger id="delegate-wallet">
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
              <p className="text-xs text-muted-foreground">Only this wallet will be able to unlock your NFTs.</p>
            </div>
          )}

          {nfts.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-sm text-muted-foreground mb-2">
                {nfts.length} NFT{nfts.length === 1 ? "" : "s"} to vault:
              </div>
              <div className="flex flex-wrap gap-2">
                {nfts.slice(0, 5).map((nft) => (
                  <div key={nft.mint} className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs">
                    <img src={nft.image} alt={nft.name} className="h-5 w-5 rounded object-cover" />
                    <span className="truncate max-w-[100px]">{nft.name}</span>
                  </div>
                ))}
                {nfts.length > 5 && (
                  <div className="flex items-center px-2 py-1 text-xs text-muted-foreground">
                    +{nfts.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSuccess()
              onOpenChange(false)
            }}
            disabled={freezeType === "secure" && !selectedDelegate}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Shield className="mr-2 h-4 w-4" />
            Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
