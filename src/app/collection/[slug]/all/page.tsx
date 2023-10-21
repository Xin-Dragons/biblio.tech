import { Stack } from "@mui/material"
import { DigitalAssetsProviders } from "../DigitalAssetsProviders"
import { Client } from "./client"
import { FilterBar } from "../../../../components/FilterBar"
import { getCollection } from "@/app/helpers/supabase"
import { fetchAllDigitalAssets } from "./fetch-all-digital-assets"
import { jsonify } from "@/helpers/utils"

export default async function All({ params }: { params: Record<string, string> }) {
  const collection = await getCollection(params.slug)
  const digitalAssets = await fetchAllDigitalAssets(collection)

  return (
    <DigitalAssetsProviders defaultSort="rankHrtt.asc">
      <Stack spacing={1} height="100%">
        <FilterBar sortOptions={["name", "rarity"]} />
        <Client digitalAssets={jsonify(digitalAssets)} collection={collection} />
      </Stack>
    </DigitalAssetsProviders>
  )
}
