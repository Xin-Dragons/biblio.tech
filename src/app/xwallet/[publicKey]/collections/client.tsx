"use client"

import { Items } from "@/components/Items"
import { CURRENCIES, CurrencyItem } from "@/context/brice"
import { useTheme } from "@/context/theme"
import { LayoutSize, useUiSettings } from "@/context/ui-settings"
import { Box, Card, CardContent, Chip, Stack, SvgIcon, Typography, alpha } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import Solana from "@/../public/solana.svg"
import Eth from "@/../public/eth.svg"
import Matic from "@/../public/matic.svg"

function Collection({ item, selected }: { item: any; selected: any }) {
  const { showInfo, lightMode, layoutSize, preferredCurrency } = useUiSettings()
  const theme = useTheme()
  const path = usePathname()

  console.log({ item })

  const margins = {
    small: 1,
    medium: 1.25,
    large: 1.5,
    collage: 5,
  }

  const fontSizes = (layoutSize: LayoutSize) => {
    const sizes = {
      small: {
        xs: "3vw",
        sm: "2vw",
        md: "1.5vw",
        lg: "1.25vw",
        xl: "1vw",
      },
      medium: {
        xs: "5vw",
        sm: "3vw",
        md: "1.75vw",
        lg: "1.5vw",
        xl: "1.25vw",
      },
      large: {
        xs: "8vw",
        sm: "4vw",
        md: "2.5vw",
        lg: "2vw",
        xl: "1.5vw",
      },
    }

    return sizes[layoutSize as keyof object]
  }

  const currencySymbols = {
    solana: "SOL",
    ethereum: "ETH",
  }

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  return (
    <Link href={`${path}/${item.id}`}>
      <Card
        sx={{
          position: "relative",
          cursor: "pointer",
          outline: selected ? "2px solid white" : "none",
          margin: margins[layoutSize],
        }}
      >
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <img
            onError={(e: any) => (e.target.src = lightMode ? "/books-lightest.svg" : "/books-lighter.svg")}
            src={
              item.image
                ? `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${item.image.replace(
                    "ipfs://",
                    "https://ipfs.io/ipfs/"
                  )}`
                : lightMode
                ? "/books-lightest.svg"
                : "/books-lighter.svg"
            }
            width="100%"
            style={{ display: "block", aspectRatio: "1 / 1" }}
          />
          {showInfo && (
            <Chip
              label={item.digitalAssets.length}
              sx={{
                position: "absolute",
                backgroundColor: alpha(theme.palette.background.default, 0.8),
                right: "8px",
                top: "8px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            />
          )}

          {showInfo && (
            <SvgIcon
              sx={{
                position: "absolute",
                left: "8px",
                top: "8px",
                width: "30px",
                height: "30px",
                fill: lightMode ? "white" : "black",
              }}
            >
              {item.chain === "solana" && <Solana />}
              {item.chain === "eth" && <Eth />}
              {item.chain === "matic" && <Matic />}
            </SvgIcon>
          )}

          <Box
            sx={{
              position: "absolute",
              zIndex: 10,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "fontColor",
              backgroundColor: alpha(theme.palette.background.default, 0.8),
              opacity: 0,
              transition: "opacity 0.2s",
              cursor: "pointer",
              fontWeight: "bold",
              "&:hover": {
                opacity: 1,
              },
            }}
          >
            <Stack>
              <Typography textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                Estimated value
              </Typography>
              <Typography variant="h6" textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                {item.id === "unknown" || item.value === 0
                  ? "Unknown"
                  : `${(item.value as number).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${
                      currencySymbols[item.currency as keyof object]
                    }`}
              </Typography>
              {/* <Typography variant="body1" textAlign="center" sx={{ fontSize: fontSizes(layoutSize) }}>
                {item.value === 0
                  ? "Unknown"
                  : `${currency.symbol}${item.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </Typography> */}
            </Stack>
          </Box>
        </Box>
        {showInfo && (
          <CardContent sx={{ padding: { xs: 1 } }}>
            <Typography
              variant="h6"
              sx={{
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                width: "100%",
                overflow: "hidden",
                fontSize: fontSizes(layoutSize),
              }}
            >
              {item.name || "Unknown collection"}
            </Typography>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}

export function Client() {
  const filtered: any[] = []
  return <Items items={filtered} Component={Collection} />
}
