"use client"
import { Stack } from "@mui/material"
import { FilterBar } from "../../../../components/FilterBar"
import { Items } from "@/components/Items"
import { ListingActions } from "./ListingActions"
import { useFiltered } from "@/context/filtered"
import { ListingAsset } from "@/components/ListingAsset"

export function Client() {
  const listings = useFiltered()

  return (
    <Stack height="100%" spacing={1}>
      <FilterBar sortOptions={["price", "rarity", "blocktime"]} />
      <Items items={listings} Component={ListingAsset} />
      <ListingActions listings={listings} />
    </Stack>
  )
}
