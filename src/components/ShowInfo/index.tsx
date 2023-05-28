import { VisibilityOff, Visibility } from "@mui/icons-material"
import { Tooltip, IconButton } from "@mui/material"
import { FC } from "react"
import { useUiSettings } from "../../context/ui-settings"

export const ShowInfo: FC = () => {
  const { showInfo, setShowInfo } = useUiSettings()
  function toggleInfo() {
    setShowInfo(!showInfo)
  }
  return (
    <Tooltip title="Toggle detailed view">
      <IconButton onClick={toggleInfo}>{showInfo ? <VisibilityOff /> : <Visibility />}</IconButton>
    </Tooltip>
  )
}
