"use client"
import ClearIcon from "@mui/icons-material/Clear"
import { TextField, IconButton } from "@mui/material"
import { useFilters } from "../../context/filters"
import { FC, useState } from "react"
import { debounce } from "lodash"
import { Filter, Filter1, FilterAlt } from "@mui/icons-material"

type SearchProps = {
  large?: boolean
  fullWidth?: boolean
}

export const Search: FC<SearchProps> = ({ large, fullWidth }) => {
  const [value, setValue] = useState("")
  const { setSearch } = useFilters()

  const debounceChange = (value: string) => {
    const debounced = debounce(() => {
      setSearch(value)
    }, 1)

    setValue(value)
    debounced()
  }

  return (
    <TextField
      sx={{
        minWidth: "300px",
        "& .MuiFormLabel-root": {
          display: "flex",
          alignItems: "center",
          "& .myIcon": {
            paddingRight: "4px",
            order: 0,
          },
        },
      }}
      label={
        <>
          <FilterAlt className="myIcon" />
          Omnifilter
        </>
      }
      color="primary"
      value={value}
      onChange={(e) => debounceChange(e.target.value)}
      InputProps={{
        endAdornment: (
          <IconButton sx={{ visibility: value ? "visible" : "hidden" }} onClick={() => debounceChange("")}>
            <ClearIcon />
          </IconButton>
        ),
      }}
      fullWidth={fullWidth || large}
      size={large ? "medium" : "small"}
    />
  )
}
