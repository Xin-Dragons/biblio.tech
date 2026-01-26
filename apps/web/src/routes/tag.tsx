import { useParams, Navigate } from "react-router"
import { useAtomValue } from "jotai"
import { Tag as TagIcon } from "lucide-react"
import { nftsAtom } from "@/stores/nfts"
import { tagsAtom, nftTagsAtom } from "@/stores/user"
import { CollectionView } from "@/components/collection-view"

export function TagPage() {
  const { id } = useParams<{ id: string }>()
  const allNfts = useAtomValue(nftsAtom)
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)

  const tag = tags.find((t) => t.id === id)

  if (!tag) {
    return <Navigate to="/nfts" replace />
  }

  const taggedNfts = allNfts.filter((nft) => {
    const mintTags = nftTags[nft.mint] ?? []
    return mintTags.includes(tag.id)
  })

  const titleWithDot = (
    <span className="flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </span>
  )

  return (
    <CollectionView
      nfts={taggedNfts}
      title={titleWithDot}
      emptyIcon={TagIcon}
      emptyTitle="No NFTs in this tag"
      emptyDescription="Add NFTs to this tag using the toolbar or NFT detail modal"
      backTo="/nfts"
      context={`tag-${id}`}
    />
  )
}
