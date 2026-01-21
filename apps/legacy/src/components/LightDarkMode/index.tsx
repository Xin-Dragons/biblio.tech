import { FC } from "react"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import { IconButton, Tooltip } from "@mui/material"
import { useUiSettings } from "../../context/ui-settings"

export const LightDarkMode: FC = () => {
  const { lightMode, setLightMode } = useUiSettings()
  return (
    <Tooltip title={lightMode ? "Dark mode" : "Light mode"}>
      <IconButton onClick={() => setLightMode(!lightMode)}>
        {lightMode ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
