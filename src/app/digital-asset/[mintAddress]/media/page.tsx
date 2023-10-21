import { umi } from "@/app/helpers/umi"
import { getDigitalAsset } from "@/helpers/digital-assets"
import { fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { Stack } from "@mui/material"

export default async function Media({ params }: { params: Record<string, string> }) {
  const da = await getDigitalAsset(params.mintAddress)
  let image = da.content.links.image

  if (!image) {
    const jsonMeta = await fetchJsonMetadata(umi, da.content.json_uri)
    image = jsonMeta.image
  }

  return (
    <Stack spacing={2} py={4}>
      <img src={image} />
    </Stack>
  )
}
