import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material"
import { Autocomplete, Avatar, Box, Checkbox, Popper, TextField, createFilterOptions } from "@mui/material"

const icon = <CheckBoxOutlineBlank />
const checkedIcon = <CheckBox />

type Option = {
  label: string
  value: any
  image?: string
}

export function AutocompleteCheckboxes({
  options,
  label,
  placeholder,
  value,
  setValue,
}: {
  options: Option[]
  label: string
  placeholder?: string
  value: any[]
  setValue: Function
}) {
  function onChange(e: any, newValue: Option[]) {
    setValue(newValue.map((n) => n.value))
  }
  return (
    <Autocomplete
      multiple
      fullWidth
      options={options}
      onChange={onChange}
      value={options.filter((opt) => value.includes(opt.value))}
      disableCloseOnSelect
      filterOptions={(a, b) => {
        const filtered = a.filter((opt) => opt.label.toLowerCase().includes(b.inputValue.toLowerCase()))
        return filtered
      }}
      ChipProps={{
        color: "primary",
      }}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
          {option.label}
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  )
}
