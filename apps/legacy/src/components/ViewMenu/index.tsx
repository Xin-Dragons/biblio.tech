import { Dashboard, Visibility, VisibilityOff } from "@mui/icons-material"
import { Stack, Tooltip, IconButton, ToggleButtonGroup, ToggleButton, Box, SvgIcon } from "@mui/material"
import { FC } from "react"

import GridIcon from "./grid.svg"
import GridIcon2 from "./grid-2.svg"
import GridIcon3 from "./grid-3.svg"
import { useNfts } from "../../context/nfts"
import { LayoutSize, useUiSettings } from "../../context/ui-settings"

export const ViewMenu: FC = () => {
  const { layoutSize, setLayoutSize } = useUiSettings()
  const { filtered } = useNfts()

  function handleSizeChange(e: any, value: LayoutSize) {
    if (value !== null) {
      setLayoutSize(value)
    }
  }

  return (
    <Stack direction="row" spacing={1}>
      <ToggleButtonGroup
        value={layoutSize}
        exclusive
        onChange={handleSizeChange}
        aria-label="Layout size"
        defaultValue={layoutSize}
        size="small"
      >
        <ToggleButton value="small">
          <Tooltip title="Condensed view">
            <Box sx={{ height: "1.6em" }}>
              <SvgIcon component={GridIcon3} inheritViewBox fontSize="small" />
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="medium">
          <Tooltip title="Medium view">
            <Box sx={{ height: "1.6em" }}>
              <SvgIcon component={GridIcon2} inheritViewBox fontSize="small" />
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="large">
          <Tooltip title="Large view">
            <Box sx={{ height: "1.6em" }}>
              <SvgIcon component={GridIcon} inheritViewBox fontSize="small" />
            </Box>
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="collage" disabled={filtered.length > 500}>
          <Tooltip title="Masonry view">
            <Box sx={{ height: "1.8em" }}>
              <Dashboard />
            </Box>
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  )
}
