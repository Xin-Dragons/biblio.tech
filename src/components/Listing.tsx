"use client"
import { useTensor } from "@/context/tensor"
import { lamportsToSol } from "@/helpers/utils"
import { Stack, Typography, FormControlLabel, Switch, SvgIcon, Button, Alert } from "@mui/material"
import { useState } from "react"
import toast from "react-hot-toast"
import Crown from "@/../public/crown.svg"
import Tensor from "@/../public/tensor.svg"
import { NftListingStatus } from "@hellomoon/api"

export function Listing({
  listing,
  sellerFeeBasisPoints,
  defaultPayRoyalties = true,
  royaltiesEnforced,
}: {
  listing: NftListingStatus
  defaultPayRoyalties?: boolean
  sellerFeeBasisPoints: number
  royaltiesEnforced: boolean
}) {
  const [payRoyalties, setPayRoyalties] = useState(royaltiesEnforced || defaultPayRoyalties)
  const [loading, setLoading] = useState(false)
  const { buy } = useTensor()

  async function buyItem() {
    try {
      setLoading(true)
      const buyPromise = buy([
        {
          owner: listing.seller,
          maxPrice: listing.price,
          mint: listing.nftMint,
          royalties: payRoyalties,
          marketplace: listing.marketplace as any,
        },
      ]) as unknown as Promise<void>

      toast.promise(buyPromise, {
        loading: "Buying item",
        success: "Item bought successfully",
        error: "Error buying item",
      })

      await buyPromise
    } catch (err: any) {
      toast.error(err.message || "Error buying item")
    } finally {
      setLoading(false)
    }
  }

  const price = listing?.price || 0
  const fee = (price / 100) * 1.5
  const rent = 2030000
  const royalties = ((listing?.price || 0) / 10000) * sellerFeeBasisPoints
  console.log({ royalties })
  const total = payRoyalties ? price + fee + rent + royalties : price + fee + rent

  return (
    <Stack spacing={2} width="100%">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Listed for sale:</Typography>
        <Typography color="primary" variant="h5">
          {lamportsToSol(price)} SOL
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <FormControlLabel
          label="Pay full royalties"
          control={
            <Switch
              checked={payRoyalties}
              onChange={(e) => setPayRoyalties(e.target.checked)}
              disabled={royaltiesEnforced}
            />
          }
        />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <SvgIcon
            // @ts-ignore
            color={payRoyalties ? "gold" : "disabled"}
          >
            <Crown />
          </SvgIcon>
          <Typography variant="h6" color="primary">
            {lamportsToSol(royalties)}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography>Marketplace fee (1.5%)</Typography>
        <Typography color="primary">{lamportsToSol(fee)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography>Account opening rent</Typography>
        <Typography color="primary">{lamportsToSol(rent)}</Typography>
      </Stack>
      <Button size="large" variant="contained" onClick={buyItem} disabled={loading}>
        <Stack direction={"row"} spacing={1} alignItems="center">
          <Typography>BUY NOW for {lamportsToSol(total)}</Typography>
          {listing?.marketplace === "MEv2" && <img src="/me.png" height="18px" />}
          {listing?.marketplace === "TensorSwap" && (
            <SvgIcon>
              <Tensor />
            </SvgIcon>
          )}
        </Stack>
      </Button>
      <Alert severity="info">
        Marketplace fee assumed to be 1.5% but is subject to change. The actual total including marketplace fee can be
        seen in your wallet simulation
      </Alert>
    </Stack>
  )
}
