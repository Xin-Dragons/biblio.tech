import { useAtomValue } from "jotai"
import { Shield } from "lucide-react"
import { vaultedNftsAtom } from "@/stores/vault"
import { isConnectedAtom } from "@/stores/wallet"
import { CollectionView } from "@/components/collection-view"

export function VaultPage() {
  const isConnected = useAtomValue(isConnectedAtom)
  const vaultedNfts = useAtomValue(vaultedNftsAtom)

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-xl font-bold">Vault</h1>
        </div>
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CollectionView
      nfts={vaultedNfts}
      title="Vault"
      emptyIcon={Shield}
      emptyTitle="No Protected NFTs"
      emptyDescription="Protect your NFTs by vaulting them. Vaulted NFTs are frozen and cannot be transferred until you unlock them."
      headerRight={
        vaultedNfts.length > 0 ? (
          <p className="text-sm text-muted-foreground">{vaultedNfts.length} protected NFTs</p>
        ) : undefined
      }
    />
  )
}
