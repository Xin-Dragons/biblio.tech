import { ActivityProvider } from "@/context/activity"
import { FilterBar } from "../../../../components/FilterBar"
import { RarityProvider } from "@/context/rarity"
import { SortProvider } from "@/context/sort"
import { Client } from "./client"

export default async function Activity({ params }: { params: Record<string, string> }) {
  return (
    <RarityProvider>
      <SortProvider defaultSort="blocktime.desc">
        <ActivityProvider collectionId={params.collectionId}>
          <FilterBar sortOptions={["blocktime", "price"]} />
          <Client />
        </ActivityProvider>
      </SortProvider>
    </RarityProvider>
  )
}
