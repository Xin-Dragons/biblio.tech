import { Online, Offline } from "react-detect-offline";
import { Box, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { FC, useEffect, useState } from "react";
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useDatabase } from "../../context/database";
import { usePrevious } from "../../hooks/use-previous";
import DoneIcon from '@mui/icons-material/Done';

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
  const { syncing } = useDatabase();
  const previousLoading = usePrevious(syncing);

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
      zIndex: 100
    }}>
      <Container maxWidth={false} sx={{ padding: 1}}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Online>
            <WifiIcon color="success" />
          </Online>
          <Offline>
            <WifiOffIcon color="error" />
          </Offline>
          <img width="30px" src="/logo.png" />
          {
            syncing && !synced && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography color="primary">
                  Syncing...
                </Typography>
                <CircularProgress size="1.5rem" />
              </Stack>
            )
          }
          <Synced synced={synced} setSynced={setSynced} />
        </Stack>
      </Container>
    </Box>
  )
}