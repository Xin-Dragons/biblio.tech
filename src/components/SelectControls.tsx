import { useNfts } from "@/context/nfts"
import { useSelection } from "@/context/selection"
import { Button } from "@mui/material"
import { uniq } from "lodash"

export function SelectControls() {
  const { filtered } = useNfts()
  const { selected, allSelected, selectAll, deselectAll } = useSelection()

  return (
    <>
      <Button onClick={() => selectAll()} disabled={!filtered.length || allSelected} size="small" variant="outlined">
        Select all
      </Button>
      <Button
        onClick={() => deselectAll()}
        disabled={!filtered.length || !selected.length}
        size="small"
        variant="outlined"
      >
        Deselect all
      </Button>
    </>
  )
}
