import { useAtomValue } from "jotai"
import { Star } from "lucide-react"
import { nftsAtom } from "@/stores/nfts"
import { starredAtom } from "@/stores/user"
import { sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"

export function StarredPage() {
  const allNfts = useAtomValue(nftsAtom)
  const starred = useAtomValue(starredAtom)
  const sortOption = useAtomValue(sortOptionAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  const starredNfts = allNfts.filter((nft) => starred.has(nft.mint))

  const renderGrid = () => {
    if (sortOption === "custom") {
      return <SortableNftGrid nfts={starredNfts} />
    }
    if (layoutType === "collage") {
      return <CollageNftGrid nfts={starredNfts} />
    }
    return <NftGrid nfts={starredNfts} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Starred</h1>
        <p className="text-sm text-muted-foreground">{starredNfts.length} starred NFTs</p>
      </div>
      <div className="min-h-0 flex-1">
        {starredNfts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Star className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No starred NFTs</p>
            <p className="text-sm text-muted-foreground">Star NFTs to add them here</p>
          </div>
        ) : (
          renderGrid()
        )}
      </div>
    </div>
  )
}
