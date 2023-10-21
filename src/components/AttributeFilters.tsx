"use client"
import { Button, Checkbox, FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Select } from "@mui/material"
import { Stack } from "@mui/system"
import { isArray, map, mergeWith, uniq } from "lodash"
import { FC, useEffect, useState } from "react"
import { useFilters } from "../context/filters"
import { usePathname } from "next/navigation"
import { useDigitalAssets } from "@/context/digital-assets"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { MultiSelectWithCheckboxes } from "./MultiSelectWithCheckboxes"
import { AutocompleteCheckboxes } from "./AutocompleteCheckboxes"

export function AttributeFilters({ attributes }: { attributes: any }) {
  const { selectedFilters, setSelectedFilters } = useFilters()

  const onFilterChange = (filter: string) => (value: any[]) => {
    setSelectedFilters({
      ...selectedFilters,
      [filter]: value,
    })
  }

  const activeFilters = !!Object.keys(selectedFilters).find((key) => {
    const filters = selectedFilters[key]
    return filters.length
  })

  function clearFilters(e: any) {
    e.preventDefault()
    setSelectedFilters({})
  }

  console.log(attributes)

  return (
    <Stack spacing={2}>
      <Button href="#" onClick={clearFilters} disabled={!activeFilters}>
        Clear all
      </Button>
      {map(JSON.parse(attributes), (items: object, filter: string) => {
        return (
          <AutocompleteCheckboxes
            label={filter}
            value={selectedFilters[filter] || []}
            setValue={onFilterChange(filter)}
            options={map(items, (_, name) => {
              return {
                label: name,
                value: name,
              }
            })}
          />
        )
      })}
    </Stack>
  )
}
