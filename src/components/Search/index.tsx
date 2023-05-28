import { styled } from "@mui/material/styles"
import ClearIcon from "@mui/icons-material/Clear"
import { TextField, IconButton } from "@mui/material"
import { useFilters } from "../../context/filters"
import { useNfts } from "../../context/nfts"
import { FC } from "react"

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

type SearchProps = {
  large?: boolean
}

export const Search: FC<SearchProps> = ({ large }) => {
  const { search, setSearch } = useFilters()

  return (
    <StyledTextField
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
