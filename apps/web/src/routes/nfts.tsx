import { useAtomValue } from "jotai"
import { filteredNftsAtom, collectionsAtom } from "@/stores/nfts"
import { sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"

export function NftsPage() {
  const nfts = useAtomValue(filteredNftsAtom)
  const collections = useAtomValue(collectionsAtom)
  const sortOption = useAtomValue(sortOptionAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  const renderGrid = () => {
    if (sortOption === "custom") {
      return <SortableNftGrid nfts={nfts} />
    }
    if (layoutType === "collage") {
      return <CollageNftGrid nfts={nfts} />
    }
    return <NftGrid nfts={nfts} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">All NFTs</h1>
        <p className="text-sm text-muted-foreground">
          {nfts.length} NFTs in {collections.length} collections
        </p>
      </div>
      <div className="min-h-0 flex-1">{renderGrid()}</div>
    </div>
  )
}
