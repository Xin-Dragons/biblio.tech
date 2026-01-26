import { useAtomValue } from "jotai"
import { filteredNftsAtom, collectionsAtom } from "@/stores/nfts"
import { layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { LayoutControls } from "@/components/layout-controls"

export function NftsPage() {
  const nfts = useAtomValue(filteredNftsAtom)
  const collections = useAtomValue(collectionsAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">All NFTs</h1>
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{nfts.length}</span> NFTs in{" "}
            <span className="font-medium text-foreground">{collections.length}</span> collections
          </span>
        </div>
        <LayoutControls nfts={nfts} supportsCollage />
      </div>
      <div className="min-h-0 flex-1">
        {layoutType === "collage" ? <CollageNftGrid nfts={nfts} context="nfts" /> : <NftGrid nfts={nfts} />}
      </div>
    </div>
  )
}
