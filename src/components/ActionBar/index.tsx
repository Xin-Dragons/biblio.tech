import { Box, Button, Dialog, DialogTitle, FormControl, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Select, Stack, SvgIcon, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { debounce, uniq } from "lodash";
import Link from "next/link";
import { FC, useEffect, useState } from "react";
import { useSelection } from "../../context/selection";
import StarIcon from '@mui/icons-material/Star';
import GridIcon from "./grid.svg";
import GridIcon2 from "./grid-2.svg";
import GridIcon3 from "./grid-3.svg";
import InfoIcon from '@mui/icons-material/Info';
import { useUiSettings } from "../../context/ui-settings";
import ImageIcon from '@mui/icons-material/Image';
import { useFilters } from "../../context/filters";
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

type ActionBarProps = {
  title: string;
  mints: string[];
  menuShowing: boolean;
  toggleMenu: Function;
  includeStarredControl?: boolean;
}

export const ActionBar: FC<ActionBarProps> = ({ title, nfts, includeStarredControl }) => {
  const { layoutSize, setLayoutSize, showStarred, setShowStarred, setShowInfo, showInfo, untagged, setUntagged } = useUiSettings()
  const { search, setSearch, sort, setSort } = useFilters()
  const [collageOptions, setCollageOptions] = useState([])
  const [collageModalShowing, setCollageModalShowing] = useState(false);

  function toggleCollageModalShowing() {
    setCollageModalShowing(!collageModalShowing);
  }

  function handleSizeChange(e, value) {
    // if (value !== null) {
      setLayoutSize(value)
    // }
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
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ borderBottom: "1px solid black", paddingBottom: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h5">{title}</Typography>
        <TextField
          label="Omnisearch"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </Stack>
      <Stack spacing={2} direction="row" alignItems="center">
        <FormControl fullWidth>
          <InputLabel id="demo-simple-select-label">Sort</InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={sort}
            label="Age"
            onChange={(e) => setSort(e.target.value)}
          >
            <MenuItem value={"sortedIndex"}>Custom</MenuItem>
            <MenuItem value={"howRare"}>How Rare</MenuItem>
            <MenuItem value={"moonRank"}>Moon Rank</MenuItem>
          </Select>
        </FormControl>
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
            {
              showInfo ? <VisibilityIcon /> : <VisibilityOffIcon />
            }
          </IconButton>
        }
        <ToggleButtonGroup
          value={layoutSize}
          exclusive
          onChange={handleSizeChange}
          aria-label="Layout size"
          defaultValue={layoutSize}
        >
          <ToggleButton value="small">
            <SvgIcon component={GridIcon3} inheritViewBox />
          </ToggleButton>
          <ToggleButton value="medium">
            <SvgIcon component={GridIcon2} inheritViewBox />
          </ToggleButton>
          <ToggleButton value="large">
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