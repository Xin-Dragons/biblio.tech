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

const margins = {
  small: 0.5,
  medium: 0.75,
  large: 1,
  collage: 5,
}

export function Listing({ item }: { item: any }) {
  const { selected, select } = useSelection()
  const { layoutSize } = useUiSettings()
  const [image, setImage] = useState(item.content.links.image)

  async function getImage() {
    const image = (await fetchJsonMetadata(umi, item.content.json_uri)).image
    setImage(image)
  }

  useEffect(() => {
    if (!item.content.links.image) {
      getImage()
    }
  }, [item])

  return (
    <MuiLink component={Link} href={`/digital-asset/${item.id}`} underline="none">
      <Card
        sx={{
          margin: margins[layoutSize as keyof typeof margins],
          outline: selected.includes(item.id) ? "3px solid white" : "none",
          outlineOffset: "-3px",
        }}
        onClick={(e) => {
          e.preventDefault()
          select(item.id)
        }}
      >
        <ImageWithFallback src={image} />
        <CardContent>
          <Stack spacing={2}>
            <Typography
              textTransform="uppercase"
              fontWeight="bold"
              sx={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}
            >
              {item.content.metadata.name}
            </Typography>
            <Stack spacing={1} alignItems="center" direction="row" justifyContent="space-between">
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
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </MuiLink>
  )
}
