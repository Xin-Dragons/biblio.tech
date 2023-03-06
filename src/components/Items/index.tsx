import { Box, Grid, Stack, Typography } from "@mui/material"
import { useUiSettings } from "../../context/ui-settings"
import { Item, ItemProps } from "../Item"
import { FC, ReactComponentElement, memo } from "react";
import { useSelection } from "../../context/selection";
import Masonry from '@mui/lab/Masonry';
import { useDatabase } from "../../context/database";
import { sample } from "lodash";

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

export const Items: FC<ItemsProps> = ({ items, Component }) => {
  const { layoutSize, showStarred } = useUiSettings();
  const { selected, setSelected } = useSelection();
  const { syncing } = useDatabase();

  const sizes = {
    small: 1,
    medium: 1.5,
    large: 2
  }

  function select(mint: string) {
    if (selected.includes(mint)) {
      setSelected((prevState: string[]) => {
        return prevState.filter(s => s !== mint)
      })
    } else {
      setSelected((prevState: string[]) => {
        return [
          ...prevState,
          mint
        ]
      })
    }
  }

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
      <Grid
        container
        spacing={2}
        sx={{ width: "100%" , marginBottom: 5 }}
        alignItems="flex-start"
      >
        {
          items
            .filter(item => !showStarred || item.starred)
            .map(item => (
            <Grid item xs={sizes[layoutSize]} key={item.nftMint}>
              <Child item={item} selected={selected.includes(item.nftMint)} select={select} />
            </Grid>
          ))
        }
      </Grid>
      </Box>
      
    )
    : <Box sx={{ height: "calc(100vh - 150px)", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Stack spacing={2} width="100%" justifyContent="center" alignItems="center">
          <Typography variant="h5" textAlign="center">{ syncing ? getWaitingMessage() : "Nothing here yet..."}</Typography>
        </Stack>
      </Box>
    
}