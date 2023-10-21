"use server"

import { Listing } from "@/app/models/Listing"
import { getListings } from "@/helpers/hello-moon-server-actions"
import { getTensorListings } from "@/helpers/tensor-server-actions"
import { Collection } from "@/types/database"

async function getFromTensor(collection: Collection) {
  if (!collection.slug_tensor) {
    return null
  }

  let listings = await getTensorListings(collection.slug_tensor)
  if (!listings?.results.length) {
    listings = await getTensorListings(collection.slug)
  }
  // const pools = await getTensorPools(collection.slug)
  // console.log({ pools })
  return listings
}

async function getFromHelloMoon(collection: Collection) {
  if (!collection.hello_moon_collection_id) {
    return null
  }
  const listings = await getListings(collection.hello_moon_collection_id)
  return listings.map((l) => Listing.fromHelloMoon(l))
}

export async function getSolListings(collection: Collection) {
  if (!collection) {
    return
  }
  if (collection.slug_tensor) {
    const listings = await getFromTensor(collection)
    if (listings) {
      return listings
    }
  }
  return null
  // if (collection.hello_moon_collection_id) {
  //   const listings = await getFromHelloMoon(collection)
  //   if (listings) {
  //     return listings
  //   }
  // }
  // return null
}
