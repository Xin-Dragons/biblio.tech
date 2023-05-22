import { Online, Offline } from "react-detect-offline"
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { FC, ReactNode, useEffect, useState } from "react"
import WifiIcon from "@mui/icons-material/Wifi"
import WifiOffIcon from "@mui/icons-material/WifiOff"
import { useDatabase } from "../../context/database"
import { usePrevious } from "../../hooks/use-previous"
import DoneIcon from "@mui/icons-material/Done"
import { useSelection } from "../../context/selection"
import { useUiSettings } from "../../context/ui-settings"
import SyncIcon from "@mui/icons-material/Sync"
import axios from "axios"
import format from "date-fns/format"
import { useConnection } from "@solana/wallet-adapter-react"

function Time() {
  const [time, setTime] = useState("")

  function updateTime() {
    const now = new Date()
    const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)

    setTime(format(utc, "HH:mm:ss"))
  }

  useEffect(() => {
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])
  return (
    <Typography variant="body2" fontWeight="bold">
      UTC: {time}
    </Typography>
  )
}

const BRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"

export const Brice: FC = () => {
  const [brice, setBrice] = useState(`$20.00`)

  async function getBrice() {
    try {
      const { data } = await axios.get(BRICE_API)
      setBrice(`$${data.solana.usd}`)
    } catch {
      setBrice("pending")
    }
  }

  useEffect(() => {
    getBrice()
    const interval = setInterval(getBrice, 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Typography variant="body2" fontWeight="bold">
      {brice}
    </Typography>
  )
}

const TPS = () => {
  const [tps, setTps] = useState(1000)
  const { connection } = useConnection()

  async function getTps() {
    try {
      const [results] = await connection.getRecentPerformanceSamples(1)
      setTps(results.numTransactions / results.samplePeriodSecs)
    } catch {}
  }

  useEffect(() => {
    getTps()
    const interval = setInterval(getTps, 5000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Typography variant="body2" fontWeight="bold">
      TPS: {tps.toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </Typography>
  )
}

const FooterSection: FC<{ children: ReactNode; first?: boolean }> = ({ children, first }) => {
  return (
    <Box
      sx={{
        borderRight: "1px solid #333",
        paddingRight: 2,
        paddingLeft: first ? 0 : 2,
      }}
    >
      {children}
    </Box>
  )
}

export const Footer: FC = () => {
  const [synced, setSynced] = useState(false)
  const { syncing, sync, syncingData, syncingRarity } = useDatabase()
  const previousLoading = usePrevious(syncing)

  useEffect(() => {
    if (!synced) return
    const timeout = setTimeout(() => {
      setSynced(false)
    }, 3000)
    return () => {
      clearTimeout(timeout)
    }
  }, [synced])

  useEffect(() => {
    if (!syncing && previousLoading) {
      setSynced(true)
    }
  }, [syncing])

  return (
    <Box sx={{ borderTop: "1px solid #333", padding: 0.25 }} component="footer" color="grey">
      <Container maxWidth={false}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center">
            {/* <Box sx={{ borderRight: "1px solid #333", paddingRight: 1 }}>
              <Online>
                <WifiIcon color="success" />
              </Online>
              <Offline>
                <WifiOffIcon color="error" />
              </Offline>
            </Box> */}
            <FooterSection first>
              <Time />
            </FooterSection>
            <FooterSection>
              <Brice />
            </FooterSection>
            <FooterSection>
              <TPS />
            </FooterSection>
            <FooterSection>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight="bold">
                  Built by
                </Typography>
                <Link href="https://dandies.xyz" target="_blank" rel="noreferrer">
                  <img width="24px" src="/logo.png" style={{ display: "block" }} />
                </Link>
              </Stack>
            </FooterSection>
            <FooterSection>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight="bold">
                  Powered by
                </Typography>
                <Link href="https://hellomoon.io/developers" target="_blank" rel="noreferrer">
                  <img width="20px" src="/hello-moon.svg" style={{ display: "block" }} />
                </Link>
              </Stack>
            </FooterSection>
          </Stack>
          <Box sx={{ padding: 0.25, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            <Typography variant="body2" fontWeight="bold" color="grey">
              https://biblio.tech
            </Typography>
          </Box>
          <Stack direction="row">
            {!syncing && !synced && (
              <Tooltip title="Refetch data">
                <SyncIcon onClick={sync as any} sx={{ cursor: "pointer" }} />
              </Tooltip>
            )}
            {syncing && !synced ? (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography color="primary" variant="body2" fontWeight="bold">
                  {syncingData ? "Syncing data..." : syncingRarity && "Pulling rarity..."}
                </Typography>
                <CircularProgress size="1rem" />
              </Stack>
            ) : (
              <Box />
            )}
            {synced && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography color="#66bb6a">Synced</Typography>
                <DoneIcon color="success" />
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
