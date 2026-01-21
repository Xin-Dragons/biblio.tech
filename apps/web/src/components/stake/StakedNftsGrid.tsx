import { useAtomValue } from "jotai"
import { LockOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { userStakeRecordsAtom, isLoadingAtom, type StakeRecordAccount } from "@/stores/stake"
import { nftsAtom, type NFT } from "@/stores/nfts"

interface StakedNftCardProps {
  nft: NFT
  stakeRecord: StakeRecordAccount
  onUnstake: (nft: NFT, stakeRecord: StakeRecordAccount) => void
}

function StakedNftCard({ nft, stakeRecord, onUnstake }: StakedNftCardProps) {
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
        <p className="text-xs text-muted-foreground">Staked {formatTimeAgo(stakeRecord.stakedAt)}</p>
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => onUnstake(nft, stakeRecord)}>
          <LockOpen className="mr-2 h-4 w-4" />
          Unstake
        </Button>
      </div>
    </div>
  )
}

function StakedNftCardSkeleton() {
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

interface StakedNftsGridProps {
  onUnstake: (nft: NFT, stakeRecord: StakeRecordAccount) => void
}

export function StakedNftsGrid({ onUnstake }: StakedNftsGridProps) {
  const stakeRecords = useAtomValue(userStakeRecordsAtom)
  const nfts = useAtomValue(nftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  const nftsByMint = new Map(nfts.map((nft) => [nft.mint, nft]))

  const stakedNftsWithRecords = stakeRecords
    .map((record) => ({
      nft: nftsByMint.get(record.nft),
      record,
    }))
    .filter((item): item is { nft: NFT; record: StakeRecordAccount } => item.nft !== undefined)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Staked NFTs</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StakedNftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (stakedNftsWithRecords.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Staked NFTs</h2>
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No NFTs staked yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Staked NFTs ({stakedNftsWithRecords.length})</h2>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {stakedNftsWithRecords.map(({ nft, record }) => (
          <StakedNftCard key={record.address} nft={nft} stakeRecord={record} onUnstake={onUnstake} />
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(stakedAt: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const seconds = now - stakedAt

  if (seconds < 60n) {
    return "just now"
  }

  const minutes = seconds / 60n
  if (minutes < 60n) {
    return `${minutes}m ago`
  }

  const hours = minutes / 60n
  if (hours < 24n) {
    return `${hours}h ago`
  }

  const days = hours / 24n
  if (days < 30n) {
    return `${days}d ago`
  }

  const months = days / 30n
  return `${months}mo ago`
}
