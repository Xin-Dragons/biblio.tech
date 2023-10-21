import { getDigitalAsset } from "@/helpers/digital-assets"
import { Stack, Typography } from "@mui/material"

export default async function DAS({ params }: { params: Record<string, string> }) {
  const digitalAsset = await getDigitalAsset(params.mintAddress)

  return (
    <Stack py={4}>
      <Typography variant="h4">DAS - Digital Asset Standard</Typography>
      <pre style={{ width: "100%", overflow: "hidden", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
        {JSON.stringify(digitalAsset, null, 2)}
      </pre>
    </Stack>
  )
}
