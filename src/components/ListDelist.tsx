import { useSelection } from "@/context/selection"
import { Sell } from "@mui/icons-material"
import { Button, Card, Dialog, IconButton, Stack, Theme, Tooltip, Typography, useMediaQuery } from "@mui/material"
import { Listing } from "./Listing"
import toast from "react-hot-toast"
import { SecureDelist } from "./SecureDelist"
import { useState } from "react"

export function ListDelist({ small }: { small?: boolean }) {
  const [listOpen, setListOpen] = useState(false)
  const [delistOpen, setDelistOpen] = useState(false)
  const { selected, selectedItems, onlyNftsSelected, nonOwnedSelected } = useSelection()

  function toggleDelist() {
    setDelistOpen(!delistOpen)
  }

  function toggleListOpen() {
    setListOpen(!listOpen)
  }

  async function list() {
    try {
      if (nonOwnedSelected) {
        throw new Error("Some selected items are owned by a linked wallet")
      }
      if (selected.length > 20) {
        throw new Error("List only supported for up to 20 items")
      }
      toggleListOpen()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const nonListedStatusSelected = selectedItems.some((item) => item.status && item.status !== "listed")
  const allListed = selectedItems.every((item) => item.status === "listed")
  const allDelisted = selectedItems.every((item) => !item.status)
  const listedSelected = selectedItems.some((item) => item.status === "listed")

  const canList = allListed || allDelisted

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <>
      {small ? (
        <Button
          disabled={
            !selected.length ||
            nonListedStatusSelected ||
            !canList ||
            !onlyNftsSelected ||
            nonOwnedSelected ||
            selected.length > 20
          }
          onClick={listedSelected ? toggleDelist : list}
          variant="contained"
          size="large"
          fullWidth
        >
          <Stack direction="row" spacing={1}>
            <Sell />
            <Typography>Sell / List selected</Typography>
          </Stack>
        </Button>
      ) : (
        <Tooltip
          title={
            nonOwnedSelected
              ? "Some selected items are owned by a linked wallet"
              : nonListedStatusSelected
              ? "Selection contains items that cannot be listed"
              : onlyNftsSelected
              ? canList
                ? listedSelected
                  ? "Delist selected items"
                  : "List selected items"
                : "Cannot list and delist in same transaction"
              : "Only NFTs and pNFTs can be listed"
          }
        >
          <span>
            <IconButton
              disabled={
                !selected.length || nonListedStatusSelected || !canList || !onlyNftsSelected || nonOwnedSelected
              }
              color="info"
              onClick={listedSelected ? toggleDelist : list}
            >
              <Sell />
            </IconButton>
          </span>
        </Tooltip>
      )}
      <Dialog open={listOpen} onClose={toggleListOpen} fullWidth maxWidth="md" fullScreen={isXs}>
        <Card sx={{ overflowY: "auto", height: "100vh" }}>
          <Listing items={selectedItems} onClose={toggleListOpen} />
        </Card>
      </Dialog>

      <Dialog open={delistOpen} onClose={toggleDelist} fullWidth maxWidth="md">
        <Card sx={{ overflowY: "auto" }}>
          <SecureDelist onDismiss={toggleDelist} />
        </Card>
      </Dialog>
    </>
  )
}
