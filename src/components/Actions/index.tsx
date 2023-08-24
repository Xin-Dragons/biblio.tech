import {
  Stack,
  Button,
  Tooltip,
  IconButton,
  Typography,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  useMediaQuery,
  Drawer,
  CardContent,
  Slider,
} from "@mui/material"
import { FC, useState } from "react"
import { TagList } from "../TagList"
import { Close, Label, Sell } from "@mui/icons-material"
import { useAccess } from "../../context/access"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { Vault } from "../Vault"
import { SelectControls } from "../SelectControls"
import { BulkSend } from "../BulkSend"
import { Burn } from "../Burn"
import { ListDelist } from "../ListDelist"

export const Actions: FC = () => {
  const { filtered } = useNfts()
  const { isInScope, isAdmin, isBasic } = useAccess()
  const { selected, setSelected, allSelected, selectAll, deselectAll } = useSelection()

  const [tagMenuOpen, setTagMenuOpen] = useState<boolean>(false)
  const [actionDrawerShowing, setActionDrawerShowing] = useState(false)

  const showMinMenu = useMediaQuery("(max-width:1050px)")

  function toggleTagMenuOpen() {
    setTagMenuOpen(!tagMenuOpen)
  }

  function toggleActionDrawer() {
    setActionDrawerShowing(!actionDrawerShowing)
  }

  function handleSelectionChange(value: number) {
    setSelected(filtered.slice(0, value).map((item) => item.nftMint))
  }

  const isDisabled = isInScope && !isAdmin && !isBasic

  return (
    <Stack spacing={2}>
      <Stack spacing={1} direction="row" alignItems="center" sx={{ maxWidth: "100%", overflow: "hidden" }}>
        <>
          {!showMinMenu ? (
            <>
              <SelectControls />
              <BulkSend />
              <Burn />
              <ListDelist />
              <Tooltip title="Toggle tag menu">
                <span>
                  <IconButton onClick={toggleTagMenuOpen} color="secondary" disabled={!selected.length || isDisabled}>
                    <Label />
                  </IconButton>
                </span>
              </Tooltip>
              {!!selected.length && <Typography fontWeight="bold">{selected.length} Selected</Typography>}
            </>
          ) : (
            <Button variant="outlined" onClick={toggleActionDrawer} disabled={isDisabled}>
              Actions
            </Button>
          )}
        </>
        <Dialog open={tagMenuOpen} onClose={toggleTagMenuOpen}>
          <Card>
            <DialogTitle>Tag items</DialogTitle>
            <DialogContent>
              <TagList edit />
            </DialogContent>
          </Card>
        </Dialog>

        <Drawer open={actionDrawerShowing} onClose={toggleActionDrawer} anchor="bottom">
          <Card sx={{ minHeight: "50vh", overflowY: "auto" }}>
            <IconButton sx={{ position: "absolute", top: "0.5em", right: "0.5em" }} onClick={toggleActionDrawer}>
              <Close />
            </IconButton>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5">Selection</Typography>
                <Stack>
                  <Slider
                    aria-label="Selection"
                    value={selected.length}
                    onChange={(e, value) => handleSelectionChange(value as number)}
                    max={filtered.length}
                  />
                  <Typography textAlign="right">{selected.length} selected</Typography>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Button
                    onClick={() => selectAll}
                    disabled={!filtered.length || allSelected}
                    fullWidth
                    variant="outlined"
                  >
                    Select all
                  </Button>
                  <Button
                    onClick={() => deselectAll}
                    disabled={!filtered.length || !selected.length}
                    fullWidth
                    variant="outlined"
                  >
                    Deselect all
                  </Button>
                </Stack>
                <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                  Actions
                </Typography>
                <Stack direction={{ sm: "row", xs: "column" }} spacing={2} width="100%" sx={{ width: "100%" }}>
                  <BulkSend small />
                  <Burn small />
                  <Vault small />
                  <ListDelist small />
                </Stack>
                <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                  Tags
                </Typography>
                <TagList edit />
              </Stack>
            </CardContent>
          </Card>
        </Drawer>
      </Stack>
    </Stack>
  )
}
