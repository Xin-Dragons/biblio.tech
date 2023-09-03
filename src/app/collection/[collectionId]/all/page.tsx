import { Stack } from "@mui/material"
import { DigitalAssetsProviders } from "../DigitalAssetsProviders"
import { Client } from "./client"
import { FilterBar } from "../../../../components/FilterBar"

export default function All({ params }: { params: Record<string, string> }) {
  return (
    <DigitalAssetsProviders defaultSort="name.asc" collectionId={params.collectionId}>
      <Stack spacing={1} height="100%">
        <FilterBar sortOptions={["name", "rarity"]} />
        <Client />
      </Stack>
    </DigitalAssetsProviders>
  )
}
