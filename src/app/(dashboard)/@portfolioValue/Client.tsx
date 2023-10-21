"use client"

import { CopyAddress } from "@/components/CopyAddress"
import { bigNumberFormatter } from "@/helpers/utils"
import {
  Card,
  Chip,
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
import { useState } from "react"

export function Client({ wallets }: { wallets: WalletStat[] }) {
  return (
    <Stack spacing={2} flexGrow={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5" color="primary">
          Portfolio value
        </Typography>
        <ToggleButtonGroup
          sx={{ visibility: "hidden" }}
          exclusive
          value={"current"}
          // onChange={(e, period) => setPeriod(period)}
          size="small"
          color="primary"
        >
          <ToggleButton value={"current"}>Current</ToggleButton>
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
                  Value
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
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
                    ◎{bigNumberFormatter.format(wallet.portfolio_value || 0)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  )
}
