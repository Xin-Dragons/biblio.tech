import { FilterBar } from "@/components/FilterBar"
import { SortProvider } from "@/context/sort"
import { Stack } from "@mui/material"
import { Client } from "./client"

export default function Collections() {
  return (
    <Stack spacing={2} height="100%" width="100%">
      <SortProvider defaultSort="value.desc">
        <FilterBar sortOptions={["value", "amount", "name"]} />
        <Client />
      </SortProvider>
    </Stack>
  )
}
