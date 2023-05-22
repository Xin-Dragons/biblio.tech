import { styled } from "@mui/material/styles"
import ClearIcon from "@mui/icons-material/Clear"
import { TextField, IconButton } from "@mui/material"
import { useFilters } from "../../context/filters"
import { useNfts } from "../../context/nfts"

const StyledTextField = styled(TextField)({
  "& label": {
    color: "#6cbec9",
  },
  "& label.Mui-focused": {
    color: "#6cbec9",
  },
  "& .MuiInput-underline:after": {
    borderBottomColor: "#6cbec9",
  },
  "& .MuiOutlinedInput-root": {
    "& fieldset": {
      borderColor: "#6cbec9",
    },
    "&:hover fieldset": {
      borderColor: "#6cbec9",
      borderWidth: 2,
    },
    "&.Mui-focused fieldset": {
      borderColor: "#6cbec9",
    },
  },
})

export const Search = () => {
  const { search, setSearch } = useFilters()
  const { nfts } = useNfts()
  const complete = nfts.filter((n) => n.jsonLoaded)
  const missingMeta = complete.length < nfts.length

  return (
    <StyledTextField
      label="Filter by anything"
      color="primary"
      helperText={missingMeta && `Filtering by meta for ${complete.length} items`}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      InputProps={{
        endAdornment: (
          <IconButton sx={{ visibility: search ? "visible" : "hidden" }} onClick={() => setSearch("")}>
            <ClearIcon />
          </IconButton>
        ),
      }}
      size="small"
    />
  )
}
