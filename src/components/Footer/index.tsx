import { Online, Offline } from "react-detect-offline";
import { Box, Button, CircularProgress, Container, Link, Stack, Typography } from "@mui/material";
import { FC, useEffect, useState } from "react";
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useDatabase } from "../../context/database";
import { usePrevious } from "../../hooks/use-previous";
import DoneIcon from '@mui/icons-material/Done';
import { useSelection } from "../../context/selection";
import { useUiSettings } from "../../context/ui-settings";

const Synced = ({ synced, setSynced }) => {
  if (!synced) {
    return null
  }

  useEffect(() => {
    setTimeout(() => {
      setSynced(false)
    }, 3000)
  }, [])

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography color="#66bb6a">
        Synced
      </Typography>
      <DoneIcon color="success" />
    </Stack>
  )
}

export const Footer: FC = () => {
  const [synced, setSynced] = useState(false)
  const { selected } = useSelection();
  const { syncing } = useDatabase();
  const previousLoading = usePrevious(syncing);
  const { selectedMenuShowing, setSelectedMenuShowing } = useUiSettings()

  function toggleSelectedMenu(e) {
    e.preventDefault();
    setSelectedMenuShowing(!selectedMenuShowing)
  }

  useEffect(() => {
    if (!syncing && previousLoading) {
      setSynced(true)
    }
  }, [syncing])

  return (
    <Box sx={{
      position: "fixed",
      bottom: 0,
      width: "100%",
      background: "black",
      zIndex: 100,
      borderTop: "2px solid #333"
    }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Online>
              <WifiIcon color="success" />
            </Online>
            <Offline>
              <WifiOffIcon color="error" />
            </Offline>
          </Box>
          <Box sx={{ padding: 0.25 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ margin: "auto", flexGrow: 1 }}>
            <img width="25px" src="/logo.png" />
            <Typography>
              x
            </Typography>
            <img width="20px" src="/hello-moon.svg" />
            </Stack>
          </Box>
          <Stack direction="row">
            {
              syncing && !synced ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography color="primary">
                    Syncing...
                  </Typography>
                  <CircularProgress size="1.5rem" />
                </Stack>
              ) : <Box />
            }
            <Synced synced={synced} setSynced={setSynced} />
            <Link
              href="#"
              onClick={toggleSelectedMenu}
              underline="none"
              color={selected.length ? "black" : "primary"}
              sx={{ fontWeight: "bold", backgroundColor: selected.length && "primary.main", padding: "0.25em 1em", borderLeft: "2px solid #333",borderRight: "2px solid #333" }}
            >SELECTION</Link>
          </Stack>
          
          
        </Stack>
    </Box>
  )
}