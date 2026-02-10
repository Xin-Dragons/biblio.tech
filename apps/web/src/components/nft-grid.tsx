import { memo, useState, useRef, useEffect } from "react"
import { Star, Trash2, Check, Lock, Shield, ShieldPlus } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { NiftyBadge } from "@/components/nifty-badge"
import { UnvaultDialog } from "@/components/vault/UnvaultDialog"
import { VaultDialog } from "@/components/vault/VaultDialog"
import {
  starredAtom,
  toggleStarredAtom,
  junkAtom,
  toggleJunkAtom,
  tagsAtom,
  nftTagsAtom,
  type Tag,
} from "@/stores/user"
import { layoutSizeAtom, showInfoAtom, type LayoutSize } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"
import { isVaultedAtom } from "@/stores/vault"

interface TagDotsProps {
  mint: string
  tags: Tag[]
  nftTags: Record<string, string[]>
}

const MAX_VISIBLE_DOTS = 3

const TagDots = memo(function TagDots({ mint, tags, nftTags }: TagDotsProps) {
  const assignedTagIds = nftTags[mint] ?? []
  if (assignedTagIds.length === 0) return null

  const assignedTags = assignedTagIds
    .map((id) => tags.find((t) => t.id === id))
    .filter((t): t is Tag => t !== undefined)

  if (assignedTags.length === 0) return null

  const visibleTags = assignedTags.slice(0, MAX_VISIBLE_DOTS)
  const remainingCount = assignedTags.length - MAX_VISIBLE_DOTS

  const tooltipContent = assignedTags.map((t) => t.name).join(", ")

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {visibleTags.map((tag) => (
            <div
              key={tag.id}
              className="h-[6px] w-[6px] rounded-full shadow-sm"
              style={{ backgroundColor: tag.color }}
            />
          ))}
          {remainingCount > 0 && (
            <span className="ml-0.5 text-[9px] font-medium text-white drop-shadow-md">+{remainingCount}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
})

interface NftCardProps {
  nft: NFT
  showInfo: boolean
  disableModal?: boolean
}

const NftCard = memo(function NftCard({ nft, showInfo, disableModal }: NftCardProps) {
  const [unvaultDialogOpen, setUnvaultDialogOpen] = useState(false)
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false)
  const [cardWidth, setCardWidth] = useState<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isSmallCard = cardWidth !== null && cardWidth < 150
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const setSelectedNft = useSetAtom(selectedNftAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setCardWidth(width)
    })

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  const isVaulted = useAtomValue(isVaultedAtom(nft.mint))

  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const isSelected = selectedMints.has(nft.mint)
  const canVault = !nft.frozen && !nft.staked && !isVaulted

  const handleClick = () => {
    if (isSelectMode) {
      toggleSelected(nft.mint)
    } else if (disableModal && isVaulted) {
      setUnvaultDialogOpen(true)
    } else if (!disableModal) {
      setSelectedNft(nft)
    }
  }

  return (
    <div
      ref={cardRef}
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
        <div className="relative flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium">{nft.name}</h3>
            {nft.listing?.price && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                {(Number(nft.listing.price) / 1e9).toFixed(2)} SOL
              </p>
            )}
          </div>
          {!isSelectMode && (
            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleStarred(nft.mint)
                }}
                className={cn(
                  "rounded-md p-1 transition-colors",
                  isStarred ? "text-amber-500" : "text-muted-foreground hover:text-amber-500"
                )}
              >
                <Star className={cn("h-3.5 w-3.5", isStarred && "fill-current")} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleJunk(nft.mint)
                }}
                className={cn(
                  "rounded-md p-1 transition-colors",
                  isJunk ? "text-destructive" : "text-muted-foreground hover:text-destructive"
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
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

      {/* Image Overlay Buttons - shown when no info bar or for vault */}
      {!isSelectMode && (
        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-0 transition-all duration-300 group-hover:opacity-100">
          {!showInfo && (
            <>
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
            </>
          )}
          {canVault && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setVaultDialogOpen(true)
              }}
              className="rounded-lg p-1.5 backdrop-blur-sm transition-all duration-200 bg-black/50 text-white/80 hover:bg-primary/80 hover:text-white"
            >
              <ShieldPlus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Status Badge - top left, shows one status at a time */}
      {isVaulted ? (
        <>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setUnvaultDialogOpen(true)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute z-10 flex items-center rounded-lg bg-amber-500/90 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-amber-400/90",
              isSmallCard ? "left-2 top-2 px-1.5 py-1 text-xs" : "left-2.5 top-2.5 gap-1.5 px-2 py-1 text-xs"
            )}
          >
            <Shield className="h-3 w-3" />
            {!isSmallCard && <span>VAULT</span>}
          </button>
          <UnvaultDialog
            open={unvaultDialogOpen}
            onOpenChange={setUnvaultDialogOpen}
            nfts={[nft]}
            onSuccess={() => {}}
          />
        </>
      ) : nft.staked ? (
        <div
          className={cn(
            "absolute z-10 flex items-center rounded-lg bg-primary/90 font-semibold text-primary-foreground backdrop-blur-sm",
            isSmallCard ? "left-2 top-2 px-1.5 py-1 text-xs" : "left-2.5 top-2.5 gap-1.5 px-2 py-1 text-xs"
          )}
        >
          <Lock className="h-3 w-3" />
          {!isSmallCard && <span>LOCKED</span>}
        </div>
      ) : null}

      {/* Vault Dialog */}
      <VaultDialog open={vaultDialogOpen} onOpenChange={setVaultDialogOpen} nfts={[nft]} onSuccess={() => {}} />

      {/* Listed Badge */}
      {nft.listing?.price && !showInfo && (
        <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {(Number(nft.listing.price) / 1e9).toFixed(2)} SOL
        </div>
      )}

      {/* Nifty Badge */}
      {nft.tokenStandard === "Nifty" && <NiftyBadge />}

      {/* Tag Dots */}
      {!isSelectMode && <TagDots mint={nft.mint} tags={tags} nftTags={nftTags} />}
    </div>
  )
})

type CellData = {
  nfts: NFT[]
  columnCount: number
  showInfo: boolean
  disableModal?: boolean
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { nfts, columnCount, showInfo, disableModal } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  return (
    <div style={style} className="p-1.5">
      <NftCard nft={nft} showInfo={showInfo} disableModal={disableModal} />
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
  disableModal?: boolean
}

export function NftGrid({ nfts, disableModal }: NftGridProps) {
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
              itemData={{ nfts, columnCount, showInfo, disableModal }}
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
