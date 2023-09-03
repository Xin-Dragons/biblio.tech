"use client"

import { SelectControls } from "@/components/SelectControls"
import { useSelection } from "@/context/selection"
import { useTensor } from "@/context/tensor"
import { Button, Stack } from "@mui/material"
import { useState } from "react"
import { toast } from "react-hot-toast"

export function ListingActions({ listings }: { listings: any[] }) {
  const [loading, setLoading] = useState(false)
  const { selected } = useSelection()
  const { buy } = useTensor()

  async function buyItems() {
    try {
      setLoading(true)
      const items = selected.map((id) => {
        const listing = listings.find((l) => l.id === id)
        return {
          maxPrice: listing.listing.price,
          mint: id,
          owner: listing.listing.seller,
          royalties: true,
          marketplace: listing.listing.marketplace,
        }
      })

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

  return (
    <Stack direction="row" justifyContent="space-between">
      <SelectControls max={50} items={listings} />
      <Button disabled={!selected.length} onClick={buyItems} variant="contained" size="large">
        Buy
      </Button>
    </Stack>
  )
}
