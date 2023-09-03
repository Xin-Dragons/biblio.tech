"use client"
import { Items } from "@/components/Items"
import { DigitalAsset } from "@/components/DigitalAsset"
import { useFiltered } from "@/context/filtered"
import { Stack } from "@mui/material"
import { FilterBar } from "@/components/FilterBar"

export default function wallet({ params }: { params: Record<string, string> }) {
  const filtered = useFiltered()
  return (
    <Stack spacing={2} height="100%" width="100%">
      <FilterBar sortOptions={["name"]} />
      <Items items={filtered} Component={DigitalAsset} />
    </Stack>
  )
}
