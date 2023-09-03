"use client"

import { CopyAddress } from "@/components/CopyAddress"
import { ImageWithFallback } from "@/components/ImageWithFallback"
import dayjs from "@/helpers/dayjs"
import { ArrowForward } from "@mui/icons-material"
import { Box, Stack, TableCell, TableRow, Link as MuiLink, Typography, Chip } from "@mui/material"
import Link from "next/link"
import { useParams } from "next/navigation"

export function NftSale({
  sale,
  showType,
  showItem,
  widths,
}: {
  sale: any
  showType?: boolean
  showItem?: boolean
  widths?: number[]
}) {
  const price = sale.price as number
  const { publicKey } = useParams()
  const bought = sale.buyer === publicKey

  const cols = [
    {
      component: (
        <Typography>
          <MuiLink href={`https://solscan.io/tx/${sale.transactionId}`} target="_blank" rel="noreferrer">
            ◎
            {price < 1
              ? price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : price.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
          </MuiLink>
        </Typography>
      ),
    },
    {
      component: <Typography>{dayjs((sale.blocktime || sale.blockTime) * 1000).fromNow()}</Typography>,
    },
    {
      component: (
        <Box display="flex" alignItems="flex-end" justifyContent="end">
          <CopyAddress linkPath="wallet">{sale.seller}</CopyAddress>
        </Box>
      ),
    },
    {
      component: <ArrowForward />,
      width: 50,
    },
    {
      component: (
        <Box display="flex" justifyContent="start">
          <CopyAddress linkPath="wallet">{sale.buyer}</CopyAddress>
        </Box>
      ),
    },
  ]

  if (showItem) {
    cols.unshift({
      component: (
        <MuiLink component={Link} href={`/digital-asset/${sale.mint || sale.nftMint}`} underline="hover">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box width={50} height={50}>
              <ImageWithFallback src={sale.digitalAsset?.content.links.image} size={100} />
            </Box>
            <Typography>{sale.digitalAsset?.content.metadata.name || "Unknown item"}</Typography>
          </Stack>
        </MuiLink>
      ),
    })
  }

  if (showType && publicKey) {
    cols.unshift({
      component: (
        <Chip label={bought ? "BOUGHT" : "SOLD"} color={bought ? "success" : "error"} sx={{ fontWeight: "bold" }} />
      ),
    })
  }

  if (widths) {
    widths.forEach((width, index) => {
      cols[index].width = cols[index].width || width
    })
  }

  return (
    <TableRow>
      {cols.map((col) => (
        <TableCell width={col.width}>{col.component}</TableCell>
      ))}
    </TableRow>
  )
}
