import { useAtomValue, useSetAtom } from "jotai"
import { Trash2 } from "lucide-react"
import { nftsAtom } from "@/stores/nfts"
import { junkAtom, toggleJunkAtom } from "@/stores/user"
import { CollectionView } from "@/components/collection-view"
import { Button } from "@/components/ui/button"

export function JunkPage() {
  const allNfts = useAtomValue(nftsAtom)
  const junk = useAtomValue(junkAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)

  const junkNfts = allNfts.filter((nft) => junk.has(nft.mint))

  const handleClearAll = () => {
    for (const nft of junkNfts) {
      toggleJunk(nft.mint)
    }
  }

  return (
    <CollectionView
      nfts={junkNfts}
      title="Junk"
      emptyIcon={Trash2}
      emptyTitle="No junk NFTs"
      emptyDescription="Mark spam NFTs as junk to hide them"
      headerRight={
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{junkNfts.length} junk NFTs</p>
          {junkNfts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Restore All
            </Button>
          )}
        </div>
      }
    />
  )
}
