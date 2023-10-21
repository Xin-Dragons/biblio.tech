import { TypeFilter } from "@/components/TypeFilter"
import { FilterAlt } from "@mui/icons-material"
import { Stack, Typography } from "@mui/material"

export default function All() {
  return (
    <Stack>
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
        <FilterAlt />
        <Typography variant="h5" color="primary" textTransform="uppercase" textAlign="center">
          Filter
        </Typography>
      </Stack>
      <TypeFilter />
    </Stack>
  )
}
