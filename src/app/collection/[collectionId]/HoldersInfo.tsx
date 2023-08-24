"use client"
import { useDigitalAssets } from "@/context/digital-assets"
import { bigNumberFormatter } from "@/helpers/utils"
import { Stack, Typography } from "@mui/material"
import { uniq } from "lodash"

export function HoldersInfo() {
  const { digitalAssets } = useDigitalAssets()
  return (
    <Stack direction="row" spacing={2}>
      <Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography color="primary" variant="h5">
            {bigNumberFormatter.format(uniq(digitalAssets.map((da) => da.ownership.owner)).length)}
          </Typography>
        </Stack>
        <Typography variant="body2">HOLDERS</Typography>
      </Stack>
      <Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography color="primary" variant="h5">
            {bigNumberFormatter.format(digitalAssets.length)}
          </Typography>
        </Stack>
        <Typography variant="body2">SUPPLY</Typography>
      </Stack>
    </Stack>
  )
}
