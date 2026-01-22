import { useMemo, useState, useEffect } from "react"
import { Link } from "react-router"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { cn } from "@/lib/utils"
import type { Collection, NFT } from "@/stores/nfts"

interface CollectionCardProps {
  collection: Collection
  fallbackImage?: string
}

function CollectionCard({ collection, fallbackImage }: CollectionCardProps) {
  const [primaryFailed, setPrimaryFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)

  useEffect(() => {
    setPrimaryFailed(false)
    setFallbackFailed(false)
  }, [collection.id])

  const primaryImage = collection.image || null
  const displayImage =
    !primaryFailed && primaryImage ? primaryImage : !fallbackFailed && fallbackImage ? fallbackImage : null

  const handleError = () => {
    if (!primaryFailed && primaryImage) {
      setPrimaryFailed(true)
    } else {
      setFallbackFailed(true)
    }
  }

  return (
    <Link
      to={`/collection/${collection.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl bg-card",
        "border border-border/50",
        "transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {displayImage ? (
          <img
            key={displayImage}
            src={displayImage}
            alt={collection.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={handleError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-display font-bold text-primary/40">{collection.name.charAt(0)}</span>
          </div>
        )}
        {/* Item count badge */}
        <div className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {collection.numMints}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center p-3">
        <h3 className="truncate text-sm font-medium">{collection.name}</h3>
      </div>
    </Link>
  )
}

type CellData = {
  collections: Collection[]
  columnCount: number
  fallbackImages: Map<string, string>
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { collections, columnCount, fallbackImages } = data
  const index = rowIndex * columnCount + columnIndex
  const collection = collections[index]

  if (!collection) return null

  return (
    <div style={style} className="p-1.5">
      <CollectionCard collection={collection} fallbackImage={fallbackImages.get(collection.id)} />
    </div>
  )
}

function getColumnCount(width: number): number {
  if (width >= 1280) return 6
  if (width >= 1024) return 5
  if (width >= 768) return 4
  if (width >= 640) return 3
  return 2
}

interface CollectionGridProps {
  collections: Collection[]
  nfts?: NFT[]
}

export function CollectionGrid({ collections, nfts = [] }: CollectionGridProps) {
  const fallbackImages = useMemo(() => {
    const map = new Map<string, string>()
    for (const collection of collections) {
      const firstNft = nfts.find((nft) => nft.collectionId === collection.id)
      if (firstNft?.image) {
        map.set(collection.id, firstNft.image)
      }
    }
    return map
  }, [collections, nfts])

  if (collections.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-2xl">📁</span>
        </div>
        <p className="text-muted-foreground font-medium">No collections found</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Your collections will appear here</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getColumnCount(width)
          const columnWidth = width / columnCount
          const rowHeight = columnWidth * 1.18
          const rowCount = Math.ceil(collections.length / columnCount)

          return (
            <FixedSizeGrid<CellData>
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              itemData={{ collections, columnCount, fallbackImages }}
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
