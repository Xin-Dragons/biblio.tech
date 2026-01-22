import { useWallet } from "@solana/connector/react"
import { useAtomValue } from "jotai"
import { Folder, RefreshCw, Sparkles } from "lucide-react"
import { nftsAtom, filteredCollectionsAtom, isLoadingAtom, isRefreshingAtom } from "@/stores/nfts"
import { CollectionGrid } from "@/components/collection-grid"
import { CollectionGridSkeleton } from "@/components/ui/skeleton"

export function HomePage() {
  const { isConnected } = useWallet()
  const nfts = useAtomValue(nftsAtom)
  const collections = useAtomValue(filteredCollectionsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const isRefreshing = useAtomValue(isRefreshingAtom)

  if (!isConnected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <Sparkles className="relative h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold">Welcome to Biblio</h1>
          <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
            Connect your wallet to view and manage your NFT collection
          </p>
        </div>
      </div>
    )
  }

  if (isLoading && nfts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="font-display text-xl font-bold">Collections</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="min-h-0 flex-1">
          <CollectionGridSkeleton count={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="font-display text-xl font-bold">Collections</h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">{nfts.length}</span> NFTs in{" "}
          <span className="tabular-nums">{collections.length}</span> collections
          {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        {collections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Folder className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-medium">No collections found</p>
            <p className="mt-1 text-sm text-muted-foreground">Your NFT collections will appear here</p>
          </div>
        ) : (
          <CollectionGrid collections={collections} nfts={nfts} />
        )}
      </div>
    </div>
  )
}
