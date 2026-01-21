import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Check, Plus, Minus } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import DraggableGrid, { type DraggableGridHandle } from "ruuri"
import { cn } from "@/lib/utils"
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
import { showInfoAtom } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"

type SizeClass = CollageSizeClass

const sizeToPixels: Record<SizeClass, number> = {
  small: 120,
  medium: 248,
  large: 376,
  xlarge: 504,
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
  showInfo: boolean
  size: SizeClass
  onSizeChange: (size: SizeClass) => void
  isAuthenticated: boolean
  onItemClick: () => void
}

function CollageCard({ nft, showInfo, size, onSizeChange, isAuthenticated, onItemClick }: CollageCardProps) {
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const isSelected = selectedMints.has(nft.mint)

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

  const handleClick = () => {
    if (didDragRef.current) return
    onItemClick()
  }

  const handleIncreaseSize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (size === "small") onSizeChange("medium")
    else if (size === "medium") onSizeChange("large")
    else if (size === "large") onSizeChange("xlarge")
  }

  const handleDecreaseSize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (size === "xlarge") onSizeChange("large")
    else if (size === "large") onSizeChange("medium")
    else if (size === "medium") onSizeChange("small")
  }

  const isSmallest = size === "small"
  const isLargest = size === "xlarge"
  const px = sizeToPixels[size]

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border",
        isAuthenticated && "collage-card-draggable"
      )}
      style={{ width: px, height: px }}
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
        <div
          className="absolute left-2 top-2 flex cursor-pointer items-center gap-0.5 rounded-md bg-black/60 p-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        >
          <button
            onClick={handleDecreaseSize}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isSmallest}
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors",
              isSmallest ? "cursor-not-allowed opacity-40" : "hover:bg-white/20"
            )}
            title="Decrease size"
          >
            <Minus className="h-3.5 w-3.5 text-white" />
          </button>
          <div className="h-4 w-px bg-white/30" />
          <button
            onClick={handleIncreaseSize}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={isLargest}
            className={cn(
              "flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-colors",
              isLargest ? "cursor-not-allowed opacity-40" : "hover:bg-white/20"
            )}
            title="Increase size"
          >
            <Plus className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      )}
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
}

export function CollageNftGrid({ nfts }: CollageNftGridProps) {
  const showInfo = useAtomValue(showInfoAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const setSelectedNft = useSetAtom(selectedNftAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const toggleSelected = useSetAtom(toggleSelectedAtom)

  const savedSizes = useAtomValue(collageSizesAtom)
  const savedOrder = useAtomValue(collageOrderAtom)
  const saveSizes = useSetAtom(saveCollageSizesAtom)
  const saveOrder = useSetAtom(saveCollageOrderAtom)
  const fetchSizes = useSetAtom(fetchCollageSizesAtom)
  const fetchOrder = useSetAtom(fetchCollageOrderAtom)

  const [sizes, setSizes] = useState<Record<string, SizeClass>>({})
  const gridRef = useRef<DraggableGridHandle>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSizes()
      fetchOrder()
    }
  }, [isAuthenticated, fetchSizes, fetchOrder])

  useEffect(() => {
    setSizes(savedSizes)
    // Refresh layout when sizes load from API
    setTimeout(() => {
      gridRef.current?.grid?.refreshItems?.()
      gridRef.current?.grid?.layout?.()
    }, 100)
  }, [savedSizes])

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
          saveSizes(updated)
        }
        return updated
      })
      // Trigger layout refresh after size change
      setTimeout(() => {
        gridRef.current?.grid?.refreshItems?.()
        gridRef.current?.grid?.layout?.()
      }, 0)
    },
    [isAuthenticated, saveSizes]
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
      saveOrder(newOrder)
    }
  }, [isAuthenticated, saveOrder])

  const handleItemClick = useCallback(
    (nft: NFT) => {
      if (isSelectMode) {
        toggleSelected(nft.mint)
      } else {
        setSelectedNft(nft)
      }
    },
    [isSelectMode, toggleSelected, setSelectedNft]
  )

  const renderItem = useCallback(
    (item: GridItemData) => {
      const px = sizeToPixels[item.size]
      return (
        <div data-id={item.id} className="p-1" style={{ width: px + 8, height: px + 8 }}>
          <CollageCard
            nft={item.nft}
            showInfo={showInfo}
            size={item.size}
            onSizeChange={(newSize) => handleSizeChange(item.id, newSize)}
            isAuthenticated={isAuthenticated}
            onItemClick={() => handleItemClick(item.nft)}
          />
        </div>
      )
    },
    [showInfo, handleSizeChange, isAuthenticated, handleItemClick]
  )

  if (nfts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <DraggableGrid
        ref={gridRef}
        data={gridData}
        renderItem={renderItem}
        dragEnabled={isAuthenticated}
        dragSort
        layout={{ fillGaps: true }}
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
