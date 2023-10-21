import { CopyAddress } from "@/components/CopyAddress"
import { getDigitalAsset } from "@/helpers/digital-assets"
import { Box, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"

export default async function Compression({ params }: { params: Record<string, string> }) {
  const digitalAsset = await getDigitalAsset(params.mintAddress)
  console.log(digitalAsset)

  return (
    <Box py={4}>
      <Typography variant="h4" color="primary">
        Compression details
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography fontWeight="bold">Data hash</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{digitalAsset.compression.data_hash}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Creator hash</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{digitalAsset.compression.creator_hash}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Asset hash</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{digitalAsset.compression.asset_hash}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Tree</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>
                <CopyAddress linkPath="account">{digitalAsset.compression.tree}</CopyAddress>
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Seq</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{digitalAsset.compression.seq}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography>Leaf id</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography>{digitalAsset.compression.leaf_id}</Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  )
}
