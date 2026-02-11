import { memo } from "react"
import { useAtomValue } from "jotai"
import { LockOpen, Unlock } from "lucide-react"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Button } from "@/components/ui/button"
import { NiftyBadge } from "@/components/nifty-badge"
import { DandyCardSkeleton } from "@/components/membership/DandyCardSkeleton"
import { gapBySize, infoHeightBySize, getColumnCount } from "@/components/membership/grid-utils"
import { isLoadingAtom } from "@/stores/stake"
import { nftsAtom, isLoadingAtom as nftsLoadingAtom, type NFT } from "@/stores/nfts"
import { layoutSizeAtom, searchQueryAtom } from "@/stores/ui"
import { isNiftyAsset, DANDIES_NIFTY_COLLECTION_ADDRESS } from "@/hooks/use-staking"

const DANDIES_COLLECTION_ID = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"

interface LockedDandyCardProps {
  nft: NFT
  onUnlock: (nft: NFT) => void
}

const LockedDandyCard = memo(function LockedDandyCard({ nft, onUnlock }: LockedDandyCardProps) {
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
        {isNifty && <NiftyBadge />}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-medium">{nft.name}</h3>
        <p className="text-xs text-muted-foreground">Locked</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full text-[clamp(0.65rem,1.5vw,0.875rem)]"
          onClick={() => onUnlock(nft)}
        >
          <LockOpen className="mr-1 h-[1em] w-[1em]" />
          Unlock
        </Button>
      </div>
    </div>
  )
})

type CellData = {
  items: NFT[]
  columnCount: number
  onUnlock: (nft: NFT) => void
  gap: number
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { items, columnCount, onUnlock, gap } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = items[index]

  if (!nft) return null

  const padding = gap / 2

  return (
    <div style={{ ...style, padding }}>
      <LockedDandyCard nft={nft} onUnlock={onUnlock} />
    </div>
  )
}

interface LockedDandiesGridProps {
  onUnlock: (nft: NFT) => void
  onUnlockAll: (nfts: NFT[]) => void
}

export function LockedDandiesGrid({ onUnlock, onUnlockAll }: LockedDandiesGridProps) {
  const nfts = useAtomValue(nftsAtom)
  const isStakeLoading = useAtomValue(isLoadingAtom)
  const isNftsLoading = useAtomValue(nftsLoadingAtom)
  const isLoading = isStakeLoading || isNftsLoading
  const layoutSize = useAtomValue(layoutSizeAtom)
  const searchQuery = useAtomValue(searchQueryAtom).toLowerCase()

  const lockedDandies = nfts.filter((nft) => {
    const isDandies =
      nft.collectionId === DANDIES_COLLECTION_ID || nft.collectionId === DANDIES_NIFTY_COLLECTION_ADDRESS
    const isLocked = nft.staked
    const matchesSearch =
      !searchQuery || nft.name.toLowerCase().includes(searchQuery) || nft.mint.toLowerCase().includes(searchQuery)

    return isDandies && isLocked && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Your Locked Dandies</h2>
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
              const rowCount = Math.max(1, Math.ceil(height / rowHeight))
              const totalSkeletons = columnCount * rowCount

              return (
                <div
                  style={{
                    width,
                    height,
                    overflow: "hidden",
                    display: "grid",
                    gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                    gap: `${gap}px`,
                    padding: `${gap / 2}px`,
                  }}
                >
                  {Array.from({ length: totalSkeletons }).map((_, i) => (
                    <DandyCardSkeleton key={i} />
                  ))}
                </div>
              )
            }}
          </AutoSizer>
        </div>
      </div>
    )
  }

  if (lockedDandies.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Your Locked Dandies</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No Dandies locked yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-lg font-semibold">Your Locked Dandies ({lockedDandies.length})</h2>
        <Button variant="outline" size="sm" onClick={() => onUnlockAll(lockedDandies)}>
          <Unlock className="mr-2 h-4 w-4" />
          Unlock All
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
            const rowCount = Math.ceil(lockedDandies.length / columnCount)

            return (
              <FixedSizeGrid<CellData>
                width={width}
                height={height}
                columnCount={columnCount}
                columnWidth={columnWidth}
                rowCount={rowCount}
                rowHeight={rowHeight}
                itemData={{
                  items: lockedDandies,
                  columnCount,
                  onUnlock,
                  gap,
                }}
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
