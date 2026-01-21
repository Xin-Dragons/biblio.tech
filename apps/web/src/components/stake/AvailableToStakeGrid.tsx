import { useAtomValue } from "jotai"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { stakedMintsSetAtom, isLoadingAtom } from "@/stores/stake"
import { nftsAtom, isLoadingAtom as nftsLoadingAtom, type NFT } from "@/stores/nfts"

const DANDIES_COLLECTION_ID = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"

interface AvailableNftCardProps {
  nft: NFT
  onStake: (nft: NFT) => void
}

function AvailableNftCard({ nft, onStake }: AvailableNftCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
        <img
          src={nft.image}
          alt={nft.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium">{nft.name}</h3>
        <p className="text-xs text-muted-foreground">{nft.collectionName ?? "Dandies"}</p>
        <Button variant="default" size="sm" className="mt-2 w-full" onClick={() => onStake(nft)}>
          <Lock className="mr-2 h-4 w-4" />
          Stake
        </Button>
      </div>
    </div>
  )
}

function AvailableNftCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
        <Skeleton className="mt-2 h-9 w-full" />
      </div>
    </div>
  )
}

interface AvailableToStakeGridProps {
  onStake: (nft: NFT) => void
}

export function AvailableToStakeGrid({ onStake }: AvailableToStakeGridProps) {
  const nfts = useAtomValue(nftsAtom)
  const stakedMints = useAtomValue(stakedMintsSetAtom)
  const isStakeLoading = useAtomValue(isLoadingAtom)
  const isNftsLoading = useAtomValue(nftsLoadingAtom)

  const isLoading = isStakeLoading || isNftsLoading

  const availableDandies = nfts.filter(
    (nft) => nft.collectionId === DANDIES_COLLECTION_ID && !stakedMints.has(nft.mint)
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available to Stake</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <AvailableNftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (availableDandies.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available to Stake</h2>
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No Dandies available to stake</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Available to Stake ({availableDandies.length})</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {availableDandies.map((nft) => (
          <AvailableNftCard key={nft.mint} nft={nft} onStake={onStake} />
        ))}
      </div>
    </div>
  )
}
