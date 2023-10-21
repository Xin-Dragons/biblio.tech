import axios from "axios"
import { Sale } from "@/app/models/Sale"
import { CopyAddress } from "@/components/CopyAddress"
import { ArrowRightAlt } from "@mui/icons-material"
import { Table, TableHead, TableRow, TableCell, Typography, Stack, TableBody, Box, Tooltip } from "@mui/material"
import { format } from "date-fns"
import dayjs from "@/helpers/dayjs"
import { umi } from "@/app/helpers/umi"
import base58 from "bs58"
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey } from "@metaplex-foundation/umi"
import { bigNumberFormatter, withMappedCurrency } from "@/helpers/utils"
import { loadDigitalAsset } from "@/helpers/digital-assets"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export default async function Page({ params }: { params: Record<string, string> }) {
  const { data } = await axios.post(
    "https://rest-api.hellomoon.io/v0/nft/sales/secondary/latest/mint",
    {
      mint: params.mintAddress,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
      },
    }
  )
  const sales = (await Promise.all(data.data.map(withMappedCurrency)))
    .map((item: any) => Sale.fromHelloMoon(item))
    .sort((a: Sale, b: Sale) => b.blocktime! - a.blocktime!)

  return (
    <Box py={4}>
      {!sales.length ? (
        <Stack>
          <Typography variant="h4">No recent sales detected</Typography>
          <Typography variant="h6">Sales may have taken place before Hello Moon indexing began</Typography>
        </Stack>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">
                <Typography fontWeight="bold">Sale transaction</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography fontWeight="bold">Sale price</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography fontWeight="bold">Sale time</Typography>
              </TableCell>
              <TableCell align="center">
                <Stack spacing={2} direction="row" justifyContent="center">
                  <Typography fontWeight="bold">From</Typography>
                  <ArrowRightAlt color="success" />
                  <Typography fontWeight="bold">To</Typography>
                </Stack>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale: Sale, index) => (
              <TableRow key={index}>
                <TableCell align="center">
                  <Box width="100%" display={"flex"} alignItems="center" justifyContent={"center"}>
                    <CopyAddress tx>{sale.id}</CopyAddress>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={1} width="100%" justifyContent="center">
                    {sale.symbol && <Typography>{sale.symbol}</Typography>}
                    <Typography>
                      {sale.price > 1000 ? bigNumberFormatter.format(sale.price) : sale.price.toLocaleString()}
                    </Typography>
                    {sale.currency && <Typography>{sale.currency}</Typography>}
                  </Stack>
                </TableCell>

                <TableCell align="center">
                  <Tooltip
                    title={<Typography>{format(new Date(sale.blocktime as number), "dd/MM/yyyy hh:mm:ss")}</Typography>}
                  >
                    <Typography>{dayjs(sale.blocktime).fromNow()}</Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <CopyAddress>{sale.seller}</CopyAddress>
                    <ArrowRightAlt color="success" />
                    <CopyAddress>{sale.buyer}</CopyAddress>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  )
}
