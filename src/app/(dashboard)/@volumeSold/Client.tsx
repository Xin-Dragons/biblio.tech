"use client"
import { CopyAddress } from "@/components/CopyAddress"
import { getWallets } from "@/helpers/hyperspace"
import { bigNumberFormatter } from "@/helpers/utils"
import { usePrevious } from "@/hooks/use-previous"
import {
  Box,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import { WalletStat } from "hyperspace-client-js/dist/sdk"
import { useEffect, useState } from "react"

export function Client({ wallets: initialWallets }: { wallets: WalletStat[] }) {
  const [wallets, setWallets] = useState(initialWallets)
  const [period, setPeriod] = useState("ONE_DAY")
  const [loading, setLoading] = useState(false)
  const previousPeriod = usePrevious(period)

  useEffect(() => {
    if (!previousPeriod || previousPeriod === period) {
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const wallets = await getWallets("volume_sold", period)
        setWallets(wallets)
      } finally {
        setLoading(false)
      }
    })()
  }, [period, previousPeriod])

  return (
    <Stack spacing={2} flexGrow={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" color="primary">
          By volume
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={period}
          onChange={(e, period) => setPeriod(period)}
          size="small"
          color="primary"
        >
          <ToggleButton value={"ONE_DAY"}>1d</ToggleButton>
          <ToggleButton value={"ALL"}>All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Card sx={{ flexGrow: 1, height: 400, overflow: "auto", position: "relative" }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Rank
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Address
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontWeight="bold" textTransform="uppercase">
                  Sold
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          {wallets.length && !loading ? (
            <TableBody>
              {wallets.map((wallet, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip label={index + 1} />
                  </TableCell>
                  <TableCell>
                    <CopyAddress linkPath="wallet" align="left">
                      {wallet.address}
                    </CopyAddress>
                    {wallet.sol_name}
                  </TableCell>
                  <TableCell>
                    <Typography color="primary" fontWeight="bold">
                      ◎
                      {period === "ONE_DAY"
                        ? wallet.volume_sold_1day?.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : bigNumberFormatter.format(wallet.volume_sold || 0)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          ) : (
            <TableBody>
              <TableRow>
                <TableCell colSpan={4}>
                  <Box
                    sx={{
                      height: 300,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {loading ? <CircularProgress /> : <Typography>Error reading from Hyperspace API</Typography>}
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </Card>
    </Stack>
  )
}
