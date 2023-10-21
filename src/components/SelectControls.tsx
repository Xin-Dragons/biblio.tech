import { useSelection } from "@/context/selection"
import { Box, Button, IconButton, Slider, Stack, TextField } from "@mui/material"
import { AdsClick } from "@mui/icons-material"
import { useUiSettings } from "@/context/ui-settings"

export function SelectControls({ max, items }: { max?: number; items: any[] }) {
  const { selected, deselectAll, setSelected } = useSelection()
  const { easySelect, setEasySelect } = useUiSettings()

  function handleSelectionChange(value: number) {
    setSelected(items.slice(0, value).map((item) => item.id))
  }

  function selectMax() {
    if (max) {
      handleSelectionChange(Math.min(max, items.length))
    } else {
      handleSelectionChange(items.length)
    }
  }

  const allSelected = selected.length >= (max ? Math.min(max, items.length) : items.length)

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Box>
        <Button
          onClick={() => deselectAll()}
          disabled={!items.length || !selected.length}
          size="small"
          variant="outlined"
          sx={{ whiteSpace: "nowrap", overflow: "hidden" }}
        >
          Deselect all
        </Button>
      </Box>
      <Slider
        aria-label="Selection"
        value={selected.length}
        onChange={(e, value) => handleSelectionChange(value as number)}
        max={max ? Math.min(max, items.length) : items.length}
        sx={{ minWidth: "100px" }}
      />
      <Box>
        <Button
          onClick={selectMax}
          disabled={!items.length || allSelected}
          size="small"
          variant="outlined"
          sx={{ whiteSpace: "nowrap" }}
        >
          Select {max ? "max" : "all"}
        </Button>
      </Box>
      <Box>
        <TextField
          size="small"
          value={selected.length}
          onChange={(e) => handleSelectionChange(Number(e.target.value))}
          inputProps={{
            max: max ? Math.min(max, items.length) : items.length,
          }}
        />
      </Box>
      <IconButton color={easySelect ? "primary" : "default"} onClick={() => setEasySelect(!easySelect)}>
        <AdsClick />
      </IconButton>
    </Stack>
  )
}
