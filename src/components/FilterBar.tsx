"use client"
import { Search } from "@/components/Search"
import { Sort } from "@/components/Sort"
import { useRarity } from "@/context/rarity"
import { Box, FormControlLabel, Stack, Switch } from "@mui/material"
import { flatten } from "lodash"
import { SizeSlider } from "./SizeSlider"
import { SelfImprovement } from "@mui/icons-material"

const SORT_OPTIONS = {
  lastSale: [
    {
      label: "Last sale ⬇",
      value: "lastSale.asc",
    },
    {
      label: "Last sale ⬆",
      value: "lastSale.desc",
    },
  ],
  listed: [
    {
      label: "Listed ⬇",
      value: "listed.desc",
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
      value: "rankHrtt.asc",
    },
    {
      label: "Rarity ⬆",
      value: "rankHrtt.desc",
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
      label: "Est value ⬇",
      value: "value.desc",
    },
    {
      label: "Est value ⬆",
      value: "value.asc",
    },
  ],
  floor: [
    {
      label: "Floor price ⬇",
      value: "floor.desc",
    },
    {
      label: "Floor price ⬆",
      value: "floor.asc",
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
      <SizeSlider />
      <Sort options={options} />
    </Stack>
  )
}
