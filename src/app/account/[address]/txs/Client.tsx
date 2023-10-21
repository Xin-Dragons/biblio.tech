"use client"

import { CheckCross } from "@/components/CheckCross"
import { CopyAddress } from "@/components/CopyAddress"
import { Stack, TableBody, TableCell, TableRow, Tooltip, Typography } from "@mui/material"
import { format } from "date-fns"
import dayjs from "@/helpers/dayjs"
import { ParsedTransactionWithMetaAndSignature, getTxsForAddress } from "./page"
import { useEffect, useState } from "react"
import { Connection } from "@solana/web3.js"

const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!)

export function Client({ address }: { address: string }) {
  const [txs, setTxs] = useState<ParsedTransactionWithMetaAndSignature[]>([])

  async function getTxs() {
    const txs = await getTxsForAddress(address)
    setTxs(txs)
  }

  useEffect(() => {
    const interval = setInterval(() => getTxs(), 5000)
    getTxs()
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <TableBody>
      {txs.map((tx, index) => {
        const instructions = (tx?.meta?.logMessages || [])
          .filter((l) => l.includes("Program log: Instruction:") || l.includes("Program log: IX:"))
          .map((l) => l.replace("Program log: Instruction:", "").replace("Program log: IX:", ""))
        return (
          <TableRow key={index}>
            <TableCell align="left">
              <CopyAddress tx align="left">
                {tx.signature}
              </CopyAddress>
            </TableCell>
            <TableCell>
              <CheckCross value={!tx.meta?.err} />
            </TableCell>
            <TableCell>
              <Typography textTransform="uppercase">{tx.confirmationStatus}</Typography>
            </TableCell>
            <TableCell>
              <Stack>
                <Typography fontWeight="bold">{dayjs((tx?.blockTime || 0) * 1000).fromNow()}</Typography>
                <Typography>{format(new Date((tx?.blockTime || 0) * 1000), "yyyy/MM/dd hh:mm:ss")}</Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Tooltip
                title={instructions.map((i, index) => (
                  <Typography key={index}>{i}</Typography>
                ))}
                sx={{ cursor: "default" }}
              >
                <Typography>
                  {instructions[0]} [{instructions.length}]
                </Typography>
              </Tooltip>
            </TableCell>
          </TableRow>
        )
      })}
    </TableBody>
  )
}
