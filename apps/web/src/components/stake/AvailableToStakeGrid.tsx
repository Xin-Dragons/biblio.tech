import { memo } from "react"
import { useAtomValue } from "jotai"
import { Lock, LockKeyhole } from "lucide-react"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { stakedMintsSetAtom, isLoadingAtom } from "@/stores/stake"
import { nftsAtom, isLoadingAtom as nftsLoadingAtom, type NFT } from "@/stores/nfts"
import { layoutSizeAtom, type LayoutSize } from "@/stores/ui"

const DANDIES_COLLECTION_ID = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"

interface AvailableNftCardProps {
  nft: NFT
  onStake: (nft: NFT) => void
}

const AvailableNftCard = memo(function AvailableNftCard({ nft, onStake }: AvailableNftCardProps) {
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
        <Button
          variant="default"
          size="sm"
          className="mt-2 w-full text-[clamp(0.65rem,1.5vw,0.875rem)]"
          onClick={() => onStake(nft)}
        >
          <Lock className="mr-1 h-[1em] w-[1em]" />
          Stake
        </Button>
      </div>
    </div>
  )
})

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

type CellData = {
  nfts: NFT[]
  columnCount: number
  onStake: (nft: NFT) => void
  gap: number
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { nfts, columnCount, onStake, gap } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  const padding = gap / 2

  return (
    <div style={{ ...style, padding }}>
      <AvailableNftCard nft={nft} onStake={onStake} />
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

interface AvailableToStakeGridProps {
  onStake: (nft: NFT) => void
  onStakeAll: (nfts: NFT[]) => void
}

export function AvailableToStakeGrid({ onStake, onStakeAll }: AvailableToStakeGridProps) {
  const nfts = useAtomValue(nftsAtom)
  const stakedMints = useAtomValue(stakedMintsSetAtom)
  const isStakeLoading = useAtomValue(isLoadingAtom)
  const isNftsLoading = useAtomValue(nftsLoadingAtom)
  const layoutSize = useAtomValue(layoutSizeAtom)

  const isLoading = isStakeLoading || isNftsLoading

  const availableDandies = nfts.filter(
    (nft) => nft.collectionId === DANDIES_COLLECTION_ID && !stakedMints.has(nft.mint)
  )

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Available to Stake</h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <AvailableNftCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (availableDandies.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Available to Stake</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No Dandies available to stake</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-lg font-semibold">Available to Stake ({availableDandies.length})</h2>
        <Button variant="outline" size="sm" onClick={() => onStakeAll(availableDandies)}>
          <LockKeyhole className="mr-2 h-4 w-4" />
          Stake All
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
            const rowCount = Math.ceil(availableDandies.length / columnCount)

            return (
              <FixedSizeGrid<CellData>
                width={width}
                height={height}
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
                itemData={{ nfts: availableDandies, columnCount, onStake, gap }}
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
