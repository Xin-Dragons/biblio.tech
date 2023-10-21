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
// import { TagList } from "../TagList"
import { Close, Label, Sell } from "@mui/icons-material"
// import { useAccess } from "../../context/access"
import { useSelection } from "../../context/selection"
// import { Vault } from "../Vault"
import { SelectControls } from "../SelectControls"
import { BulkSend } from "../BulkSend"
import { Burn } from "../Burn"
import { useAccess } from "@/context/access"
import { Vault } from "../Vault"
// import { ListDelist } from "../ListDelist"

export const Actions: FC = () => {
  // const { isInScope, isAdmin, isBasic } = useAccess()
  const accessLevel = useAccess()

  console.log(accessLevel)

  const [tagMenuOpen, setTagMenuOpen] = useState<boolean>(false)
  const [actionDrawerShowing, setActionDrawerShowing] = useState(false)

  const showMinMenu = useMediaQuery("(max-width:1050px)")

  function toggleTagMenuOpen() {
    setTagMenuOpen(!tagMenuOpen)
  }

  function toggleActionDrawer() {
    setActionDrawerShowing(!actionDrawerShowing)
  }

  // const isDisabled = isInScope && !isAdmin && !isBasic

  return (
    <Stack spacing={2}>
      <Stack spacing={1} direction="row" alignItems="center" sx={{ maxWidth: "100%", overflow: "hidden" }}>
        <>
          {!showMinMenu ? (
            <>
              <BulkSend />
              <Burn />
              <Vault />
              <Tooltip title="Toggle tag menu">
                <span>
                  <Button onClick={toggleTagMenuOpen} color="secondary" variant="outlined">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Label />
                      <Typography textTransform="uppercase">Tags</Typography>
                    </Stack>
                  </Button>
                </span>
              </Tooltip>
            </>
          ) : (
            <Button variant="outlined" onClick={toggleActionDrawer} disabled={false}>
              Actions
            </Button>
          )}
        </>
        {/* <Dialog open={tagMenuOpen} onClose={toggleTagMenuOpen}>
          <Card>
            <DialogTitle>Tag items</DialogTitle>
            <DialogContent>
              <TagList edit />
            </DialogContent>
          </Card>
        </Dialog> */}

        {/* <Drawer open={actionDrawerShowing} onClose={toggleActionDrawer} anchor="bottom">
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
        </Drawer> */}
      </Stack>
    </Stack>
  )
}
