import { memo } from "react"
import { useAtomValue } from "jotai"
import { LockOpen, Unlock } from "lucide-react"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { userStakeRecordsAtom, isLoadingAtom, type StakeRecordAccount } from "@/stores/stake"
import { nftsAtom, type NFT } from "@/stores/nfts"
import { layoutSizeAtom, type LayoutSize } from "@/stores/ui"
import { isNiftyAsset } from "@/hooks/use-staking"

interface StakedNftCardProps {
  nft: NFT
  stakeRecord: StakeRecordAccount
  onUnstake: (nft: NFT, stakeRecord: StakeRecordAccount) => void
}

const StakedNftCard = memo(function StakedNftCard({ nft, stakeRecord, onUnstake }: StakedNftCardProps) {
  const isNifty = isNiftyAsset(nft)

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={nft.image}
          alt={nft.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        {isNifty && (
          <div className="absolute bottom-2 left-2 rounded-lg bg-violet-500/90 px-2 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
            Nifty
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium">{nft.name}</h3>
        <p className="text-xs text-muted-foreground">Staked {formatTimeAgo(stakeRecord.stakedAt)}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full text-[clamp(0.65rem,1.5vw,0.875rem)]"
          onClick={() => onUnstake(nft, stakeRecord)}
        >
          <LockOpen className="mr-1 h-[1em] w-[1em]" />
          Unstake
        </Button>
      </div>
    </div>
  )
})

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

type StakedNftWithRecord = {
  nft: NFT
  record: StakeRecordAccount
}

type CellData = {
  items: StakedNftWithRecord[]
  columnCount: number
  onUnstake: (nft: NFT, stakeRecord: StakeRecordAccount) => void
  gap: number
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { items, columnCount, onUnstake, gap } = data
  const index = rowIndex * columnCount + columnIndex
  const item = items[index]

  if (!item) return null

  const padding = gap / 2

  return (
    <div style={{ ...style, padding }}>
      <StakedNftCard nft={item.nft} stakeRecord={item.record} onUnstake={onUnstake} />
    </div>
  )
}

const columnCountBySize: Record<LayoutSize, Record<string, number>> = {
  large: { xl: 3, lg: 2, md: 2, sm: 2, xs: 1 },
  medium: { xl: 4, lg: 3, md: 3, sm: 3, xs: 2 },
  small: { xl: 5, lg: 4, md: 4, sm: 3, xs: 2 },
}

const gapBySize: Record<LayoutSize, number> = {
  large: 16,
  medium: 8,
  small: 4,
}

const infoHeightBySize: Record<LayoutSize, number> = {
  large: 100,
  medium: 102,
  small: 104,
}

function getColumnCount(width: number, layoutSize: LayoutSize): number {
  const sizes = columnCountBySize[layoutSize]
  if (width >= 550) return sizes.xl
  if (width >= 500) return sizes.lg
  if (width >= 480) return sizes.md
  if (width >= 460) return sizes.sm
  return sizes.xs
}

interface StakedNftsGridProps {
  onUnstake: (nft: NFT, stakeRecord: StakeRecordAccount) => void
  onUnstakeAll: (items: { nft: NFT; stakeRecord: StakeRecordAccount }[]) => void
}

export function StakedNftsGrid({ onUnstake, onUnstakeAll }: StakedNftsGridProps) {
  const stakeRecords = useAtomValue(userStakeRecordsAtom)
  const nfts = useAtomValue(nftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const layoutSize = useAtomValue(layoutSizeAtom)

  const nftsByMint = new Map(nfts.map((nft) => [nft.mint, nft]))

  const stakedNftsWithRecords = stakeRecords
    .map((record) => ({
      nft: nftsByMint.get(record.nftMint),
      record,
    }))
    .filter((item): item is StakedNftWithRecord => item.nft !== undefined)

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Your Staked NFTs</h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StakedNftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (stakedNftsWithRecords.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Your Staked NFTs</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No NFTs staked yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-lg font-semibold">Your Staked NFTs ({stakedNftsWithRecords.length})</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onUnstakeAll(stakedNftsWithRecords.map((item) => ({ nft: item.nft, stakeRecord: item.record })))
          }
        >
          <Unlock className="mr-2 h-4 w-4" />
          Unstake All
        </Button>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <AutoSizer>
          {({ width, height }) => {
            const columnCount = getColumnCount(width, layoutSize)
            const gap = gapBySize[layoutSize]
            const infoHeight = infoHeightBySize[layoutSize]
            const columnWidth = width / columnCount
            const cardWidth = columnWidth - gap
            const rowHeight = cardWidth + infoHeight + gap
            const rowCount = Math.ceil(stakedNftsWithRecords.length / columnCount)

            return (
              <FixedSizeGrid<CellData>
                width={width}
                height={height}
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
                itemData={{ items: stakedNftsWithRecords, columnCount, onUnstake, gap }}
              >
                {Cell}
              </FixedSizeGrid>
            )
          }}
        </AutoSizer>
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
