import { useParams, Link } from "react-router"
import { useAtomValue } from "jotai"
import { ArrowLeft } from "lucide-react"
import { nftsAtom, collectionsAtom, isLoadingAtom } from "@/stores/nfts"
import { searchQueryAtom, sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { NftGridSkeleton } from "@/components/ui/skeleton"

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
      <div className="mb-4 flex shrink-0 items-center gap-4">
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{collection?.name ?? "Collection"}</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading && collectionNfts.length === 0 ? "Loading..." : `${collectionNfts.length} items`}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">{renderGrid()}</div>
    </div>
  )
}
