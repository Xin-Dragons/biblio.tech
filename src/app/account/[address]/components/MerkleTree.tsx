import { CopyAddress } from "@/components/CopyAddress"
import { MerkleTree } from "@metaplex-foundation/mpl-bubblegum"
import { Stack, Typography, Table, TableBody, TableRow, TableCell } from "@mui/material"
import { Connection } from "@solana/web3.js"
import { format } from "date-fns"

const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!)
export async function MerkleTree({ data }: { data: MerkleTree }) {
  const slotTime = await connection.getBlockTime(Number(data.treeHeader.creationSlot))
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Tree header</Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Update authority</Typography>
            </TableCell>
            <TableCell align="right">
              <CopyAddress linkPath="account">{data.treeHeader.authority}</CopyAddress>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Slot created</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{data.treeHeader.creationSlot.toLocaleString()}</Typography>
            </TableCell>
          </TableRow>
          {slotTime && (
            <TableRow>
              <TableCell>
                <Typography fontWeight="bold">Date created</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography>{format(new Date(slotTime * 1000), "yyyy/MM/dd hh:mm:ss")}</Typography>
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Max depth</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{data.treeHeader.maxDepth}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Max buffer size</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{data.treeHeader.maxBufferSize}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Padding</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{JSON.stringify(data.treeHeader.padding, null)}</Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Typography variant="h4">Tree</Typography>
      <Table>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Sequence number</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography>{Number(data.tree.sequenceNumber).toLocaleString()}</Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Active index</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography>{Number(data.tree.activeIndex).toLocaleString()}</Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Buffer size</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography>{Number(data.tree.bufferSize).toLocaleString()}</Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Current root</Typography>
          </TableCell>
          <TableCell align="right">
            <CopyAddress link={false}>{data.tree.rightMostPath.leaf}</CopyAddress>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Typography fontWeight="bold">Number of leaves</Typography>
          </TableCell>
          <TableCell align="right">
            <Typography>{Number(data.tree.rightMostPath.index).toLocaleString()}</Typography>
          </TableCell>
        </TableRow>
      </Table>
    </Stack>
  )
}
