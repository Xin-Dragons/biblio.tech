import { Box, Button, Dialog, DialogTitle, FormControlLabel, Grid, IconButton, Stack, SvgIcon, Switch, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { uniq } from "lodash";
import Link from "next/link";
import { FC, useEffect, useState } from "react";
import { useSelection } from "../../context/selection";
import StarIcon from '@mui/icons-material/Star';
import GridIcon from "./grid.svg";
import GridIcon2 from "./grid-2.svg";
import GridIcon3 from "./grid-3.svg";
import InfoIcon from '@mui/icons-material/Info';
import { useLocalStorage } from "@solana/wallet-adapter-react";
import { useUiSettings } from "../../context/ui-settings";
import ImageIcon from '@mui/icons-material/Image';
import { Masonry } from "@mui/lab";

type ActionBarProps = {
  title: string;
  mints: string[];
  menuShowing: boolean;
  toggleMenu: Function;
  includeStarredControl?: boolean;
}

export const ActionBar: FC<ActionBarProps> = ({ title, nfts, includeStarredControl }) => {
  const { layoutSize, setLayoutSize, showStarred, setShowStarred, setShowInfo, showInfo, untagged, setUntagged } = useUiSettings()
  const [collageOptions, setCollageOptions] = useState([])
  const [collageModalShowing, setCollageModalShowing] = useState(false);

  function toggleCollageModalShowing() {
    setCollageModalShowing(!collageModalShowing);
  }

  function handleSizeChange(e, value) {
    if (value !== null) {
      setLayoutSize(value)
    }
  }

  function toggleStarred() {
    setShowStarred(!showStarred)
  }

  function toggleInfo() {
    setShowInfo(!showInfo)
  }

  // useEffect(() => {
  //   const options = [];
  //   const total = nfts.length;
  //   for (let rows = 1; rows <= total; rows++) {
  //     const cols = total / rows;
  //     const remainder = total - (Math.floor(cols) * rows);
  //     options.push([rows, Math.floor(cols), remainder])
  //   }

  //   setCollageOptions(options)
  // }, [nfts.length])

  async function exportCollage() {
    
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
      <Stack direction="row" alignItems="center">
        <Typography variant="h5">{title}</Typography>
      </Stack>
      <Stack spacing={2} direction="row" alignItems="center">
        <FormControlLabel
          control={
            <Switch checked={untagged} onChange={e => setUntagged(e.target.checked)} name="gilad" />
          }
          label="Untagged"
        />
        {
          <IconButton onClick={toggleCollageModalShowing}>
            <ImageIcon fontSize="inherit" />
          </IconButton>
        }
        {
          includeStarredControl && (
            <IconButton onClick={toggleStarred}>
              <StarIcon sx={{ opacity: showStarred ? 1 : 0.55, color: showStarred ? "#faaf00" : "inherit" }} fontSize="inherit" />
            </IconButton>
          )
        }
        {
          <IconButton onClick={toggleInfo}>
            <InfoIcon sx={{ opacity: showInfo ? 1 : 0.55, color: showInfo ? "#6cbec9" : "inherit" }} fontSize="inherit" />
          </IconButton>
        }
        <ToggleButtonGroup
          value={layoutSize}
          exclusive
          onChange={handleSizeChange}
          aria-label="Layout size"
        >
          <ToggleButton value="small" aria-label="centered">
            <SvgIcon component={GridIcon3} inheritViewBox />
          </ToggleButton>
          <ToggleButton value="medium" aria-label="left aligned">
            <SvgIcon component={GridIcon2} inheritViewBox />
          </ToggleButton>
          <ToggleButton value="large" aria-label="centered">
            <SvgIcon component={GridIcon} inheritViewBox />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Dialog open={collageModalShowing} onClose={toggleCollageModalShowing} maxWidth="xl">
        <DialogTitle>Export collage</DialogTitle>
          <Stack spacing={2}>
          {
            collageOptions.map(option => {
              let cols = option[1] + option[0] / (option[2] || 1)
              let factor = 1;
              if (!Number.isInteger(cols)) {
                cols = cols * ++factor;
                if (!Number.isInteger(cols)) {
                  cols = cols * ++factor;
                  if (!Number.isInteger(cols)) {
                    cols = cols * ++factor;
                    if (!Number.isInteger(cols)) {
                      cols = cols * ++factor;  
                      if (!Number.isInteger(cols)) {
                        cols = cols * ++factor;  
                      }
                    }
                  }
                }

              }

              console.log(cols)
              
              return (
                  <Box sx={{ display: "grid", gridGap: "2px", gridTemplateColumns: new Array(parseInt(cols)).fill(`${10 / factor}px`).join(' ') }}>
                    {
                      Array.from(new Array(nfts.length).keys()).map((item, index) => {
                        return <Box sx={{
                          backgroundColor: "red",
                          aspectRatio: "1 / 1",
                          gridColumn: option[2] && index === 0 ? `1 / ${3 * factor}` : "auto",
                          gridRow: option[2] && index === 0 ? `1 / ${3 * factor}` : "auto"
                        }} />
                      })
                    }
                  </Box>
              )
            })
          }
        </Stack>
        
      </Dialog>
    </Stack>
  )
}