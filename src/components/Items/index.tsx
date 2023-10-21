"use client"
import { Box, Button, Stack, Typography } from "@mui/material"
import { useUiSettings } from "@/context/ui-settings"
import { ElementType, FC, useEffect, useLayoutEffect, useRef, useState } from "react"
import Masonry from "@mui/lab/Masonry"
// import { useDatabase } from "@/context/database"
import fscreen from "fscreen"

import { sample } from "lodash"
import { CSS } from "@dnd-kit/utilities"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import DragHandleIcon from "@mui/icons-material/DragHandle"
import { FixedSizeGrid } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { useWidth } from "@/hooks/use-width"
import { Nft } from "@/db"
import { useFilters } from "@/context/filters"

interface ItemsProps {
  items: any[]
  Component: FC<any>
  updateOrder?: Function
  sortable?: boolean
  squareChildren?: boolean
  onEndReached?: Function
}

const WaitingMessage: FC = () => {
  const messages = [
    "Recalibrating flux capacitor...",
    "Dividing one by zero...",
    "Skipping the light fantastic...",
    "Initiating primary thrusters...",
    "Shaking, not stirring...",
    "Waiting for bull market...",
    "Searching for Sugarman...",
    "Touching grass...",
    "Sifting through all your rugs...",
  ]
  const [message, setMessage] = useState("")

  function getMessage() {
    setMessage(sample(messages)!)
  }

  useEffect(() => {
    getMessage()
    const interval = setInterval(getMessage, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Typography variant="h5" textAlign="center">
      {message}
    </Typography>
  )
}

type SortableItemProps = {
  id: string
  Component: React.ElementType
  item: any
  affected: any
}

const SortableItem: FC<SortableItemProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? "100" : "auto",
    opacity: isDragging ? 0 : 1,
  }

  const Child = props.Component

  const DragHandle = (
    <DragHandleIcon
      sx={{
        cursor: "grab",
        color: "rgba(255, 255, 255, 0.5)",
        userSelect: "none",
        outline: "0 !important",
        "&:active": {
          cursor: "grabbing !important",
        },
      }}
      {...listeners}
      {...attributes}
    />
  )

  return (
    <div ref={setNodeRef} style={style}>
      <Box>
        <Child item={props.item} DragHandle={DragHandle} affected={props.affected} />
      </Box>
    </div>
  )
}

type CellProps = {
  columnIndex: number
  rowIndex: number
  style: any
  data: any
}

const Cell: FC<CellProps> = ({ columnIndex, rowIndex, style, data }) => {
  const { cards, columnCount, Component } = data
  const singleColumnIndex = columnIndex + rowIndex * columnCount
  const card = cards[singleColumnIndex]
  const Child = Component

  return (
    <div style={style}>{card && <Child item={card} id={card.nftMint} index={card.nftMint} key={card.nftMint} />}</div>
  )
}

export const cols = {
  xl: {
    small: 10,
    medium: 7,
    large: 5,
  },
  lg: {
    small: 7,
    medium: 6,
    large: 4,
  },
  md: {
    small: 6,
    medium: 5,
    large: 3,
  },
  sm: {
    small: 5,
    medium: 4,
    large: 2,
  },
  xs: {
    small: 3,
    medium: 2,
    large: 1,
  },
}

type CardsProps = {
  cards: any[]
  Component: ElementType
  squareChildren?: boolean
  onEndReached?: Function
}

const Cards: FC<CardsProps> = ({ cards, Component, onEndReached }) => {
  const { layoutSize, zenMode, fullScreen } = useUiSettings()
  const [cardHeight, setCardHeight] = useState(0)
  const [cardWidth, setCardWidth] = useState(0)
  const elementRef = useRef<HTMLDivElement | null>(null)
  const ref = useRef()
  const pageWidth = useWidth()

  useEffect(() => {
    if (fullScreen && ref.current) {
      fscreen.requestFullscreen(ref.current)
    } else {
      fscreen.exitFullscreen()
    }
  }, [fullScreen])

  useLayoutEffect(() => {
    setCardHeight(elementRef.current?.offsetHeight || 0)
  }, [cardWidth, zenMode])

  return (
    <Box sx={{ height: "100%", "&:fullscreen": { padding: 2 } }} ref={ref}>
      <div ref={elementRef} style={{ width: cardWidth, visibility: "hidden", position: "absolute" }}>
        <Component item={cards[0]} />
      </div>
      <SortableContext items={cards.map((item) => item.nftMint)} strategy={rectSortingStrategy}>
        <AutoSizer defaultWidth={1920} defaultHeight={1080}>
          {({ width, height }: { width: number; height: number }) => {
            const cardWidth = width! / cols[pageWidth as keyof object][layoutSize as keyof object]
            setCardWidth(cardWidth)

            const columnCount = Math.floor(width! / cardWidth)
            const rowCount = Math.ceil(cards.length / columnCount)

            return (
              <FixedSizeGrid
                className="grid"
                width={width!}
                height={height!}
                columnCount={columnCount!}
                columnWidth={cardWidth!}
                rowCount={rowCount!}
                rowHeight={cardHeight!}
                itemData={{ cards, columnCount, Component }}
                overscanRowCount={3}
                onScroll={(props) => {
                  if (!onEndReached || !props.scrollTop) {
                    return
                  }

                  const endReached = (props.scrollTop + height) / (rowCount * cardHeight) >= 1
                  if (endReached) {
                    onEndReached()
                  }
                }}
              >
                {Cell as any}
              </FixedSizeGrid>
            )
          }}
        </AutoSizer>
      </SortableContext>
    </Box>
  )
}

export const Items: FC<ItemsProps> = ({
  items: initialItems,
  Component,
  sortable = false,
  updateOrder,
  squareChildren,
  onEndReached,
}) => {
  const [activeId, setActiveId] = useState(null)
  const { layoutSize, sort } = useUiSettings()
  // const { syncing } = useDatabase()
  const [items, setItems] = useState(initialItems)
  const width = useWidth()
  const { filtersActive, clearFilters, setSearch } = useFilters()

  const sizes = {
    small: 1,
    medium: 1.5,
    large: 2,
  }

  const sensors = useSensors(
    useSensor(TouchSensor),
    useSensor(MouseSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleDragEnd = async (event: any) => {
    setActiveId(null)
    const { active, over } = event

    if (active.id !== over.id) {
      const ids = items.map((item) => (item as Nft).nftMint)
      const oldIndex = ids.indexOf(active.id)
      const newIndex = ids.indexOf(over.id)

      const sortedIndexes = [oldIndex, newIndex].sort((a, b) => a - b)

      const sorted = arrayMove(items as Nft[], oldIndex, newIndex)
      setItems(sorted)
      const toUpdate = sorted.map((item, index) => {
        return {
          nftMint: item.nftMint,
          sortedIndex: index,
        }
      })

      await updateOrder?.(toUpdate)
    }
  }

  const Child = Component

  if (layoutSize === "collage") {
    const masonrySizes = {
      xl: {
        cols: 5,
        gap: 3,
      },
      lg: {
        cols: 4,
        gap: 2.5,
      },
      md: {
        cols: 3,
        gap: 2,
      },
      sm: {
        cols: 2,
        gap: 1.5,
      },
      xs: {
        cols: 2,
        gap: 1.2,
      },
    }

    return (
      <Box
        sx={{
          width: "100%",
          padding: "4px",
          marginBottom: "0px",
          height: "100%",
        }}
      >
        <Masonry
          columns={(masonrySizes[width as keyof object] as any).cols}
          spacing={(masonrySizes[width as keyof object] as any).gap}
          defaultColumns={5}
        >
          {items.map((item: any) => (
            <Child key={item.nftMint} item={item} lazyLoad />
          ))}
        </Masonry>
      </Box>
    )
  }

  function clearAllFilters() {
    clearFilters()
    setSearch("")
  }

  return items.length ? (
    <Box
      sx={{
        overflowY: "hidden",
        width: "100%",
        height: "100%",
        marginBottom: "0px",
      }}
    >
      {sort === "custom" && sortable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
        >
          <Cards cards={items} Component={SortableItem} squareChildren={squareChildren} onEndReached={onEndReached} />
          <DragOverlay>
            {activeId ? (
              <Child
                item={(items as Nft[]).find((i) => i.nftMint === activeId)!}
                DragHandle={
                  <DragHandleIcon
                    sx={{
                      cursor: "grabbing",
                      color: "rgba(255, 255, 255, 0.5)",
                      userSelect: "none",
                      outline: "0 !important",
                    }}
                  />
                }
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Cards cards={items} Component={Component as any} squareChildren={squareChildren} onEndReached={onEndReached} />
      )}
    </Box>
  ) : (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        paddingTop: 5,
      }}
    >
      <Stack spacing={2} width="100%" justifyContent="flex-start" alignItems="center">
        <WaitingMessage />
      </Stack>
    </Box>
  )
}
