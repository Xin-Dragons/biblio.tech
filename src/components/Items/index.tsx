import { Box, Grid, Stack, Typography } from "@mui/material"
import { useUiSettings } from "../../context/ui-settings"
import { Item, ItemProps } from "../Item"
import { FC, ReactComponentElement, memo, useEffect, useState } from "react";
import { useSelection } from "../../context/selection";
import Masonry from '@mui/lab/Masonry';
import { useDatabase } from "../../context/database";
import { sample, update } from "lodash";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { FixedSizeGrid } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { useFilters } from "../../context/filters";
import { useSorting } from "../../context/sorting";

interface ItemsProps {
  items: Item[];
  Component?: FC;
}

function getWaitingMessage() {
  const messages = [
    "Recalibrating flux capacitor...",
    "Dividing one by zero...",
    "Skipping the light fantastic...",
    "Initiating primary thrusters...",
    "Shaking, not stirring..."
  ]

  return sample(messages)
}

const SortableItem = (props) => {
  const { selected } = useSelection()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? "100" : "auto",
    opacity: isDragging ? 0 : 1
  };
  
  const Child = props.Component || Item

  const DragHandle = <DragHandleIcon
    sx={{
      cursor: "grab",
      color: "#666",
      userSelect: "none",
      outline: "0 !important",
      "&:active": {
        cursor: "grabbing !important"
      }
    }}
    {...listeners}
    {...attributes}
  />
  
  return (
    <div ref={setNodeRef} style={style}>
      <Box>
        <Child
          item={props.item}
          DragHandle={DragHandle}
          affected={props.affected}
          select={props.select}
          selected={selected.includes(props.item.nftMint)}
        />
      </Box>
    </div>
  );
};

const Cell = ({ columnIndex, rowIndex, style, data }) => {
  const { selected } = useSelection()
  const { cards, columnCount, Component, select } = data
  const singleColumnIndex = columnIndex + rowIndex * columnCount
  const card = cards[singleColumnIndex];
  const Child = Component || Item;
  return (
    <div style={style}>
      {card && <Child
        item={card}
        id={card.nftMint}
        index={card.nftMint}
        key={card.nftMint}
        select={select}
        selected={selected.includes(card.nftMint)}
      />}
    </div>
  )
}

export const cols = {
  small: 12,
  medium: 9,
  large: 6
}

const Cards = ({ cards, Component, select }) => {
  const { layoutSize, showInfo } = useUiSettings()
  // const [initialWidth, setInitialWidth] = useState(-1);

  
  // containerWidth = initialWidth;

  return (
    <Box sx={{ height: "calc(100vh - 185px)", marginBottom: 10, marginRight: 2 }}>
    <SortableContext items={cards.map(item => item.nftMint)} strategy={rectSortingStrategy}>
      <AutoSizer defaultWidth={1920} defaultHeight={1080}>
        {({ width, height }) => {
          // if(initialWidth === -1){
          //   setInitialWidth(width);
          // }
          const cardWidth = width / cols[layoutSize];
          const cardHeight = showInfo ? cardWidth * 4/3.5 + 80 : cardWidth
          const columnCount = Math.floor(width / cardWidth);
          const rowCount = Math.ceil(cards.length / columnCount);
          return (
            <FixedSizeGrid
              className="grid"
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={cardWidth}
              rowCount={rowCount}
              rowHeight={cardHeight}
              itemData={{ cards, columnCount, Component, select }}
            >
              {Cell}
            </FixedSizeGrid>
          );
        }}
      </AutoSizer>
    </SortableContext>
  </Box>
  )
}

export const Items: FC<ItemsProps> = ({ items: initialItems, Component, sortable = false, updateOrder }) => {
  const [activeId, setActiveId] = useState(null);
  const { layoutSize, showStarred } = useUiSettings();
  const { selected, setSelected } = useSelection();
  const { syncing } = useDatabase();
  const { sort } = useFilters();
  const [items, setItems] = useState(initialItems)
  const [affected, setAffected] = useState([]);
  const { setSorting } = useSorting();
  
  const select = nftMint => {
    setSelected(selected => {
      if (selected.includes(nftMint)) {
        return selected.filter(s => nftMint !== s);
      }
      return [
        ...selected,
        nftMint
      ]
    })
  }

  const sizes = {
    small: 1,
    medium: 1.5,
    large: 2
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;

    if (active.id !== over.id) {
      const ids = items.map(item => item.nftMint)
      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);

      const sortedIndexes = [oldIndex, newIndex].sort((a, b) => a - b)
      const affected = ids.slice(sortedIndexes[0], sortedIndexes[1] + 1)
      setAffected(affected)
      setSorting(true)

      const sorted = arrayMove(items, oldIndex, newIndex)
      setItems(sorted)
      const toUpdate = sorted
        .map((item, index) => {
          return {
            nftMint: item.nftMint,
            sortedIndex: index
          }
        })

      console.log('HI')

      await updateOrder(toUpdate)
    }
  };

  const Child = Component || Item;

  return items.length
    ? (
      <Box sx={{
        overflowY: "hidden",
        width: "100%",
        height: "100%",
        padding: "4px",
        marginBottom: "0px",
      }}>
        {
          sort === "sortedIndex" && sortable
            ? (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
              >
                <Cards cards={items} Component={SortableItem} select={select} />
                <DragOverlay>
                  {activeId ? (
                    <Child
                      item={items.find(i => i.nftMint === activeId)}
                      DragHandle={<DragHandleIcon
                        sx={{
                          cursor: "grabbing",
                          color: "#666",
                          userSelect: "none",
                          outline: "0 !important",
                        }}
                      />
                    } /> 
                  ) : null}
                </DragOverlay>
              </DndContext>
            )
            : <Cards cards={items} Component={Component} select={select} />
          }
        
      
      </Box>
      
    )
    : <Box sx={{ height: "calc(100vh - 150px)", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Stack spacing={2} width="100%" justifyContent="center" alignItems="center">
          <Typography variant="h5" textAlign="center">{ syncing ? getWaitingMessage() : "Nothing here yet..."}</Typography>
        </Stack>
      </Box>
    
}