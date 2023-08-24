import { Box, Card, CardContent, Typography } from "@mui/material"
import { DigitalAssetView } from "./DigitalAsset"
import { getDigitalAsset } from "@/helpers/digital-assets"

export default async function DigitalAssetPage({ params: { mintAddress } }: { params: { mintAddress: string } }) {
  const digitalAsset = await getDigitalAsset(mintAddress)

  return (
    <Box p={4} pl={2}>
      <Card>
        <CardContent>
          {digitalAsset ? <DigitalAssetView digitalAsset={digitalAsset} /> : <Typography>Nothing found</Typography>}
        </CardContent>
      </Card>
    </Box>
  )
}
