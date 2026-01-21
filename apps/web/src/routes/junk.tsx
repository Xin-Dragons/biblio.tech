import { useAtomValue, useSetAtom } from "jotai"
import { Trash2 } from "lucide-react"
import { nftsAtom } from "@/stores/nfts"
import { junkAtom, toggleJunkAtom } from "@/stores/user"
import { sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { Button } from "@/components/ui/button"

export function JunkPage() {
  const allNfts = useAtomValue(nftsAtom)
  const junk = useAtomValue(junkAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const sortOption = useAtomValue(sortOptionAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  const junkNfts = allNfts.filter((nft) => junk.has(nft.mint))

  const handleClearAll = () => {
    for (const nft of junkNfts) {
      toggleJunk(nft.mint)
    }
  }

  const renderGrid = () => {
    if (sortOption === "custom") {
      return <SortableNftGrid nfts={junkNfts} />
    }
    if (layoutType === "collage") {
      return <CollageNftGrid nfts={junkNfts} />
    }
    return <NftGrid nfts={junkNfts} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Junk</h1>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{junkNfts.length} junk NFTs</p>
          {junkNfts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Restore All
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {junkNfts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Trash2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No junk NFTs</p>
            <p className="text-sm text-muted-foreground">Mark spam NFTs as junk to hide them</p>
          </div>
        ) : (
          renderGrid()
        )}
      </div>
    </div>
  )
}
