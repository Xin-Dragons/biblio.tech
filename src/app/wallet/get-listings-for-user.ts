"use server"

import { getListings } from "@/helpers/hello-moon-server-actions"
import { getTensorListingsForUser } from "@/helpers/tensor-server-actions"
import { Listing } from "../models/Listing"
import { jsonify } from "@/helpers/utils"

export async function getListingsForUser(address: string) {
  try {
    const tensorListings = await getTensorListingsForUser(address)
    console.log("got tensor listings")

    return tensorListings
  } catch {
    const hmListings = await getListings(undefined, address)
    console.log("got hm listingss")
    return hmListings.map((l) => jsonify(Listing.fromHelloMoon(l)))
  }
}
