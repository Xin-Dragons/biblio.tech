import { memo } from "react"
import { useAtomValue } from "jotai"
import { Lock, LockKeyhole, Loader2 } from "lucide-react"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Button } from "@/components/ui/button"
import { NiftyBadge } from "@/components/nifty-badge"
import { DandyCardSkeleton } from "@/components/membership/DandyCardSkeleton"
import { gapBySize, infoHeightBySize, getColumnCount } from "@/components/membership/grid-utils"
import { isLoadingAtom } from "@/stores/stake"
import { nftsAtom, isLoadingAtom as nftsLoadingAtom, type NFT } from "@/stores/nfts"
import { layoutSizeAtom, searchQueryAtom } from "@/stores/ui"
import { DANDIES_NIFTY_COLLECTION_ADDRESS, isNiftyAsset } from "@/hooks/use-staking"

const DANDIES_COLLECTION_ID = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"

interface AvailableDandyCardProps {
  nft: NFT
  onLock: (nft: NFT) => void
  isLocking: boolean
}

const AvailableDandyCard = memo(function AvailableDandyCard({ nft, onLock, isLocking }: AvailableDandyCardProps) {
  const isNifty = isNiftyAsset(nft)

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
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
        <p className="text-xs text-muted-foreground">{nft.collectionName ?? "Dandies"}</p>
        <Button
          variant="default"
          size="sm"
          className="mt-2 w-full text-[clamp(0.65rem,1.5vw,0.875rem)]"
          onClick={() => onLock(nft)}
          disabled={isLocking}
        >
          {isLocking ? (
            <Loader2 className="mr-1 h-[1em] w-[1em] animate-spin" />
          ) : (
            <Lock className="mr-1 h-[1em] w-[1em]" />
          )}
          {isLocking ? "Locking..." : "Lock"}
        </Button>
      </div>
    </div>
  )
})

type CellData = {
  nfts: NFT[]
  columnCount: number
  onLock: (nft: NFT) => void
  lockingMint: string | null
  gap: number
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { nfts, columnCount, onLock, lockingMint, gap } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  const padding = gap / 2

  return (
    <div style={{ ...style, padding }}>
      <AvailableDandyCard nft={nft} onLock={onLock} isLocking={lockingMint === nft.mint} />
    </div>
  )
}

interface AvailableToLockGridProps {
  onLock: (nft: NFT) => void
  lockingMint: string | null
  onLockAll: (nfts: NFT[]) => void
}

export function AvailableToLockGrid({ onLock, lockingMint, onLockAll }: AvailableToLockGridProps) {
  const nfts = useAtomValue(nftsAtom)
  const isStakeLoading = useAtomValue(isLoadingAtom)
  const isNftsLoading = useAtomValue(nftsLoadingAtom)
  const layoutSize = useAtomValue(layoutSizeAtom)
  const searchQuery = useAtomValue(searchQueryAtom).toLowerCase()

  const isLoading = isStakeLoading || isNftsLoading

  const availableDandies = nfts.filter((nft) => {
    const isDandies =
      nft.collectionId === DANDIES_COLLECTION_ID || nft.collectionId === DANDIES_NIFTY_COLLECTION_ADDRESS
    const isLocked = nft.staked
    const matchesSearch =
      !searchQuery || nft.name.toLowerCase().includes(searchQuery) || nft.mint.toLowerCase().includes(searchQuery)

    return isDandies && !isLocked && matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Available to Lock</h2>
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

  if (availableDandies.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="shrink-0 border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-lg font-semibold">Available to Lock</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No Dandies available to lock</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <h2 className="text-lg font-semibold">Available to Lock ({availableDandies.length})</h2>
        <Button variant="outline" size="sm" onClick={() => onLockAll(availableDandies)}>
          <LockKeyhole className="mr-2 h-4 w-4" />
          Lock All
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
                itemData={{
                  nfts: availableDandies,
                  columnCount,
                  onLock,
                  lockingMint,
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
