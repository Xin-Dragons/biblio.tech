"use client"
import { useUiSettings } from "@/context/ui-settings"
import { Card, CardContent, Stack, SvgIcon, Typography, Link as MuiLink } from "@mui/material"
import Link from "next/link"
import { ImageWithFallback } from "./ImageWithFallback"
import { fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { useEffect, useState } from "react"
import { lamportsToSol } from "@/helpers/utils"
import Tensor from "@/../public/tensor.svg"
import Solana from "@/../public/solana.svg"
import { useSelection } from "@/context/selection"
import { Rarity } from "./Rarity"

const margins = {
  small: 0.5,
  medium: 0.75,
  large: 1,
  collage: 5,
}

export function ListingAsset({ item }: { item: any }) {
  const { selected, select } = useSelection()
  const { layoutSize } = useUiSettings()
  const [image, setImage] = useState(item.content.links.image)
  const { easySelect } = useUiSettings()

  async function getImage() {
    const image = (await fetchJsonMetadata(umi, item.content.json_uri)).image
    setImage(image)
  }

  useEffect(() => {
    if (!item.content.links.image) {
      getImage()
    } else {
      setImage(item.content.links.image)
    }
  }, [item])

  const price = item.listing.price / Math.pow(10, 9)

  return (
    <MuiLink component={Link} href={`/digital-asset/${item.id}`} underline="none">
      <Card
        sx={{
          margin: margins[layoutSize as keyof typeof margins],
          outline: selected.includes(item.id) ? "3px solid white" : "none",
          outlineOffset: "-3px",
          cursor: easySelect ? "copy" : "pointer",
        }}
        onClick={(e) => {
          if (easySelect) {
            e.preventDefault()
            select(item.id)
          }
        }}
      >
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
            <Stack spacing={1} alignItems="center" direction="row" justifyContent="space-between">
              {item.listing.marketplace === "MEv2" && <img src="/me.png" width={30} />}
              {item.listing.marketplace === "TensorSwap" && (
                <SvgIcon>
                  <Tensor />
                </SvgIcon>
              )}
              <Stack direction="row" alignItems="center">
                <SvgIcon sx={{ color: "transparent" }}>
                  <Solana />
                </SvgIcon>
                <Typography variant="h5" color="primary">
                  {price < 1
                    ? price.toLocaleString(undefined, { minimumSignificantDigits: 4 })
                    : price.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </MuiLink>
  )
}
