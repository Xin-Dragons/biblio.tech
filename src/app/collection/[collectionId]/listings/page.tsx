"use client"
import { Items } from "@/components/Items"
import { Listing } from "@/components/Listing"
import { SelectionProvider } from "@/context/selection"
import { TensorProvider } from "@/context/tensor"
import { TransactionStatusProvider } from "@/context/transactions"
import { ListingActions } from "./Client"
import { useListings } from "@/context/listings"
import { useDigitalAssets } from "@/context/digital-assets"

export default function Listings() {
  const { listings } = useListings()
  const { filtered } = useDigitalAssets()

  const listed = listings?.map((l) => l.nftMint)
  let items = filtered
    .filter((da) => listed?.includes(da.id))
    .map((da) => {
      const listing = listings.find((l) => l.nftMint === da.id)
      return {
        ...da,
        ...listing,
      }
    })
    .sort((a, b) => a.price - b.price)

  // items = items.filter((item) => item.price > collectionStats.floorPrice * 0.8)

  return (
    <TransactionStatusProvider>
      <TensorProvider>
        <SelectionProvider>
          <Items items={items} Component={Listing} />
          <ListingActions listings={items} />
        </SelectionProvider>
      </TensorProvider>
    </TransactionStatusProvider>
  )
}
