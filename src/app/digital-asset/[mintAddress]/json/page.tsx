import { umi } from "@/app/helpers/umi"
import { getDigitalAsset } from "@/helpers/digital-assets"
import { fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { Link, Stack, Typography } from "@mui/material"

export default async function Page({ params }: { params: Record<string, string> }) {
  const digitalAsset = await getDigitalAsset(params.mintAddress)
  const jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.content.json_uri)
  return (
    <Stack py={4}>
      <Link href={digitalAsset.content.json_uri} target="_blank" rel="noreferrer">
        <Typography>{digitalAsset.content.json_uri}</Typography>
      </Link>
      <pre style={{ width: "100%", overflow: "hidden", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {JSON.stringify(jsonMetadata, null, 2)}
      </pre>
    </Stack>
  )
}
