import { Box, Button, Stack, Typography } from "@mui/material"
import { useUiSettings } from "../../context/ui-settings"
import { Item } from "../Item"
import { ElementType, FC, useEffect, useState } from "react"
import Masonry from "@mui/lab/Masonry"
import { useDatabase } from "../../context/database"
import { sample } from "lodash"
import { CSS } from "@dnd-kit/utilities"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import DragHandleIcon from "@mui/icons-material/DragHandle"
import { FixedSizeGrid } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"

import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { useWidth } from "../../hooks/use-width"
import { WalletSearch } from "../WalletSearch"
import { useBasePath } from "../../context/base-path"
import Link from "next/link"
import { useNfts } from "../../context/nfts"
import { Nft } from "../../db"
import { CollectionItem } from "../../pages/collections"
import { Router, useRouter } from "next/router"
import { useFilters } from "../../context/filters"
import { useAccess } from "../../context/access"
import { useSession } from "next-auth/react"
import { useDialog } from "../../context/dialog"
import { Profile } from "../Profile"

interface ItemsProps {
  items: Nft[] | CollectionItem[]
  Component?: FC<any>
  updateOrder?: Function
  sortable?: boolean
  squareChildren?: boolean
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

  const Child = props.Component || Item

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
  const { cards, columnCount, Component, select } = data
  const singleColumnIndex = columnIndex + rowIndex * columnCount
  const card = cards[singleColumnIndex]
  const Child = Component || Item

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
}

const Cards: FC<CardsProps> = ({ cards, Component, squareChildren }) => {
  const { layoutSize, showInfo } = useUiSettings()
  const pageWidth = useWidth()
  const router = useRouter()

  return (
    <Box sx={{ height: "100%" }}>
      <SortableContext items={cards.map((item) => item.nftMint)} strategy={rectSortingStrategy}>
        <AutoSizer defaultWidth={1920} defaultHeight={1080}>
          {({ width, height }: { width: number; height: number }) => {
            const isCollectionsView = !router.query.filter && !router.query.collectionId && !router.query.tag
            const adjust = isCollectionsView ? 40 : 90
            const cardWidth = width! / cols[pageWidth as keyof object][layoutSize as keyof object] - 3
            const cardHeight = showInfo && !squareChildren ? (cardWidth * 4) / 3.5 + adjust : cardWidth
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
              >
                {Cell}
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
}) => {
  const [activeId, setActiveId] = useState(null)
  const { layoutSize, sort } = useUiSettings()
  const { renderItem } = useDialog()
  const { syncing } = useDatabase()
  const { loading } = useNfts()
  const [items, setItems] = useState(initialItems)
  const width = useWidth()
  const basePath = useBasePath()
  const { filtersActive, clearFilters, setSearch } = useFilters()
  const { isActive } = useAccess()
  const { data: session } = useSession()
  const router = useRouter()

  const sizes = {
    small: 1,
    medium: 1.5,
    large: 2,
  }

  function isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0
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

  const Child = Component || Item

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

  const noAccess = session?.publicKey && !isActive && !router.query.publicKey

  function clearAllFilters() {
    clearFilters()
    setSearch("")
  }

  return !loading && items.length ? (
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
          <Cards cards={items} Component={SortableItem} squareChildren={squareChildren} />
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
        <Cards cards={items} Component={Component as any} squareChildren={squareChildren} />
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
        {syncing ? (
          <WaitingMessage />
        ) : (
          <Stack spacing={2} className="no-items-wrap">
            <Typography variant="h5" textAlign="center" fontWeight="normal">
              {noAccess ? "Insufficient access" : "Nothing here yet..."}
            </Typography>
            {noAccess ? (
              <Button onClick={() => renderItem(Profile)}>View profile settings</Button>
            ) : (
              <>
                {filtersActive && <Button onClick={() => clearAllFilters()}>Clear filters</Button>}
                <Link href={`${basePath}/`} passHref>
                  <Button>View all collections</Button>
                </Link>
              </>
            )}

            <Typography textAlign="center">or</Typography>
            <WalletSearch />
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
