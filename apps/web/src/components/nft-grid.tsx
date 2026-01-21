import { Star, Trash2, Check, Lock } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { cn } from "@/lib/utils"
import { starredAtom, toggleStarredAtom, junkAtom, toggleJunkAtom } from "@/stores/user"
import { layoutSizeAtom, showInfoAtom, type LayoutSize } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"
import { stakedMintsSetAtom } from "@/stores/stake"

interface NftCardProps {
  nft: NFT
  showInfo: boolean
}

function NftCard({ nft, showInfo }: NftCardProps) {
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const stakedMints = useAtomValue(stakedMintsSetAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const setSelectedNft = useSetAtom(selectedNftAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)
  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const isSelected = selectedMints.has(nft.mint)
  const isStaked = stakedMints.has(nft.mint)

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
        "group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-all hover:border-primary/50 hover:shadow-lg",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border"
      )}
      onClick={handleClick}
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={nft.image}
          alt={nft.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      {showInfo && (
        <div className="p-2">
          <h3 className="truncate text-sm font-medium">{nft.name}</h3>
          {nft.listing?.price && (
            <p className="text-xs text-muted-foreground">{(Number(nft.listing.price) / 1e9).toFixed(2)} SOL</p>
          )}
        </div>
      )}
      {isSelectMode && (
        <div
          className={cn(
            "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border",
            isSelected ? "border-primary bg-primary" : "border-white/50 bg-black/50"
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
      {!isSelectMode && (
        <div className="absolute right-2 top-2 flex gap-1">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleJunk(nft.mint)
            }}
            className={cn(
              "rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100",
              isJunk && "opacity-100"
            )}
          >
            <Trash2 className={cn("h-4 w-4", isJunk ? "text-red-400" : "text-white")} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleStarred(nft.mint)
            }}
            className={cn(
              "rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100",
              isStarred && "opacity-100"
            )}
          >
            <Star className={cn("h-4 w-4", isStarred ? "fill-yellow-400 text-yellow-400" : "text-white")} />
          </button>
        </div>
      )}
      {isStaked && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
          <Lock className="h-3 w-3" />
          Staked
        </div>
      )}
    </div>
  )
}

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
    <div style={style} className="p-1">
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
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getColumnCount(width, layoutSize)
          const columnWidth = width / columnCount
          const rowHeight = showInfo ? columnWidth * 1.2 : columnWidth
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
            >
              {Cell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}
