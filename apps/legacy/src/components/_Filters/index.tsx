import {
  Accordion,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Typography,
} from "@mui/material"
import { Stack } from "@mui/system"
import { isArray, map, mergeWith, startCase, uniq } from "lodash"
import { FC, useEffect, useState } from "react"
import { useDatabase } from "../../context/database"
import { useLiveQuery } from "dexie-react-hooks"
import { useFilters } from "../../context/filters"
import { Nft } from "../../db"

type FiltersProps = {
  nfts: Nft[]
}

type FiltersObject = {
  [key: string]: string[]
}

export const Filters: FC<FiltersProps> = ({ nfts }) => {
  const { selectedFilters, setSelectedFilters } = useFilters()

  const [filters, setFilters] = useState<FiltersObject>({})

  useEffect(() => {
    const filters = nfts.reduce((all, nft) => {
      const atts = (nft.json?.attributes || []).reduce((allAtts, att) => {
        return {
          ...allAtts,
          [att.trait_type as keyof object]: [att.value],
        }
      }, {})
      return mergeWith(all, atts, (objVal, srcVal) => {
        if (isArray(objVal)) {
          return uniq(objVal.concat(srcVal))
        }
      })
    }, {})

    setFilters(filters)
  }, [nfts])

  const onFilterChange = (filter: string) => (e: any) => {
    const val = e.target.value
    setSelectedFilters({
      ...selectedFilters,
      [filter]: val,
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

  return (
    <Stack spacing={2}>
      <Button href="#" onClick={clearFilters} disabled={!activeFilters}>
        Clear all
      </Button>
      {map(filters, (items: string[], filter: string) => {
        return (
          <FormControl size="small">
            <InputLabel
              id="demo-multiple-checkbox-label"
              sx={{
                backgroundColor: "#111316",
                // backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05));",
                // paddingRight: 1
              }}
            >
              {filter}
            </InputLabel>
            <Select
              onClose={() => {
                setTimeout(() => {
                  ;(document.activeElement as HTMLElement).blur()
                }, 0)
              }}
              multiple
              value={selectedFilters[filter] || []}
              onChange={onFilterChange(filter)}
              input={<OutlinedInput label="Tag" />}
              renderValue={(selected) => selected.join(", ")}
              MenuProps={{
                disableScrollLock: true,
                PaperProps: {
                  style: {
                    maxHeight: 48 * 4.5 + 8,
                    // width: 250,
                  },
                },
              }}
            >
              {items.map((item: any) => (
                <MenuItem key={item} value={item}>
                  <Checkbox checked={selectedFilters[filter]?.indexOf(item) > -1} />
                  <ListItemText primary={item} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      })}
    </Stack>
  )
}
