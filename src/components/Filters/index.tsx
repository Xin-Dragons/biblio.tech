import { Accordion, Button, Checkbox, FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { isArray, map, mergeWith, startCase, uniq } from "lodash";
import { FC, useEffect, useState } from "react";
import { useDatabase } from "../../context/database";
import { useLiveQuery } from "dexie-react-hooks";
import { useFilters } from "../../context/filters";

export const Filters: FC = ({ nfts }) => {
  const { selectedFilters, setSelectedFilters } = useFilters()

  const [filters, setFilters] = useState({})
  
  useEffect(() => {
    const filters = nfts.reduce((all, nft) => {
      const atts = (nft.json?.attributes || []).reduce((allAtts, att) => {
        return {
          ...allAtts,
          [att.trait_type]: [att.value]
        }
      }, {});
      return mergeWith(all, atts, (objVal, srcVal) => {
        if (isArray(objVal)) {
          return uniq(objVal.concat(srcVal));
        }
      })
    }, {});

    setFilters(filters)
  }, [nfts])


  const onFilterChange = (filter: string) => (e) => {
    const val = e.target.value;
    setSelectedFilters({
      ...selectedFilters,
      [filter]: val
    })
  }

  const activeFilters = !!Object.keys(selectedFilters).find(key => {
    const filters = selectedFilters[key];
    return filters.length
  })

  function clearFilters(e) {
    e.preventDefault();
    setSelectedFilters({})
  }

  return (
    <Stack spacing={2}>
      <Button href="#" onClick={clearFilters} disabled={!activeFilters}>Clear all</Button>
      {
        map(filters, (items, filter) => {
          return (
            <FormControl size="small">
              <InputLabel id="demo-multiple-checkbox-label" sx={{
                backgroundColor: "#111316",
                // backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05));",
                // paddingRight: 1
              }}>{filter}</InputLabel>
              <Select
                onClose={() => {
                  setTimeout(() => {
                    (document.activeElement as HTMLElement).blur();
                  }, 0);
                }}
                multiple
                value={selectedFilters[filter] || []}
                onChange={onFilterChange(filter)}
                input={<OutlinedInput label="Tag" />}
                renderValue={(selected) => selected.join(', ')}
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
                {items.map((item) => (
                  <MenuItem key={item} value={item}>
                    <Checkbox checked={selectedFilters[filter]?.indexOf(item) > -1} />
                    <ListItemText primary={item} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) 
        })
      }
    </Stack>
  )
}