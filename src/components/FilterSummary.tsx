"use client"
import { useFilters } from "@/context/filters"
import { FilterAlt } from "@mui/icons-material"
import { Chip, Stack } from "@mui/material"

export function FilterSummary() {
  const { status, tokenStandards, selectedCollections } = useFilters()
  const filters = [...status, ...tokenStandards, ...selectedCollections]
  if (!filters.length) {
    return null
  }
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <FilterAlt />
      {filters.map((item) => (
        <Chip color="primary" label={item} onDelete={() => {}} />
      ))}
    </Stack>
  )
}
