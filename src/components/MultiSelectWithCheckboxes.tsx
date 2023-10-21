import {
  Avatar,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material"
import { map } from "lodash"

export function MultiSelectWithCheckboxes({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: any[]
  onChange: Function
  options: { label: string; value: any }[]
}) {
  return (
    <FormControl size="small">
      <InputLabel
        id="demo-multiple-checkbox-label"
        sx={{
          backgroundColor: "#111316",
          // backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05));",
          // paddingRight: 1
        }}
      >
        {label}
      </InputLabel>
      <Select
        onClose={() => {
          setTimeout(() => {
            ;(document.activeElement as HTMLElement).blur()
          }, 0)
        }}
        multiple
        value={value}
        onChange={(e) => onChange(e)}
        input={<OutlinedInput label="Tag" />}
        renderValue={(selected) => selected.map((item) => options.find((opt) => opt.value === item)?.label).join(", ")}
        MenuProps={{
          disableScrollLock: true,
          PaperProps: {
            style: {
              maxHeight: 48 * 4.5 + 8,
              // width: 250,
            },
          },
        }}
      >
        {options.map((option, index: number) => (
          <MenuItem key={index} value={option.value}>
            <Checkbox checked={value.includes(option.value)} />
            <ListItemText primary={option.label} secondary={option.secondary} />
            {option.image && <Avatar src={`https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${option.image}`} />}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
