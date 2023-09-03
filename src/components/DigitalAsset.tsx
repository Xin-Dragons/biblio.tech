"use client"
import { useUiSettings } from "@/context/ui-settings"
import { Card, CardContent, Stack, SvgIcon, Typography, Link as MuiLink, Chip, alpha, Box } from "@mui/material"
import Link from "next/link"
import { ImageWithFallback } from "./ImageWithFallback"
import { fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { FC, useEffect, useState } from "react"
import { publicKey } from "@metaplex-foundation/umi"
import { Rarity } from "./Rarity"
import { usePathname } from "next/navigation"
import { useTheme } from "@/context/theme"

const margins = {
  small: 0.5,
  medium: 0.75,
  large: 1,
  collage: 5,
}

export function DigitalAsset({ item, basePath, Overlay }: { item: any; basePath?: string; Overlay?: FC<any> }) {
  const path = usePathname()
  const theme = useTheme()
  const { layoutSize } = useUiSettings()
  const [image, setImage] = useState(item.content.links.image)

  async function getImage() {
    try {
      const image = (await fetchJsonMetadata(umi, item.content.json_uri)).image
      setImage(image)
    } catch (err) {
      try {
        const da = await fetchDigitalAsset(umi, publicKey(item.id))
        const image = (await fetchJsonMetadata(umi, da.metadata.uri)).image
        setImage(image)
      } catch {}
    }
  }

  useEffect(() => {
    if (!item.content.links.image) {
      getImage()
    } else {
      setImage(item.content.links.image)
    }
  }, [item])

  return (
    <MuiLink component={Link} href={`${basePath || "/digital-asset"}/${item.id}`} underline="none">
      <Card
        sx={{
          margin: margins[layoutSize as keyof typeof margins],
          position: "relative",
          "&:hover": {
            ".MuiBox-root": {
              opacity: 1,
            },
          },
        }}
      >
        {Overlay && (
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.background.default, 0.8),
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              opacity: 0,
            }}
          >
            <Overlay item={item} />
          </Box>
        )}
        {item.digitalAssets && (
          <Chip
            label={item.digitalAssets.length}
            sx={{ position: "absolute", top: "0.5em", right: "0.5em", backgroundColor: "#333" }}
          />
        )}
        <ImageWithFallback src={image} />
        <CardContent sx={{ position: "relative" }}>
          {item.rarity && (
            <Stack
              sx={{
                position: "absolute",
                top: "-15px",
                width: "calc(100% - 1em)",
                right: "0.5em",
              }}
              direction={"row"}
              justifyContent={"space-between"}
              alignItems={"center"}
              spacing={1}
            >
              <Rarity type="howRare" rank={item.rarity.rank} tier={item.rarity.tier!} />
            </Stack>
          )}
          <Stack spacing={2}>
            <Typography
              textTransform="uppercase"
              fontWeight="bold"
              sx={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}
            >
              {item.content.metadata.name || "Unnamed item"}
            </Typography>
            {/* <Stack spacing={1} alignItems="center" direction="row" justifyContent="space-between">
              {item.marketplace === "MEv2" && <img src="/me.png" width={30} />}
              {item.marketplace === "TensorSwap" && (
                <SvgIcon>
                  <Tensor />
                </SvgIcon>
              )}
              <Stack direction="row" alignItems="center">
                <SvgIcon sx={{ color: "transparent" }}>
                  <Solana />
                </SvgIcon>
                <Typography variant="h5" color="primary">
                  {lamportsToSol(item.price)}
                </Typography>
              </Stack>
            </Stack> */}
          </Stack>
        </CardContent>
      </Card>
    </MuiLink>
  )
}
