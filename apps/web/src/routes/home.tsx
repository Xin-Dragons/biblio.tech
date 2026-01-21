import { useWallet } from "@solana/wallet-adapter-react"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Folder } from "lucide-react"
import { nftsAtom, filteredCollectionsAtom, isLoadingAtom, fetchNftsAtom } from "@/stores/nfts"
import { CollectionGrid } from "@/components/collection-grid"
import { CollectionGridSkeleton } from "@/components/ui/skeleton"

export function HomePage() {
  const { connected, publicKey } = useWallet()
  const nfts = useAtomValue(nftsAtom)
  const collections = useAtomValue(filteredCollectionsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const fetchNfts = useSetAtom(fetchNftsAtom)

  useEffect(() => {
    if (connected && publicKey) {
      fetchNfts(publicKey.toBase58())
    }
  }, [connected, publicKey, fetchNfts])

  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Folder className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Welcome to Biblio</h1>
          <p className="mt-2 text-muted-foreground">Connect your wallet to view your NFT collection</p>
        </div>
      </div>
    )
  }

  if (isLoading && nfts.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-xl font-bold">Collections</h1>
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
        <h1 className="text-xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          {nfts.length} NFTs in {collections.length} collections
        </p>
      </div>
      <div className="min-h-0 flex-1">
        {collections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Folder className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No collections found</p>
            <p className="text-sm text-muted-foreground">Your NFT collections will appear here</p>
          </div>
        ) : (
          <CollectionGrid collections={collections} />
        )}
      </div>
    </div>
  )
}
