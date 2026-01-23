import { useState, useEffect, memo } from "react"
import { Star, Trash2, Check, GripVertical } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { NiftyBadge } from "@/components/nifty-badge"
import {
  starredAtom,
  toggleStarredAtom,
  junkAtom,
  toggleJunkAtom,
  saveCustomOrderAtom,
  fetchCustomOrderAtom,
} from "@/stores/user"
import { layoutSizeAtom, showInfoAtom, type LayoutSize } from "@/stores/ui"
import { selectedNftAtom, type NFT } from "@/stores/nfts"
import { isSelectModeAtom, selectedMintsAtom, toggleSelectedAtom } from "@/stores/selection"

interface SortableNftCardProps {
  nft: NFT
  showInfo: boolean
}

const SortableNftCard = memo(function SortableNftCard({ nft, showInfo }: SortableNftCardProps) {
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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: nft.mint })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleClick = () => {
    if (isSelectMode) {
      toggleSelected(nft.mint)
    } else {
      setSelectedNft(nft)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative cursor-grab overflow-hidden rounded-lg border bg-card active:cursor-grabbing",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-border"
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="aspect-square overflow-hidden">
        <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" loading="lazy" draggable={false} />
      </div>
      {nft.tokenStandard === "Nifty" && <NiftyBadge />}
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
        <>
          <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <GripVertical className="h-4 w-4 text-white" />
          </div>
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
        </>
      )}
    </div>
  )
})

function DragOverlayCard({ nft, showInfo }: { nft: NFT; showInfo: boolean }) {
  return (
    <div className="relative cursor-grabbing overflow-hidden rounded-lg border border-primary bg-card shadow-2xl">
      <div className="aspect-square overflow-hidden">
        <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" draggable={false} />
      </div>
      {nft.tokenStandard === "Nifty" && <NiftyBadge />}
      {showInfo && (
        <div className="p-2">
          <h3 className="truncate text-sm font-medium">{nft.name}</h3>
        </div>
      )}
    </div>
  )
}

const gridColsBySize: Record<LayoutSize, string> = {
  large: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
  medium: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  small: "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10",
}

interface SortableNftGridProps {
  nfts: NFT[]
}

export function SortableNftGrid({ nfts }: SortableNftGridProps) {
  const layoutSize = useAtomValue(layoutSizeAtom)
  const showInfo = useAtomValue(showInfoAtom)
  const saveCustomOrder = useSetAtom(saveCustomOrderAtom)
  const fetchCustomOrder = useSetAtom(fetchCustomOrderAtom)
  const [items, setItems] = useState(() => nfts.map((nft) => nft.mint))
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomOrder()
  }, [fetchCustomOrder])

  useEffect(() => {
    setItems(nfts.map((nft) => nft.mint))
  }, [nfts])

  const nftMap = new Map(nfts.map((nft) => [nft.mint, nft]))
  const orderedNfts = items.map((id) => nftMap.get(id)).filter((nft): nft is NFT => nft !== undefined)
  const activeNft = activeId ? nftMap.get(activeId) : null

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      const oldIndex = items.indexOf(active.id as string)
      const newIndex = items.indexOf(over.id as string)
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)
      saveCustomOrder(newItems)
    }
  }

  if (nfts.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No NFTs found</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className={cn("grid gap-2 overflow-y-auto p-1", gridColsBySize[layoutSize])}>
          {orderedNfts.map((nft) => (
            <SortableNftCard key={nft.mint} nft={nft} showInfo={showInfo} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>{activeNft ? <DragOverlayCard nft={activeNft} showInfo={showInfo} /> : null}</DragOverlay>
    </DndContext>
  )
}
