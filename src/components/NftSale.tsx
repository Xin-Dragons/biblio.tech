import { Sale } from "@/app/models/Sale"
import { CopyAddress } from "@/components/CopyAddress"
import { ImageWithFallback } from "@/components/ImageWithFallback"
import { ethAlchemy } from "@/helpers/alchemy"
import dayjs from "@/helpers/dayjs"
import { ArrowForward } from "@mui/icons-material"
import { Box, Stack, TableCell, TableRow, Link as MuiLink, Typography, Chip, SvgIcon } from "@mui/material"
import Link from "next/link"
import { useParams } from "next/navigation"
import Ethereum from "@/../public/ethereum.svg"
import { ReactNode } from "react"
import Tensor from "@/../public/tensor.svg"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

const marketplaces = {
  ME: <img width={40} src="/me.png" style={{ display: "block", margin: "0 auto" }} />,
  TENSOR: (
    <SvgIcon sx={{ width: "40px", height: "40px" }}>
      <Tensor width="100%" />
    </SvgIcon>
  ),
  HADESWAP: <img width={40} src="/hadeswap.png" style={{ display: "block", margin: "0 auto" }} />,
}

export function NftSale({
  sale,
  showType,
  showItem,
  widths,
}: {
  sale: Sale
  showType?: boolean
  showItem?: boolean
  widths?: number[]
}) {
  const price = Number(sale.price) / LAMPORTS_PER_SOL
  const { publicKey } = useParams()
  const bought = sale.buyer === publicKey

  const itemLink = `/digital-asset/${sale.nftId}`
  const explorerLink = `https://solscan.io/tx/${sale.id}`

  let symbol: ReactNode = ""
  if (sale.chain === "ETH") {
    symbol = (
      <SvgIcon>
        <Ethereum />
      </SvgIcon>
    )
  } else if (sale.chain === "SOL") {
    symbol = <Typography>◎</Typography>
  }

  console.log(sale.marketplace)

  const cols = [
    {
      component: marketplaces[sale.marketplace as keyof typeof marketplaces],
    },
    {
      component: (
        <Stack direction="row" alignItems="center">
          {symbol}
          <MuiLink href={explorerLink} target="_blank" rel="noreferrer">
            <Typography variant="h6">
              {price < 1
                ? price.toLocaleString(undefined, {
                    maximumSignificantDigits: 3,
                  })
                : price.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
            </Typography>
          </MuiLink>
        </Stack>
      ),
    },
    {
      component: <Typography>{dayjs(sale.blocktime).fromNow()}</Typography>,
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
        <MuiLink component={Link} href={itemLink} underline="hover">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box width={50} height={50}>
              <ImageWithFallback src={sale.digitalAsset?.image as string} size={100} />
            </Box>
            <Typography>{sale.digitalAsset?.name || "Unknown item"}</Typography>
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
      {cols.map((col, index) => (
        <TableCell key={index} width={col.width} align="center">
          {col.component}
        </TableCell>
      ))}
    </TableRow>
  )
}
