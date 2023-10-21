import { RarityProvider } from "@/context/rarity"
import { SortProvider } from "@/context/sort"
import { Client } from "./client"
import { FilterBar } from "@/components/FilterBar"

export default async function Activity({ params }: { params: Record<string, string> }) {
  return (
    <RarityProvider>
      <SortProvider defaultSort="blocktime.desc">
        <FilterBar sortOptions={["blocktime", "price"]} />
        <Client />
      </SortProvider>
    </RarityProvider>
  )
}
