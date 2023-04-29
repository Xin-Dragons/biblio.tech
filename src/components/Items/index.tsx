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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { useFilters } from "../../context/filters";

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

  const DragHandle = <DragHandleIcon sx={{ cursor: "grab", color: "#666", userSelect: "none", outline: "0 !important" }} {...listeners} {...attributes} />
  
  return (
    <div ref={setNodeRef} style={style}>
      <Box>
        <Child item={props.item} DragHandle={DragHandle} affected={props.affected} />
      </Box>
    </div>
  );
};

export const Items: FC<ItemsProps> = ({ items: initialItems, Component, sortable = false }) => {
  const [activeId, setActiveId] = useState(null);
  const { layoutSize, showStarred } = useUiSettings();
  const { selected, setSelected } = useSelection();
  const { syncing, updateNfts } = useDatabase();
  const { sort } = useFilters();
  const [items, setItems] = useState(initialItems)
  const [affected, setAffected] = useState([]);

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

      const sorted = arrayMove(items, oldIndex, newIndex)
      setItems(sorted)
      const toUpdate = sorted
        .map((item, index) => {
          return {
            nftMint: item.nftMint,
            sortedIndex: index
          }
        })

      await updateNfts(toUpdate)
    }
  };

  const Child = Component || Item;

  return items.length
    ? (
      <Box sx={{
        overflowY: "auto",
        width: "100%",
        height: "100%",
        padding: "4px",
        marginBottom: "0px",
        height: "calc(100vh - 185px)"
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
                <Grid
                  container
                  spacing={2}
                  sx={{ width: "100%" , marginBottom: 5 }}
                  alignItems="flex-start"
                >
                  <SortableContext items={items.map(item => item.nftMint)} strategy={rectSortingStrategy}>
                    {/* {
                      items
                        .filter(item => !showStarred || item.starred)
                        .map(item => (
                          <SortableItem key={item.nftMint} id={item.nftMint} handle={true} value={item.nftMint} />
                        // <Grid item xs={sizes[layoutSize]} key={item.nftMint}>
                          // <Child item={item} selected={selected.includes(item.nftMint)} />
                        // </Grid>
                      ))
                    } */}
                    {items.map((item, index) => (
                      <Grid item xs={sizes[layoutSize]} key={item.nftMint}>
                        <SortableItem id={item.nftMint} item={item} key={item.nftMint} affected={affected.includes(item.nftMint)} />
                      </Grid>
                    ))}
                    <DragOverlay>
                      {activeId ? (
                        <Child item={items.find(i => i.nftMint === activeId)} /> 
                      ) : null}
                    </DragOverlay>
                  </SortableContext>
                  
                </Grid>

              </DndContext>
            )
            : <Grid
                container
                spacing={2}
                sx={{ width: "100%" , marginBottom: 5 }}
                alignItems="flex-start"
              >
                {
                  items.map(item => (
                    <Grid item xs={sizes[layoutSize]} key={item.nftMint}>
                      <Child item={item} />
                    </Grid>
                  ))
                }
                
              </Grid>
            }
        
      
      </Box>
      
    )
    : <Box sx={{ height: "calc(100vh - 150px)", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Stack spacing={2} width="100%" justifyContent="center" alignItems="center">
          <Typography variant="h5" textAlign="center">{ syncing ? getWaitingMessage() : "Nothing here yet..."}</Typography>
        </Stack>
      </Box>
    
}