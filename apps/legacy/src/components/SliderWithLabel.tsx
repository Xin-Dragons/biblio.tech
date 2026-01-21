import { Info } from "@mui/icons-material"
import { Stack, Typography, Slider, Tooltip } from "@mui/material"

export function SliderWithLabel({
  min,
  max,
  label,
  labelRight,
  tooltip,
  unit,
  value,
  onChange,
  disabled,
}: {
  min: number
  max: number
  label?: string
  labelRight?: string
  tooltip?: string
  unit?: string
  value: number
  onChange: (val: number) => void
  disabled?: boolean
}) {
  return (
    <Stack>
      <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography gutterBottom fontWeight="bold">
            {label}
          </Typography>
          {tooltip && (
            <Tooltip title={tooltip} color="primary" sx={{ cursor: "help" }}>
              <Info />
            </Tooltip>
          )}
        </Stack>
        <Typography fontWeight="bold" fontStyle="italic">
          {labelRight}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center">
        <Slider value={value} onChange={(e, val) => onChange(val as number)} min={min} max={max} disabled={disabled} />
        <Typography color="primary" sx={{ whiteSpace: "nowrap" }} fontWeight="bold" fontSize="1.5em">
          {value} {unit}
        </Typography>
      </Stack>
    </Stack>
  )
}
