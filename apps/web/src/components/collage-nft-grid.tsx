import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Check } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import DraggableGrid, { type DraggableGridHandle } from "ruuri"
import { cn } from "@/lib/utils"
import { NiftyBadge } from "@/components/nifty-badge"
import {
  collageSizesAtom,
  collageOrderAtom,
  saveCollageSizesAtom,
  saveCollageOrderAtom,
  fetchCollageSizesAtom,
  fetchCollageOrderAtom,
  type CollageSizeClass,
} from "@/stores/user"
import { isAuthenticatedAtom } from "@/stores/auth"
import { type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"

type SizeClass = CollageSizeClass

// Size multipliers - small is 1 unit, medium is 2, etc.
const sizeMultipliers: Record<SizeClass, number> = {
  small: 1,
  medium: 2,
  large: 3,
  xlarge: 4,
}

const GAP_RATIO = 0.07 // Gap as percentage of base unit

const sizeOrder: SizeClass[] = ["small", "medium", "large", "xlarge"]
const sizeDots: Record<SizeClass, number> = { small: 1, medium: 2, large: 3, xlarge: 4 }

function SizePip({
  size,
  isAnimating,
  onClick,
}: {
  size: SizeClass
  isAnimating: boolean
  onClick: (e: React.MouseEvent) => void
}) {
  const dotCount = sizeDots[size]
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-1 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-black/70"
      title="Click or double-click card to resize"
    >
      {[1, 2, 3, 4].map((dot) => (
        <span
          key={dot}
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-all duration-200",
            dot <= dotCount ? "bg-white" : "bg-white/30",
            isAnimating && dot <= dotCount && "animate-pulse"
          )}
        />
      ))}
    </button>
  )
}

function getColumnCount(width: number): number {
  if (width >= 1536) return 16
  if (width >= 1280) return 14
  if (width >= 1024) return 12
  if (width >= 768) return 10
  if (width >= 480) return 8
  return 6
}

function getImageUrl(url: string, size: SizeClass): string {
  if ((size === "large" || size === "xlarge") && url.includes("prod-image-cdn.tensor.trade")) {
    const match = url.match(/freeze=false\/(.+)$/)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }
  return url
}

interface CollageCardProps {
  nft: NFT
  size: SizeClass
  pixelSize: number
  borderRadius: number
  onSizeChange: (size: SizeClass) => void
  isAuthenticated: boolean
}

function CollageCard({ nft, size, pixelSize, borderRadius, onSizeChange, isAuthenticated }: CollageCardProps) {
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)
  const isSelected = selectedMints.has(nft.mint)
  const [isAnimating, setIsAnimating] = useState(false)

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const didDragRef = useRef(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    didDragRef.current = false
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return
    const dx = Math.abs(e.clientX - pointerStartRef.current.x)
    const dy = Math.abs(e.clientY - pointerStartRef.current.y)
    if (dx > 5 || dy > 5) {
      didDragRef.current = true
    }
  }

  const handlePointerUp = () => {
    pointerStartRef.current = null
  }

  const cycleSize = useCallback(() => {
    const currentIndex = sizeOrder.indexOf(size)
    const nextIndex = (currentIndex + 1) % sizeOrder.length
    onSizeChange(sizeOrder[nextIndex])
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }, [size, onSizeChange])

  const handleClick = () => {
    if (didDragRef.current) return

    if (isSelectMode) {
      toggleSelected(nft.mint)
    } else if (isAuthenticated) {
      cycleSize()
    }
  }

  const handlePipClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cycleSize()
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden border bg-card",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border",
        isAuthenticated && "collage-card-draggable"
      )}
      style={{ width: pixelSize, height: pixelSize, borderRadius }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <div className="h-full w-full overflow-hidden">
        <img
          src={getImageUrl(nft.image, size)}
          alt={nft.name}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      </div>
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
      {!isSelectMode && isAuthenticated && <SizePip size={size} isAnimating={isAnimating} onClick={handlePipClick} />}
      {nft.tokenStandard === "Nifty" && <NiftyBadge />}
    </div>
  )
}

interface GridItemData {
  id: string
  nft: NFT
  size: SizeClass
}

interface CollageNftGridProps {
  nfts: NFT[]
  context?: string
}

export function CollageNftGrid({ nfts, context = "nfts" }: CollageNftGridProps) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)

  const savedSizes = useAtomValue(collageSizesAtom)
  const savedOrder = useAtomValue(collageOrderAtom)
  const saveSizes = useSetAtom(saveCollageSizesAtom)
  const saveOrder = useSetAtom(saveCollageOrderAtom)
  const fetchSizes = useSetAtom(fetchCollageSizesAtom)
  const fetchOrder = useSetAtom(fetchCollageOrderAtom)

  const [sizes, setSizes] = useState<Record<string, SizeClass>>({})
  const [containerWidth, setContainerWidth] = useState(0)
  const gridRef = useRef<DraggableGridHandle>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const columnCount = useMemo(() => getColumnCount(containerWidth), [containerWidth])

  // Calculate unit size and gap based on container width
  // baseUnit = containerWidth / columnCount
  // gap = baseUnit * GAP_RATIO, unitSize = baseUnit - gap
  const { unitSize, gap } = useMemo(() => {
    if (containerWidth === 0) return { unitSize: 120, gap: 8 }
    const baseUnit = containerWidth / columnCount
    const g = baseUnit * GAP_RATIO
    return { unitSize: baseUnit - g, gap: g }
  }, [containerWidth, columnCount])

  const getPixelSize = useCallback(
    (size: SizeClass) => unitSize * sizeMultipliers[size] + gap * (sizeMultipliers[size] - 1),
    [unitSize, gap]
  )

  // Track container width (clientWidth excludes scrollbar) with debounce
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setContainerWidth(container.clientWidth)
      }, 100)
    })

    observer.observe(container)
    setContainerWidth(container.clientWidth)

    return () => {
      observer.disconnect()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchSizes(context)
      fetchOrder(context)
    }
  }, [isAuthenticated, fetchSizes, fetchOrder, context])

  useEffect(() => {
    setSizes(savedSizes)
    // Refresh layout when sizes load from API
    gridRef.current?.grid?.refreshItems?.()
    gridRef.current?.grid?.layout?.()
  }, [savedSizes])

  // Refresh layout when unit size or column count changes (container resized)
  useEffect(() => {
    if (unitSize > 0) {
      gridRef.current?.grid?.refreshItems?.()
      gridRef.current?.grid?.layout?.()
    }
  }, [unitSize, columnCount])

  const nftMap = useMemo(() => new Map(nfts.map((nft) => [nft.mint, nft])), [nfts])

  const gridData = useMemo(() => {
    const mintSet = new Set(nfts.map((n) => n.mint))
    const validSavedOrder = savedOrder.filter((mint) => mintSet.has(mint))
    const newMints = nfts.filter((n) => !validSavedOrder.includes(n.mint)).map((n) => n.mint)
    const orderedMints = [...validSavedOrder, ...newMints]
    return orderedMints
      .map((mint) => {
        const nft = nftMap.get(mint)
        if (!nft) return null
        const size = sizes[mint] || "small"
        return { id: mint, nft, size }
      })
      .filter((item): item is GridItemData => item !== null)
  }, [nfts, savedOrder, nftMap, sizes])

  const handleSizeChange = useCallback(
    (mint: string, newSize: SizeClass) => {
      setSizes((prev) => {
        const updated = { ...prev, [mint]: newSize }
        if (isAuthenticated) {
          saveSizes(updated, context)
        }
        return updated
      })
      // Trigger layout refresh after size change
      setTimeout(() => {
        gridRef.current?.grid?.refreshItems?.()
        gridRef.current?.grid?.layout?.()
      }, 0)
    },
    [isAuthenticated, saveSizes, context]
  )

  const handleDragEnd = useCallback(() => {
    const grid = gridRef.current?.grid
    if (!grid) return
    const items = grid.getItems()
    const newOrder = items
      .map((item) => {
        const el = item.getElement()
        return el?.dataset?.id || ""
      })
      .filter(Boolean)
    if (isAuthenticated && newOrder.length > 0) {
      saveOrder(newOrder, context)
    }
  }, [isAuthenticated, saveOrder, context])

  const borderRadius = Math.max(6, unitSize * 0.08)

  const renderItem = useCallback(
    (item: GridItemData) => {
      const px = getPixelSize(item.size)
      return (
        <div data-id={item.id} style={{ width: px + gap, height: px + gap, padding: gap / 2 }}>
          <CollageCard
            nft={item.nft}
            size={item.size}
            pixelSize={px}
            borderRadius={borderRadius}
            onSizeChange={(newSize) => handleSizeChange(item.id, newSize)}
            isAuthenticated={isAuthenticated}
          />
        </div>
      )
    },
    [handleSizeChange, isAuthenticated, getPixelSize, borderRadius, gap]
  )

  if (nfts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} id="collage-grid-container" className="collage-grid-wrapper h-full w-full overflow-y-auto">
      <DraggableGrid
        ref={gridRef}
        data={gridData}
        renderItem={renderItem}
        dragEnabled={isAuthenticated}
        dragSort
        style={{ width: "100%" }}
        layout={{ fillGaps: true }}
        layoutOnResize
        layoutDuration={300}
        layoutEasing="ease-out"
        dragPlaceholder={{
          enabled: true,
          createElement: (item) => {
            const el = document.createElement("div")
            const rect = item.getElement()?.getBoundingClientRect()
            el.style.width = `${rect?.width || 120}px`
            el.style.height = `${rect?.height || 120}px`
            el.style.borderRadius = "8px"
            const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
            el.style.backgroundColor = `hsl(${primary} / 0.2)`
            el.style.border = `2px dashed hsl(${primary})`
            el.style.boxSizing = "border-box"
            return el
          },
        }}
        onDragEnd={handleDragEnd}
      />
    </div>
  )
}
