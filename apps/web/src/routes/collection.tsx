import { useParams } from "react-router"
import { useAtomValue } from "jotai"
import { ImageIcon } from "lucide-react"
import { nftsAtom, collectionsAtom, isLoadingAtom } from "@/stores/nfts"
import { searchQueryAtom } from "@/stores/ui"
import { CollectionView } from "@/components/collection-view"

export function CollectionPage() {
  const { id } = useParams<{ id: string }>()
  const nfts = useAtomValue(nftsAtom)
  const collections = useAtomValue(collectionsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const searchQuery = useAtomValue(searchQueryAtom).toLowerCase()

  const collection = collections.find((c) => c.id === id)
  let collectionNfts = nfts.filter((nft) => nft.collectionId === id)

  if (searchQuery) {
    collectionNfts = collectionNfts.filter(
      (nft) => nft.name.toLowerCase().includes(searchQuery) || nft.mint.toLowerCase().includes(searchQuery)
    )
  }

  return (
    <CollectionView
      nfts={collectionNfts}
      title={collection?.name ?? "Collection"}
      emptyIcon={ImageIcon}
      emptyTitle="No NFTs found"
      emptyDescription="This collection appears to be empty"
      isLoading={isLoading}
      backTo="/"
      context={id ? `collection-${id}` : undefined}
    />
  )
}
