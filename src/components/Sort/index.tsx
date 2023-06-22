import { FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { FC } from "react"
import { useUiSettings } from "../../context/ui-settings"
import { useSort } from "../../context/sort"

type SortProps = {
  large?: boolean
}

export const Sort: FC<SortProps> = ({ large }) => {
  const { sort, setSort } = useUiSettings()
  const { sortOptions } = useSort()
  return (
    <FormControl size={large ? "medium" : "small"} sx={{ width: { sm: "150px", xs: "default" } }}>
      <InputLabel id="demo-simple-select-label">Sort</InputLabel>
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={sort}
        label="Age"
        onChange={(e) => setSort(e.target.value)}
        sx={{ height: large ? "56px" : "inherit" }}
        fullWidth
      >
        {sortOptions.map((item, index) => (
          <MenuItem key={index} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
