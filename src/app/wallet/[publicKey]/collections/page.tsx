import { DigitalAsset } from "@/components/DigitalAsset"
import { FilterBar } from "@/components/FilterBar"
import { Items } from "@/components/Items"
import { useDigitalAssets } from "@/context/digital-assets"
import { SortProvider } from "@/context/sort"
import { Stack } from "@mui/material"
import { useParams } from "next/navigation"
import { Client } from "./client"
import { CollectionsProvider } from "@/context/collections"

export default function Collections() {
  return (
    <Stack spacing={2} height="100%" width="100%">
      <SortProvider defaultSort="value.desc">
        <CollectionsProvider>
          <FilterBar sortOptions={["value", "amount", "name"]} />
          <Client />
        </CollectionsProvider>
      </SortProvider>
    </Stack>
  )
}
