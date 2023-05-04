import ClearIcon from "@mui/icons-material/Clear"
import { TextField, IconButton } from "@mui/material"
import { useFilters } from "../../context/filters"

export const Search = () => {
  const {search, setSearch} = useFilters();
  return (
    <TextField
      label="Search for anything"
      value={search}
      onChange={e => setSearch(e.target.value)}
      InputProps={{
        endAdornment: <IconButton sx={{visibility: search ? "visible": "hidden"}} onClick={() => setSearch("")}><ClearIcon/></IconButton>
      }}
      fullWidth
    />
  )
}