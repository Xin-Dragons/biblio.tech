import { useState } from "react"
import { Shield, Lock, Info, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { useSetAtom, useAtomValue } from "jotai"
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
import { addVaultedMintsAtom } from "@/stores/vault"
import { linkedWalletsAtom } from "@/stores/linked-wallets"
import { buildLockInstructions } from "@/lib/vault-transactions"
import { prepareAndSendTransaction } from "@/lib/transaction"

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
  const [isVaulting, setIsVaulting] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const addVaultedMints = useSetAtom(addVaultedMintsAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)

  const linkedWalletAddresses = linkedWallets.map((w) => w.publicKey)
  const hasLinkedWallets = linkedWallets.length > 0
  const otherWallets = linkedWalletAddresses.filter((w) => w !== account)
  const canSecureFreeze = otherWallets.length > 0

  const handleVault = async () => {
    if (!account || !signer || !capabilities.canSign) {
      toast.error("Wallet not connected")
      return
    }

    if (nfts.length === 0) {
      toast.error("No NFTs selected")
      return
    }

    setIsVaulting(true)

    try {
      const ownerAddress = account as Address
      const delegateAddress = freezeType === "secure" && selectedDelegate ? (selectedDelegate as Address) : ownerAddress

      const allInstructions = await Promise.all(
        nfts.map((nft) =>
          buildLockInstructions({
            nft,
            owner: ownerAddress,
            delegate: delegateAddress,
            payer: signer as unknown as TransactionSigner,
          })
        )
      )

      const flatInstructions = allInstructions.flat()

      await prepareAndSendTransaction({
        instructions: flatInstructions,
        feePayer: signer as unknown as TransactionSigner,
      })

      addVaultedMints(nfts.map((nft) => nft.mint))

      toast.success(`Vaulted ${nfts.length} NFT${nfts.length === 1 ? "" : "s"}`)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Vault failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to vault NFTs")
    } finally {
      setIsVaulting(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && nfts.length > 0
  const isVaultDisabled = !isReady || isVaulting || (freezeType === "secure" && !selectedDelegate)

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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVaulting}>
            Cancel
          </Button>
          <Button onClick={handleVault} disabled={isVaultDisabled} className="bg-teal-600 hover:bg-teal-700">
            {isVaulting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vaulting...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Vault
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
