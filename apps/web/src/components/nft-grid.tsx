import { useMemo, memo } from "react"
import { Star, Trash2, Check, Lock } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { selectAtom } from "jotai/utils"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { cn } from "@/lib/utils"
import { NiftyBadge } from "@/components/nifty-badge"
import { starredAtom, toggleStarredAtom, junkAtom, toggleJunkAtom } from "@/stores/user"
import { layoutSizeAtom, showInfoAtom, type LayoutSize } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"
import { stakedMintsSetAtom } from "@/stores/stake"

interface NftCardProps {
  nft: NFT
  showInfo: boolean
}

const NftCard = memo(function NftCard({ nft, showInfo }: NftCardProps) {
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const setSelectedNft = useSetAtom(selectedNftAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)

  const isStakedAtom = useMemo(() => selectAtom(stakedMintsSetAtom, (mints) => mints.has(nft.mint)), [nft.mint])
  const isStaked = useAtomValue(isStakedAtom)

  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const isSelected = selectedMints.has(nft.mint)

  const handleClick = () => {
    if (isSelectMode) {
      toggleSelected(nft.mint)
    } else {
      setSelectedNft(nft)
    }
  }

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-glow" : "border-border/50 hover:border-primary/30"
      )}
      onClick={handleClick}
    >
      {/* Image Container */}
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={nft.image}
          alt={nft.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Info Section */}
      {showInfo && (
        <div className="relative p-3">
          <h3 className="truncate text-sm font-medium">{nft.name}</h3>
          {nft.listing?.price && (
            <p className="mt-0.5 text-xs font-medium text-primary">
              {(Number(nft.listing.price) / 1e9).toFixed(2)} SOL
            </p>
          )}
        </div>
      )}

      {/* Selection Checkbox */}
      {isSelectMode && (
        <div
          className={cn(
            "absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200",
            isSelected
              ? "border-primary bg-primary scale-100"
              : "border-white/60 bg-black/40 backdrop-blur-sm scale-90 group-hover:scale-100"
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
        </div>
      )}

      {/* Action Buttons */}
      {!isSelectMode && (
        <div className="absolute right-2.5 top-2.5 flex gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleJunk(nft.mint)
            }}
            className={cn(
              "rounded-lg p-1.5 backdrop-blur-sm transition-all duration-200",
              isJunk
                ? "bg-destructive/90 text-white"
                : "bg-black/50 text-white/80 hover:bg-destructive/80 hover:text-white"
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleStarred(nft.mint)
            }}
            className={cn(
              "rounded-lg p-1.5 backdrop-blur-sm transition-all duration-200",
              isStarred
                ? "bg-amber-500/90 text-white"
                : "bg-black/50 text-white/80 hover:bg-amber-500/80 hover:text-white"
            )}
          >
            <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
          </button>
        </div>
      )}

      {/* Staked Badge */}
      {isStaked && (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-primary/90 px-2 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm shadow-sm">
          <Lock className="h-3 w-3" />
          Staked
        </div>
      )}

      {/* Listed Badge */}
      {nft.listing?.price && !showInfo && (
        <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {(Number(nft.listing.price) / 1e9).toFixed(2)} SOL
        </div>
      )}

      {/* Nifty Badge */}
      {nft.tokenStandard === "Nifty" && <NiftyBadge />}
    </div>
  )
})

type CellData = {
  nfts: NFT[]
  columnCount: number
  showInfo: boolean
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { nfts, columnCount, showInfo } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  return (
    <div style={style} className="p-1.5">
      <NftCard nft={nft} showInfo={showInfo} />
    </div>
  )
}

const columnCountBySize: Record<LayoutSize, Record<string, number>> = {
  large: { xl: 4, lg: 3, md: 3, sm: 2, xs: 2 },
  medium: { xl: 6, lg: 5, md: 4, sm: 3, xs: 2 },
  small: { xl: 10, lg: 8, md: 6, sm: 4, xs: 3 },
}

function getColumnCount(width: number, layoutSize: LayoutSize): number {
  const sizes = columnCountBySize[layoutSize]
  if (width >= 1280) return sizes.xl
  if (width >= 1024) return sizes.lg
  if (width >= 768) return sizes.md
  if (width >= 640) return sizes.sm
  return sizes.xs
}

interface NftGridProps {
  nfts: NFT[]
}

export function NftGrid({ nfts }: NftGridProps) {
  const layoutSize = useAtomValue(layoutSizeAtom)
  const showInfo = useAtomValue(showInfoAtom)

  if (nfts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">🖼️</span>
        </div>
        <p className="text-muted-foreground font-medium">No NFTs found</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Your NFTs will appear here</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getColumnCount(width, layoutSize)
          const columnWidth = width / columnCount
          const rowHeight = showInfo ? columnWidth * 1.25 : columnWidth
          const rowCount = Math.ceil(nfts.length / columnCount)

          return (
            <FixedSizeGrid<CellData>
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              itemData={{ nfts, columnCount, showInfo }}
              className="scrollbar-hide"
            >
              {Cell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}
