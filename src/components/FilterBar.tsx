"use client"
import { Search } from "@/components/Search"
import { Sort } from "@/components/Sort"
import { useRarity } from "@/context/rarity"
import { Box, Stack } from "@mui/material"
import { flatten } from "lodash"

const SORT_OPTIONS = {
  name: [
    {
      label: "Name ⬇",
      value: "name.asc",
    },
    {
      label: "Name ⬆",
      value: "name.desc",
    },
  ],
  rarity: [
    {
      label: "Rarity ⬇",
      value: "rarity.asc",
    },
    {
      label: "Rarity ⬆",
      value: "rarity.desc",
    },
  ],
  price: [
    {
      label: "Price ⬇",
      value: "price.asc",
    },
    {
      label: "Price ⬆",
      value: "price.desc",
    },
  ],
  blocktime: [
    {
      label: "Most recent",
      value: "blocktime.desc",
    },
    {
      label: "Oldest",
      value: "blocktime.asc",
    },
  ],
  amount: [
    {
      label: "Number held ⬇",
      value: "amount.desc",
    },
    {
      label: "Number held ⬆",
      value: "amount.asc",
    },
  ],
  value: [
    {
      label: "Value ⬇",
      value: "value.desc",
    },
    {
      label: "Value ⬆",
      value: "value.asc",
    },
  ],
}

export function FilterBar({ sortOptions }: { sortOptions: string[] }) {
  const options = flatten(sortOptions.map((opt) => SORT_OPTIONS[opt as keyof typeof SORT_OPTIONS]))
  return (
    <Stack direction="row" spacing={2}>
      <Box flexGrow={1}>
        <Search fullWidth />
      </Box>
      <Sort options={options} />
    </Stack>
  )
}
