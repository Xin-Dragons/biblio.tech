import { styled } from "@mui/material/styles"
import ClearIcon from "@mui/icons-material/Clear"
import { TextField, IconButton } from "@mui/material"
import { useFilters } from "../../context/filters"
import { useNfts } from "../../context/nfts.tsx"
import { FC } from "react"

// const StyledTextField = styled(TextField)(theme =>{
//   "& label": {
//     color: theme.palette.primary.main,
//   },
//   "& label.Mui-focused": {
//     color: theme.palette.primary.main,
//   },
//   "& .MuiInput-underline:after": {
//     borderBottomColor: theme.palette.primary.main,
//   },
//   "& .MuiOutlinedInput-root": {
//     "& fieldset": {
//       borderColor: theme.palette.primary.main,
//     },
//     "&:hover fieldset": {
//       borderColor: theme.palette.primary.main,
//       borderWidth: 2,
//     },
//     "&.Mui-focused fieldset": {
//       borderColor: theme.palette.primary.main,
//     },
//   },
// })

type SearchProps = {
  large?: boolean
}

export const Search: FC<SearchProps> = ({ large }) => {
  const { search, setSearch } = useFilters()

  return (
    <TextField
      label="Omnisearch"
      color="primary"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      InputProps={{
        endAdornment: (
          <IconButton sx={{ visibility: search ? "visible" : "hidden" }} onClick={() => setSearch("")}>
            <ClearIcon />
          </IconButton>
        ),
      }}
      fullWidth={large}
      size={large ? "medium" : "small"}
    />
  )
}
