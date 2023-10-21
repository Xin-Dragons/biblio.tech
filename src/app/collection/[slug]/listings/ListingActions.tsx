"use client"

import { SelectControls } from "@/components/SelectControls"
import { useSelection } from "@/context/selection"
import { useTensor } from "@/context/tensor"
import { lamportsToSol } from "@/helpers/utils"
import { Button, CircularProgress, Stack, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"

export function ListingActions({ listings, loading: parentLoading }: { listings: any[]; loading?: boolean }) {
  const [loading, setLoading] = useState(parentLoading)
  const { selected } = useSelection()
  const { buy } = useTensor()

  useEffect(() => {
    setLoading(parentLoading)
  }, [parentLoading])

  const selectedListings = listings.filter((item) => {
    return selected.includes(item.id)
  })

  async function buyItems() {
    try {
      setLoading(true)
      const items = selected.map((id) => listings.find((l) => l.id === id))

      const buyPromise = buy(items)
      toast.promise(buyPromise, {
        loading: `Buying item${items.length === 1 ? "" : "s"}`,
        success: "Done!",
        error: `Error buying item${items.length === 1 ? "" : "s"}`,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalPrice = selectedListings.reduce((sum, item) => sum + item.listing.price, 0)

  return (
    <Stack direction="row" justifyContent="space-between">
      <SelectControls max={50} items={listings} />
      <Stack direction="row" spacing={2} alignItems="center">
        {!!totalPrice && (
          <Typography variant="h5" color="primary">
            {lamportsToSol(totalPrice)}
          </Typography>
        )}

        {loading && <CircularProgress />}
        <Button disabled={!selected.length} onClick={buyItems} variant="contained" size="large">
          Buy
        </Button>
      </Stack>
    </Stack>
  )
}
