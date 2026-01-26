import { useAtomValue } from "jotai"
import { Star } from "lucide-react"
import { nftsAtom } from "@/stores/nfts"
import { starredAtom } from "@/stores/user"
import { CollectionView } from "@/components/collection-view"

export function StarredPage() {
  const allNfts = useAtomValue(nftsAtom)
  const starred = useAtomValue(starredAtom)

  const starredNfts = allNfts.filter((nft) => starred.has(nft.mint))

  return (
    <CollectionView
      nfts={starredNfts}
      title="Starred"
      emptyIcon={Star}
      emptyTitle="No starred NFTs"
      emptyDescription="Star NFTs to add them here"
      context="starred"
    />
  )
}
