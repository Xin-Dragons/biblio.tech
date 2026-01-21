import { Link } from "react-router"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import type { Collection } from "@/stores/nfts"

interface CollectionCardProps {
  collection: Collection
}

function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link
      to={`/collection/${collection.id}`}
      className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
    >
      <div className="aspect-square overflow-hidden">
        {collection.image ? (
          <img
            src={collection.image}
            alt={collection.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-4xl text-muted-foreground">{collection.name.charAt(0)}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium">{collection.name}</h3>
        <p className="text-sm text-muted-foreground">{collection.numMints} items</p>
      </div>
    </Link>
  )
}

type CellData = {
  collections: Collection[]
  columnCount: number
}

function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { collections, columnCount } = data
  const index = rowIndex * columnCount + columnIndex
  const collection = collections[index]

  if (!collection) return null

  return (
    <div style={style} className="p-2">
      <CollectionCard collection={collection} />
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
}

export function CollectionGrid({ collections }: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-muted-foreground">No collections found</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getColumnCount(width)
          const columnWidth = width / columnCount
          const rowHeight = columnWidth * 1.2
          const rowCount = Math.ceil(collections.length / columnCount)

          return (
            <FixedSizeGrid<CellData>
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              itemData={{ collections, columnCount }}
            >
              {Cell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}
