import { useNfts } from "@/context/nfts"
import { useSelection } from "@/context/selection"
import { Button, Slider, Stack } from "@mui/material"
import { uniq } from "lodash"
import { useDigitalAssets } from "../context/digital-assets"

export function SelectControls({ max }: { max?: number }) {
  const { filtered } = useDigitalAssets()
  const { selected, selectAll, deselectAll, setSelected } = useSelection()

  function handleSelectionChange(value: number) {
    setSelected(filtered.slice(0, value).map((item) => item.id))
  }

  function selectMax() {
    if (max) {
      handleSelectionChange(Math.min(max, filtered.length))
    } else {
      selectAll()
    }
  }

  const allSelected = selected.length >= (max ? Math.min(max, filtered.length) : filtered.length)

  return (
    <Stack direction="row" alignItems="center">
      <Button
        onClick={() => deselectAll()}
        disabled={!filtered.length || !selected.length}
        size="small"
        variant="outlined"
        sx={{ whiteSpace: "nowrap", overflow: "hidden" }}
      >
        Deselect all
      </Button>
      <Slider
        aria-label="Selection"
        value={selected.length}
        onChange={(e, value) => handleSelectionChange(value as number)}
        max={max ? Math.min(max, filtered.length) : filtered.length}
      />
      <Button
        onClick={selectMax}
        disabled={!filtered.length || allSelected}
        size="small"
        variant="outlined"
        sx={{ whiteSpace: "nowrap" }}
      >
        Select {max ? "max" : "all"}
      </Button>
    </Stack>
  )
}
