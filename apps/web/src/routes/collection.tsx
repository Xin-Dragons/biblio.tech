import { useParams, Link } from "react-router"
import { useAtomValue } from "jotai"
import { ArrowLeft, Grid3X3, ImageIcon } from "lucide-react"
import { nftsAtom, collectionsAtom, isLoadingAtom } from "@/stores/nfts"
import { searchQueryAtom, sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { NftGridSkeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function CollectionPage() {
  const { id } = useParams<{ id: string }>()
  const nfts = useAtomValue(nftsAtom)
  const collections = useAtomValue(collectionsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const searchQuery = useAtomValue(searchQueryAtom).toLowerCase()
  const sortOption = useAtomValue(sortOptionAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  const collection = collections.find((c) => c.id === id)
  let collectionNfts = nfts.filter((nft) => nft.collectionId === id)

  if (searchQuery) {
    collectionNfts = collectionNfts.filter(
      (nft) => nft.name.toLowerCase().includes(searchQuery) || nft.mint.toLowerCase().includes(searchQuery)
    )
  }

  const renderGrid = () => {
    if (isLoading && collectionNfts.length === 0) {
      return <NftGridSkeleton count={12} />
    }
    if (sortOption === "custom") {
      return <SortableNftGrid nfts={collectionNfts} />
    }
    if (layoutType === "collage") {
      return <CollageNftGrid nfts={collectionNfts} />
    }
    return <NftGrid nfts={collectionNfts} />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Collection Header */}
      <div className="relative mb-6 shrink-0">
        {/* Background blur from collection image */}
        {collection?.image && (
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
            <img src={collection.image} alt="" className="h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
          </div>
        )}

        <div className="flex items-center gap-5 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
          {/* Back button */}
          <Link
            to="/"
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              "border border-border/50 bg-background/50",
              "transition-all duration-200",
              "hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Collection Image */}
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
            {collection?.image ? (
              <img src={collection.image} alt={collection.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <ImageIcon className="h-6 w-6 text-primary/40" />
              </div>
            )}
          </div>

          {/* Collection Info */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight">
              {collection?.name ?? "Collection"}
            </h1>
            <div className="mt-1 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>
                  {isLoading && collectionNfts.length === 0 ? "Loading..." : `${collectionNfts.length} items`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="min-h-0 flex-1">{renderGrid()}</div>
    </div>
  )
}
