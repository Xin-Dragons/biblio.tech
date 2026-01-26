import { useState } from "react"
import { useAtomValue } from "jotai"
import { Shield, Plus, Lock, Info } from "lucide-react"
import { vaultedNftsAtom, unvaultedNftsAtom } from "@/stores/vault"
import { isConnectedAtom } from "@/stores/wallet"
import { isLoadingAtom, userNftsFetchedAtom } from "@/stores/nfts"
import { NftGrid } from "@/components/nft-grid"
import { NftGridSkeleton } from "@/components/ui/skeleton"
import { VaultDialog } from "@/components/vault/VaultDialog"
import { NftPickerDialog } from "@/components/vault/NftPickerDialog"
import { LayoutControls } from "@/components/layout-controls"

export function VaultPage() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false)
  const [selectedNfts, setSelectedNfts] = useState<typeof vaultedNfts>([])

  const isConnected = useAtomValue(isConnectedAtom)
  const vaultedNfts = useAtomValue(vaultedNftsAtom)
  const unvaultedNfts = useAtomValue(unvaultedNftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const hasFetched = useAtomValue(userNftsFetchedAtom)

  const showLoading = isLoading || !hasFetched

  const handleSelectNfts = (nfts: typeof vaultedNfts) => {
    setSelectedNfts(nfts)
    setPickerOpen(false)
    setVaultDialogOpen(true)
  }

  const handleVaultSuccess = () => {
    setSelectedNfts([])
  }

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-xl font-bold">Vault</h1>
        </div>
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/50">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Vault</h1>
          {vaultedNfts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{vaultedNfts.length}</span> protected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LayoutControls nfts={vaultedNfts} supportsCollage={false} />
          <button
            onClick={() => setPickerOpen(true)}
            className="group relative flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/15 hover:ring-primary/40 hover:shadow-lg hover:shadow-primary/10"
          >
            <Shield className="h-4 w-4" />
            Add to Vault
            <Plus className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>

      <div className="mb-4 shrink-0 rounded-xl border border-primary/10 bg-primary/5 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              <strong>Vault</strong> protects your NFTs by freezing them on-chain. Frozen NFTs cannot be transferred,
              listed, or stolen until you unlock them.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                Basic Freeze — You can unlock anytime
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Secure Freeze — Requires a different wallet to unlock
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {showLoading ? (
          <NftGridSkeleton count={12} />
        ) : vaultedNfts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/50">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-pulse-glow rounded-full" />
              <Shield className="relative h-16 w-16 text-primary/40" />
            </div>
            <p className="text-lg font-medium">No Protected NFTs</p>
            <p className="mb-6 text-sm text-muted-foreground">Add NFTs to your vault to keep them safe</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="group relative flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              <Shield className="h-4 w-4" />
              Add to Vault
              <Plus className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:rotate-90" />
            </button>
          </div>
        ) : (
          <NftGrid nfts={vaultedNfts} disableModal />
        )}
      </div>

      <NftPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        nfts={unvaultedNfts}
        onSelect={handleSelectNfts}
        title="Select NFTs to Vault"
        description="Choose which NFTs you want to protect"
        confirmLabel="Continue"
      />

      <VaultDialog
        open={vaultDialogOpen}
        onOpenChange={setVaultDialogOpen}
        nfts={selectedNfts}
        onSuccess={handleVaultSuccess}
      />
    </div>
  )
}
