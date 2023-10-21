import NextLink from "next/link"
import { Box, Card, CardContent, Link, Stack, Typography } from "@mui/material"
import { Counter } from "../@sales/Counter"
import { ImageWithFallback } from "@/components/ImageWithFallback"

export function Sale({ sale }: { sale: any }) {
  return (
    <Link component={NextLink} href={`/digital-asset/${sale.digitalAsset.id}`} underline="none">
      <Card sx={{ width: 200, overflow: "unset" }}>
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            backgroundImage: "url(/books-lighter.svg)",
            backgroundSize: "100%",
            borderRadius: "4px",
          }}
        >
          <ImageWithFallback src={sale.digitalAsset.content?.links?.image} />
        </Box>

        <CardContent>
          <Stack direction="row">
            <Typography variant="h5" color="primary">
              ◎{sale.price.toLocaleString()}
            </Typography>
          </Stack>
          <Typography>
            <Counter from={sale.blockTime * 1000} />
          </Typography>
        </CardContent>
      </Card>
    </Link>
  )
}
