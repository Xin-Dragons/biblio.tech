import { Online, Offline } from "react-detect-offline"
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  LinearProgress,
  Link,
  Stack,
  Theme,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { FC, ReactNode, useEffect, useRef, useState } from "react"
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
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { AccountBalanceWallet, ConnectWithoutContactOutlined, ContactPageOutlined } from "@mui/icons-material"
import { useNfts } from "../../context/nfts"
import { useLiveQuery } from "dexie-react-hooks"
import { Brice, CURRENCIES, CurrencyItem, useBrice } from "../../context/brice"
import { upperFirst } from "lodash"

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

export const ScrollingBrice: FC = () => {
  const brice = useBrice()
  const { preferredCurrency } = useUiSettings()
  const [coin, setCoin] = useState("solana")

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  const CurrencyTooltip = (
    <Stack>
      {Object.keys(brice).map((key) => (
        <Stack key={key} direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ marginRight: 2 }}>
            {upperFirst(key)}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {currency.symbol}
            {(brice[key as keyof object][preferredCurrency] as number).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {currency.code.toUpperCase()}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )

  return (
    <Tooltip title={CurrencyTooltip}>
      <Typography variant="body2" fontWeight="bold">
        {currency.symbol}
        {(brice[coin as keyof object][currency.code] as number).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Tooltip>
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

const FooterSection: FC<{ children: ReactNode; first?: boolean; right?: boolean; last?: boolean }> = ({
  children,
  first,
  right,
  last,
}) => {
  return (
    <Box
      sx={{
        borderRight: right ? 0 : 1,
        borderLeft: right ? 1 : 0,
        borderColor: "divider",
        paddingLeft: first ? 0 : 2,
        paddingRight: right ? (last ? 0 : 2) : 2,
        verticalAlign: "middle",
      }}
    >
      {children}
    </Box>
  )
}

const Balance: FC = () => {
  const wallet = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState(0)

  async function getBalance() {
    try {
      const bal = await connection.getBalance(wallet.publicKey!)
      setBalance(bal)
    } catch {
      setBalance(0)
    }
  }

  const interval = useRef<any>()

  useEffect(() => {
    clearInterval(interval.current)
    if (wallet.publicKey) {
      getBalance()
      interval.current = setInterval(getBalance, 1000)
    } else {
      setBalance(0)
      clearInterval(interval.current)
    }
    return () => {
      clearInterval(interval.current)
    }
  }, [wallet.publicKey])

  return (
    <Typography variant="body2" fontWeight="bold">
      ◎{(balance / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
    </Typography>
  )
}

export const Footer: FC<{ toggleSolTransferOpen: Function }> = ({ toggleSolTransferOpen }) => {
  const [synced, setSynced] = useState(false)
  const { syncing, sync, syncProgress } = useDatabase()
  const previousLoading = usePrevious(syncing)
  const attachWeb = useMediaQuery((theme: Theme) => theme.breakpoints.down("xl"))
  const { filtered, nfts } = useNfts()
  const wallet = useWallet()
  const { db } = useDatabase()
  const { preferredCurrency } = useUiSettings()
  const brice = useBrice()
  const [portfolioValue, setPortfolioValue] = useState(0)
  const collections = useLiveQuery(() => db.collections.toArray(), [], [])

  useEffect(() => {
    const value = nfts
      .map((n) => {
        const collection = collections.find((c) => c.id === n.collectionId)
        if (!collection) {
          return n
        }

        const price = brice[(n.chain === "eth" ? "ethereum" : "solana") as keyof object][preferredCurrency] as number
        const value = n.chain === "eth" ? collection.floorPrice : collection.floorPrice / LAMPORTS_PER_SOL
        // console.log(n.chain, price, value, price * value)
        return {
          ...n,
          value: price * value,
        }
      })
      .reduce((sum, nft) => {
        if (nft.value) {
          return sum + nft.value
        }
        return sum
      }, 0)

    setPortfolioValue(value)
  }, [nfts])

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

  const isSmall = useMediaQuery("(max-width:930px)")
  const hideTps = useMediaQuery("(max-width:715px)")
  const isTiny = useMediaQuery("(max-width:620px)")
  const isMobile = useMediaQuery("(max-width:480px)")
  const hideBalance = useMediaQuery("(max-width:400px)")
  const hideWeb = useMediaQuery("(max-width:1100px)")

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  return (
    <Box sx={{ borderTop: 1, borderColor: "divider" }} component="footer" color="grey">
      <Container maxWidth={false}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" height="34px">
          {isMobile ? (
            <Stack direction="row" alignItems="center">
              <FooterSection first>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Link href="https://dandies.xyz" target="_blank" rel="noreferrer">
                    <img width="24px" src="/logo.png" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Link href="https://hellomoon.io/developers" target="_blank" rel="noreferrer">
                    <img width="20px" src="/hello-moon.svg" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              <FooterSection>
                <Tooltip
                  title={
                    <Typography variant="body2">
                      This is an estimated value of the current view based on floor prices only
                    </Typography>
                  }
                >
                  <Typography variant="body2" fontWeight="bold" color="grey" sx={{ fontSize: "12px !important" }}>
                    {currency.symbol}
                    {portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    {!isTiny && currency.code.toUpperCase()}
                  </Typography>
                </Tooltip>
              </FooterSection>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center">
              {/* <FooterSection first>
                <Online>
                  <WifiIcon color="success" fontSize="small" />
                </Online>
                <Offline>
                  <WifiOffIcon color="error" fontSize="small" />
                </Offline>
              </FooterSection> */}
              {!isSmall && (
                <FooterSection first>
                  <Time />
                </FooterSection>
              )}
              <FooterSection first={isTiny}>
                <ScrollingBrice />
              </FooterSection>
              {!hideTps && (
                <FooterSection>
                  <TPS />
                </FooterSection>
              )}

              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  {!isSmall && (
                    <Typography variant="body2" fontWeight="bold">
                      Built by
                    </Typography>
                  )}
                  <Link href="https://dandies.xyz" target="_blank" rel="noreferrer">
                    <img width="24px" src="/logo.png" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              <FooterSection>
                <Stack direction="row" spacing={1} alignItems="center">
                  {!isSmall && (
                    <Typography variant="body2" fontWeight="bold">
                      Powered by
                    </Typography>
                  )}
                  <Link href="https://hellomoon.io/developers" target="_blank" rel="noreferrer">
                    <img width="20px" src="/hello-moon.svg" style={{ display: "block" }} />
                  </Link>
                </Stack>
              </FooterSection>
              {attachWeb && (
                <FooterSection>
                  <Tooltip
                    title={
                      <Typography variant="body2">
                        This is an estimated value of the current view based on floor prices only
                      </Typography>
                    }
                  >
                    <Typography variant="body2" fontWeight="bold" color="grey">
                      {currency.symbol}
                      {portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                      {!isTiny && currency.code.toUpperCase()}
                    </Typography>
                  </Tooltip>
                </FooterSection>
              )}
            </Stack>
          )}
          {!attachWeb && !isSmall && !hideWeb && (
            <Box sx={{ padding: 0.25, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
              <Tooltip
                title={
                  <Typography variant="body2">
                    This is an estimated value of the current view based on floor prices only
                  </Typography>
                }
              >
                <Typography variant="body2" fontWeight="bold" color="grey">
                  {currency.symbol}
                  {portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency.code.toUpperCase()}
                </Typography>
              </Tooltip>
            </Box>
          )}

          <Stack direction="row" alignItems="center">
            <FooterSection right>
              <Typography fontWeight="bold" sx={isMobile ? { fontSize: "10px !important" } : {}}>
                {isSmall ? "" : "Showing "}
                {filtered.length} {isSmall ? "/" : "of"} {nfts.length}
              </Typography>
            </FooterSection>
            {wallet.connected && !hideBalance && !hideWeb && (
              <FooterSection right>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  onClick={() => toggleSolTransferOpen()}
                  sx={{ cursor: "pointer" }}
                >
                  <AccountBalanceWallet fontSize="small" />
                  <Balance />
                </Stack>
              </FooterSection>
            )}

            <FooterSection right last>
              <Tooltip title="Refetch data">
                {syncing ? (
                  <CircularProgress size="1rem" />
                ) : (
                  <IconButton onClick={sync as any} disabled={syncing} size="small">
                    <SyncIcon sx={{ cursor: "pointer" }} />
                  </IconButton>
                )}
              </Tooltip>
            </FooterSection>
          </Stack>
        </Stack>
      </Container>
      {syncing && (
        <LinearProgress
          value={syncProgress}
          variant="determinate"
          sx={{ height: "2px", position: "fixed", bottom: 0, left: 0, right: 0 }}
        />
      )}
    </Box>
  )
}
