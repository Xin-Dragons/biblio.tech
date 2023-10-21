import { Cancel } from "@mui/icons-material"
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Theme,
  useTheme,
} from "@mui/material"

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8

type Option = {
  label: string
  value: any
}

function getStyles(name: string, personName: readonly string[], theme: Theme) {
  return {
    fontWeight:
      personName.indexOf(name) === -1 ? theme.typography.fontWeightRegular : theme.typography.fontWeightMedium,
  }
}

export function MultipleSelectChip({
  label,
  options,
  value,
  setValue,
}: {
  label: string
  value: any[]
  setValue: Function
  options: Option[]
}) {
  const theme = useTheme()

  const handleChange = (event: SelectChangeEvent<typeof value>) => {
    const {
      target: { value: targetValue },
    } = event
    console.log(targetValue)
    setValue(
      // On autofill we get a stringified value.
      typeof targetValue === "string" ? targetValue.split(",") : targetValue
    )
  }

  return (
    <div>
      <FormControl fullWidth>
        <InputLabel id="demo-multiple-chip-label">{label}</InputLabel>
        <Select
          labelId="demo-multiple-chip-label"
          id="demo-multiple-chip"
          multiple
          value={value}
          onChange={handleChange}
          input={<OutlinedInput id="select-multiple-chip" label={label} />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((val) => (
                <Chip
                  key={val}
                  color="primary"
                  label={options.find((opt) => opt.value === val)?.label}
                  deleteIcon={<Cancel onMouseDown={(event) => event.stopPropagation()} />}
                  onDelete={(e) => {
                    setValue(value.filter((v) => v !== val))
                  }}
                  size="small"
                />
              ))}
            </Box>
          )}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
                // width: 250,
              },
            },
          }}
        >
          {options.map((option, index) => (
            <MenuItem key={index} value={option.value} style={getStyles(option.value, value, theme)}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}
