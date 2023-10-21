import { TensorProvider } from "@/context/tensor"
import { TransactionStatusProvider } from "@/context/transactions"
import { DigitalAssetsProviders } from "../DigitalAssetsProviders"
import { Client } from "./Client"
import { getSolListings } from "./get-listings"
import { notFound } from "next/navigation"
import { Listing } from "@/app/models/Listing"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { jsonify } from "@/helpers/utils"
import { getCollection } from "@/app/helpers/supabase"
import { Typography } from "@mui/material"

export const revalidate = 5

export default async function Listings({ params }: { params: Record<string, string> }) {
  const collection = await getCollection(params.slug)
  if (!collection) {
    return notFound()
  }
  const listings = await getSolListings(collection)
  if (!listings) {
    return <Typography>No listings found</Typography>
  }

  const digitalAssets: DigitalAsset[] = listings.results.map((l) => {
    const listing = new Listing(l)
    return new DigitalAsset({ ...(listing.digitalAsset as DigitalAsset), listing })
  })

  return (
    <DigitalAssetsProviders defaultSort="price.asc" listing>
      <TransactionStatusProvider>
        <Client items={jsonify(digitalAssets)} collection={jsonify(collection)} page={listings.page} />
      </TransactionStatusProvider>
    </DigitalAssetsProviders>
  )
}
