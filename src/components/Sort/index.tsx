import { FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { FC, useState } from "react"
import { useUiSettings } from "../../context/ui-settings"
import { useSort } from "@/context/sort"
import { debounce } from "lodash"

type SortProps = {
  large?: boolean
  options: {
    label: string
    value: string
  }[]
}

export const Sort: FC<SortProps> = ({ large, options }) => {
  const { sort, setSort } = useSort()
  const [value, setValue] = useState(sort)

  const debounceChange = (value: string) => {
    const debounced = debounce(() => {
      setSort(value)
    }, 1)

    setValue(value)
    debounced()
  }

  return (
    <FormControl size={large ? "medium" : "small"} sx={{ width: { sm: "150px", xs: "default" } }}>
      <InputLabel id="sort-label">Sort</InputLabel>
      <Select
        labelId="sort-label"
        id="sort"
        value={value}
        label="Age"
        onChange={(e) => debounceChange(e.target.value)}
        sx={{ height: large ? "56px" : "inherit" }}
        fullWidth
      >
        {options.map((item, index) => (
          <MenuItem key={index} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
