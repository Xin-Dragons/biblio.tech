import { useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Shield, Grid2X2, Grid3X3, LayoutGrid, Unlock, ArrowRightLeft, CheckSquare, XSquare } from "lucide-react"
import { useWallet } from "@solana/connector/react"
import { cn } from "@/lib/utils"
import { NftGrid } from "@/components/nft-grid"
import { vaultedNftsAtom } from "@/stores/vault"
import { layoutSizeAtom, type LayoutSize } from "@/stores/ui"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectModeAtom, clearSelectionAtom } from "@/stores/selection"
import { type NFT } from "@/stores/nfts"
import { UnvaultDialog } from "@/components/vault/UnvaultDialog"
import { RecoverDialog } from "@/components/vault/RecoverDialog"

const layoutOptions: { value: LayoutSize; icon: typeof Grid2X2; label: string }[] = [
  { value: "large", icon: Grid2X2, label: "Large" },
  { value: "medium", icon: Grid3X3, label: "Medium" },
  { value: "small", icon: LayoutGrid, label: "Small" },
]

export function VaultPage() {
  const { account } = useWallet()
  const vaultedNfts = useAtomValue(vaultedNftsAtom)
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelectMode = useSetAtom(toggleSelectModeAtom)
  const clearSelection = useSetAtom(clearSelectionAtom)

  const [unvaultDialogOpen, setUnvaultDialogOpen] = useState(false)
  const [recoverDialogOpen, setRecoverDialogOpen] = useState(false)

  const selectedNfts: NFT[] = vaultedNfts.filter((nft) => selectedMints.has(nft.mint))
  const hasSelection = selectedNfts.length > 0

  const handleUnvaultSuccess = () => {
    setUnvaultDialogOpen(false)
    clearSelection()
  }

  const handleRecoverSuccess = () => {
    setRecoverDialogOpen(false)
    clearSelection()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-400" />
            <h1 className="text-xl font-bold">Vault</h1>
          </div>
          {account && vaultedNfts.length > 0 && (
            <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-medium text-teal-400">
              {vaultedNfts.length} NFT{vaultedNfts.length !== 1 ? "s" : ""} Protected
            </span>
          )}
        </div>

        {account && vaultedNfts.length > 0 && (
          <div className="flex items-center gap-2">
            {isSelectMode && hasSelection && (
              <>
                <button
                  onClick={() => setUnvaultDialogOpen(true)}
                  className="flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  <Unlock className="h-4 w-4" />
                  Unvault ({selectedNfts.length})
                </button>
                <button
                  onClick={() => setRecoverDialogOpen(true)}
                  className="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Recover ({selectedNfts.length})
                </button>
              </>
            )}

            <button
              onClick={() => toggleSelectMode()}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isSelectMode
                  ? "bg-muted text-foreground hover:bg-muted/80"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {isSelectMode ? (
                <>
                  <XSquare className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select
                </>
              )}
            </button>

            <div className="ml-2 flex overflow-hidden rounded-md border border-border">
              {layoutOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setLayoutSize(option.value)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center transition-colors",
                      layoutSize === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {!account ? (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault</p>
          </div>
        </div>
      ) : vaultedNfts.length === 0 ? (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Shield className="mb-4 h-12 w-12 text-teal-400/50" />
            <p className="text-lg font-medium">No Protected NFTs</p>
            <p className="mt-1 max-w-md text-center text-sm text-muted-foreground">
              Protect your NFTs by vaulting them. Vaulted NFTs are frozen and cannot be transferred until you unlock
              them.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <NftGrid nfts={vaultedNfts} />
        </div>
      )}

      <UnvaultDialog
        open={unvaultDialogOpen}
        onOpenChange={setUnvaultDialogOpen}
        nfts={selectedNfts}
        onSuccess={handleUnvaultSuccess}
      />

      <RecoverDialog
        open={recoverDialogOpen}
        onOpenChange={setRecoverDialogOpen}
        nfts={selectedNfts}
        onSuccess={handleRecoverSuccess}
      />
    </div>
  )
}
