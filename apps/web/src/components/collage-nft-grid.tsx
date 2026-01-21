import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Star, Trash2, Check, Plus, Minus } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { GridLayout, verticalCompactor, type LayoutItem, type Layout } from "react-grid-layout"
import { cn } from "@/lib/utils"
import {
  starredAtom,
  toggleStarredAtom,
  junkAtom,
  toggleJunkAtom,
  collageLayoutAtom,
  saveCollageLayoutAtom,
  fetchCollageLayoutAtom,
  type CollageLayoutItem,
} from "@/stores/user"
import { isAuthenticatedAtom } from "@/stores/auth"
import { showInfoAtom } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"
import "react-grid-layout/css/styles.css"

interface CollageCardProps {
  nft: NFT
  showInfo: boolean
  w: number
  h: number
  onSizeChange: (w: number, h: number) => void
  isAuthenticated: boolean
  isDraggingRef: React.RefObject<boolean>
}

function CollageCard({ nft, showInfo, w, h, onSizeChange, isAuthenticated, isDraggingRef }: CollageCardProps) {
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const setSelectedNft = useSetAtom(selectedNftAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)
  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const isSelected = selectedMints.has(nft.mint)

  const handleClick = () => {
    if (isDraggingRef.current) return
    if (isSelectMode) {
      toggleSelected(nft.mint)
    } else {
      setSelectedNft(nft)
    }
  }

  const handleIncreaseSize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (w < 3) {
      onSizeChange(w + 1, h + 1)
    }
  }

  const handleDecreaseSize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (w > 1) {
      onSizeChange(w - 1, h - 1)
    }
  }

  const isSmallest = w <= 1
  const isLargest = w >= 3

  return (
    <div
      className={cn(
        "group relative h-full w-full overflow-hidden rounded-lg border bg-card",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border"
      )}
      onClick={handleClick}
    >
      <div className="h-full w-full overflow-hidden">
        <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" loading="lazy" draggable={false} />
      </div>
      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <h3 className="truncate text-sm font-medium text-white">{nft.name}</h3>
          {nft.listing?.price && (
            <p className="text-xs text-white/70">{(Number(nft.listing.price) / 1e9).toFixed(2)} SOL</p>
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
      {!isSelectMode && isAuthenticated && (
        <>
          <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleDecreaseSize}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isSmallest}
              className={cn(
                "rounded-full bg-black/50 p-1.5",
                isSmallest ? "cursor-not-allowed opacity-40" : "hover:bg-black/70"
              )}
              title="Decrease size"
            >
              <Minus className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={handleIncreaseSize}
              onMouseDown={(e) => e.stopPropagation()}
              disabled={isLargest}
              className={cn(
                "rounded-full bg-black/50 p-1.5",
                isLargest ? "cursor-not-allowed opacity-40" : "hover:bg-black/70"
              )}
              title="Increase size"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleJunk(nft.mint)
              }}
              onMouseDown={(e) => e.stopPropagation()}
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
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100",
                isStarred && "opacity-100"
              )}
            >
              <Star className={cn("h-4 w-4", isStarred ? "fill-yellow-400 text-yellow-400" : "text-white")} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface CollageNftGridProps {
  nfts: NFT[]
}

const COLS = 12
const ROW_HEIGHT = 100

function generateDefaultLayout(nfts: NFT[]): LayoutItem[] {
  const layout: LayoutItem[] = []
  let x = 0
  let y = 0

  for (const nft of nfts) {
    const w = 1
    const h = 1

    if (x + w > COLS) {
      x = 0
      y++
    }

    layout.push({ i: nft.mint, x, y, w, h })
    x += w
  }

  return layout
}

function toLayoutItem(item: CollageLayoutItem): LayoutItem {
  return { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
}

function toCollageLayoutItem(item: LayoutItem): CollageLayoutItem {
  return { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
}

export function CollageNftGrid({ nfts }: CollageNftGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const [containerWidth, setContainerWidth] = useState(1200)
  const showInfo = useAtomValue(showInfoAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const savedLayout = useAtomValue(collageLayoutAtom)
  const saveLayout = useSetAtom(saveCollageLayoutAtom)
  const fetchLayout = useSetAtom(fetchCollageLayoutAtom)
  const [layout, setLayout] = useState<LayoutItem[]>(() => generateDefaultLayout(nfts))

  useEffect(() => {
    if (isAuthenticated) {
      fetchLayout()
    }
  }, [isAuthenticated, fetchLayout])

  useEffect(() => {
    if (savedLayout.length > 0) {
      const mintSet = new Set(nfts.map((n) => n.mint))
      const validSaved = savedLayout.filter((l) => mintSet.has(l.i)).map(toLayoutItem)
      const savedMints = new Set(validSaved.map((l) => l.i))
      const newNfts = nfts.filter((n) => !savedMints.has(n.mint))

      if (newNfts.length > 0) {
        const newLayout = generateDefaultLayout(newNfts)
        const maxY = Math.max(0, ...validSaved.map((l) => l.y + l.h))
        const adjustedNew = newLayout.map((l) => ({ ...l, y: l.y + maxY }))
        const combined = [...validSaved, ...adjustedNew]
        setLayout([...verticalCompactor.compact(combined, COLS)])
      } else {
        setLayout([...verticalCompactor.compact(validSaved, COLS)])
      }
    } else {
      setLayout([...verticalCompactor.compact(generateDefaultLayout(nfts), COLS)])
    }
  }, [nfts, savedLayout])

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener("resize", updateWidth)
    return () => window.removeEventListener("resize", updateWidth)
  }, [])

  const nftMap = useMemo(() => new Map(nfts.map((nft) => [nft.mint, nft])), [nfts])

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    setLayout([...newLayout])
  }, [])

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true
  }, [])

  const handleDragStop = useCallback(
    (currentLayout: Layout, _oldItem: LayoutItem | null, _newItem: LayoutItem | null) => {
      setTimeout(() => {
        isDraggingRef.current = false
      }, 100)
      if (isAuthenticated) {
        saveLayout([...currentLayout].map(toCollageLayoutItem))
      }
    },
    [isAuthenticated, saveLayout]
  )

  const handleSizeChange = useCallback(
    (mint: string, w: number, h: number) => {
      setLayout((prev) => {
        const newLayout = prev.map((item) => (item.i === mint ? { ...item, w, h } : item))
        if (isAuthenticated) {
          saveLayout(newLayout.map(toCollageLayoutItem))
        }
        return newLayout
      })
    },
    [isAuthenticated, saveLayout]
  )

  if (nfts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <GridLayout
        className="layout"
        layout={layout}
        width={containerWidth}
        gridConfig={{
          cols: COLS,
          rowHeight: ROW_HEIGHT,
          margin: [8, 8],
          containerPadding: null,
          maxRows: Infinity,
        }}
        dragConfig={{
          enabled: isAuthenticated,
          bounded: false,
        }}
        resizeConfig={{
          enabled: false,
        }}
        compactor={verticalCompactor}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      >
        {layout.map((item) => {
          const nft = nftMap.get(item.i)
          if (!nft) return null
          return (
            <div key={item.i}>
              <CollageCard
                nft={nft}
                showInfo={showInfo}
                w={item.w}
                h={item.h}
                onSizeChange={(w, h) => handleSizeChange(item.i, w, h)}
                isAuthenticated={isAuthenticated}
                isDraggingRef={isDraggingRef}
              />
            </div>
          )
        })}
      </GridLayout>
    </div>
  )
}
