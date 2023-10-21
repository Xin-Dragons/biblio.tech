import { Sale } from "@/app/models/Sale"
import { AllTimeAmountPaidRequest, NftRoyaltyRequest } from "@hellomoon/api"
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { CopyAddress } from "@/components/CopyAddress"
import dayjs from "@/helpers/dayjs"
import { ArrowRight, ArrowRightAlt } from "@mui/icons-material"
import format from "date-fns/format"
import { withMappedCurrency } from "@/helpers/utils"
import { hmClient } from "@/helpers/hello-moon"

type ActualReturnType = { totalRoyaltyPaidLamports: number }

export default async function Page({ params }: { params: Record<string, string> }) {
  const allTimeRoyalties: ActualReturnType = (await hmClient.send(
    new AllTimeAmountPaidRequest({
      // @ts-ignore - bug in HM code, creator is NOT required
      filter: {
        mint: params.mintAddress,
      },
    })
  )) as any as ActualReturnType

  const royalties = await hmClient.send(
    new NftRoyaltyRequest({
      mint: params.mintAddress,
      limit: 1000,
    })
  )

  const sales = (await Promise.all(royalties.data.map(withMappedCurrency)))
    .map((s) => {
      console.log(s)
      return s
    })
    .map((s) => Sale.fromHelloMoonRoyalty(s))

  const totalRoyalties = allTimeRoyalties.totalRoyaltyPaidLamports
    ? allTimeRoyalties.totalRoyaltyPaidLamports / LAMPORTS_PER_SOL
    : 0

  return (
    <Stack py={4} height="100%" spacing={4}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        {!sales.length ? (
          <Stack>
            <Typography variant="h4">No sales with royalties detected</Typography>
            <Typography variant="h6">Royalties may have been paid before Hello Moon indexing began</Typography>
          </Stack>
        ) : (
          <Box />
        )}
        <Stack alignItems="flex-end">
          <Typography variant="h2" sx={{ color: totalRoyalties > 0 ? "success.main" : "error.main" }}>
            ◎{totalRoyalties.toLocaleString()}
          </Typography>
          <Typography variant="h5" color="primary">
            Total royalties paid (all time)
          </Typography>
        </Stack>
      </Stack>
      {!!sales.length && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center">
                <Typography fontWeight="bold">Sale transaction</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography fontWeight="bold">Royalties paid</Typography>
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
            {sales.map((sale, index) => (
              <TableRow key={index}>
                <TableCell align="center">
                  <Box width="100%" display={"flex"} alignItems="center" justifyContent={"center"}>
                    <CopyAddress tx>{sale.id}</CopyAddress>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography>◎{sale.royalty?.toLocaleString()}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography>◎{sale.price.toLocaleString()}</Typography>
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
    </Stack>
  )
}
