import { DigitalAssetsProvider } from "@/context/digital-assets"
import { shorten } from "@/helpers/utils"
import { Stack, Typography } from "@mui/material"
import { ReactNode } from "react"

export default function layout({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  return (
    <DigitalAssetsProvider wallet={params.publicKey}>
      <Stack>
        <Typography variant="h4">{shorten(params.publicKey)}</Typography>
        {children}
      </Stack>
    </DigitalAssetsProvider>
  )
}
