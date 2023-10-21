import { Table, TableCell, TableHead, TableRow, Typography } from "@mui/material"
import { ConfirmedSignatureInfo, Connection, ParsedTransactionWithMeta, PublicKey } from "@solana/web3.js"
import { Client } from "./Client"
const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!)

export type ParsedTransactionWithMetaAndSignature = ParsedTransactionWithMeta &
  Pick<ConfirmedSignatureInfo, "signature" | "confirmationStatus">

export async function getTxsForAddress(address: string) {
  const sigs = await connection.getSignaturesForAddress(new PublicKey(address), {
    limit: 100,
  })
  return (
    await connection.getParsedTransactions(
      sigs.map((s) => s.signature),
      {
        maxSupportedTransactionVersion: 0,
      }
    )
  )
    .map((tx, index) => {
      if (!tx) {
        return null
      }
      return {
        ...tx,
        signature: sigs[index].signature,
        confirmationStatus: sigs[index].confirmationStatus,
      }
    })
    .filter(Boolean) as ParsedTransactionWithMetaAndSignature[]
}

export default async function Txs({ params }: { params: Record<string, string> }) {
  const txs = await getTxsForAddress(params.address)

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Signature</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Success</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Confirmation status</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Block time</Typography>
          </TableCell>
          <TableCell>
            <Typography fontWeight="bold">Instructions</Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <Client address={params.address} />
    </Table>
  )
}
