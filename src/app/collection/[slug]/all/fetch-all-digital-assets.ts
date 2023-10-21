"use server"

import { Collection } from "@/types/database"
import {
  fetchAllDigitalAssetsByIds,
  fetchDigitalAssetByCollection,
  fetchDigitalAssetsByCollection,
  getDigitalAsset,
} from "@/helpers/digital-assets"
import { getMintList, getSingleMint } from "@/helpers/tensor-server-actions"

import { DAS } from "helius-sdk"
import { chunk, flatten, omit } from "lodash"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { getHowrareFromMint } from "@/helpers/howrare"

async function fetchAllDigitalAssetsByCollection(collection: string, numMints = 1000) {
  const pages = Math.ceil(numMints / 1000)
  const das = flatten(
    await Promise.all(
      Array.from(Array(pages).keys()).map(
        async (index) => (await fetchDigitalAssetsByCollection(collection, index + 1))?.items
      )
    )
  )
  return das
}

export async function fetchAllDigitalAssets(collection: Collection) {
  let verifiedCollection = collection.verified_collection

  if (!verifiedCollection) {
    const randoNft = await getSingleMint(collection.slug_tensor!)
    const da: DAS.GetAssetResponse = await getDigitalAsset(randoNft)
    const coll = da.grouping?.find((item) => item.group_key === "collection")?.group_value
    if (coll) {
      verifiedCollection = coll
    }
  }

  let digitalAssets = []

  if (verifiedCollection) {
    digitalAssets = await fetchAllDigitalAssetsByCollection(
      verifiedCollection,
      (collection.num_mints || 0) < 25_000 ? collection.num_mints || 0 : 25_000
    )
  } else {
    const mintList: string[] = await getMintList(collection.slug_tensor!)
    digitalAssets = flatten(
      await Promise.all(chunk(mintList, 1000).map((mints: string[]) => fetchAllDigitalAssetsByIds(mints)))
    )
  }
  const hr = digitalAssets.length ? await getHowrareFromMint(digitalAssets[0].id) : []
  return digitalAssets.map((da) => {
    const howRare = hr.find((item: { rank: number; mint: string }) => item.mint === da.id)?.rank
    return DigitalAsset.solana({ ...da, howRare })
  })
}
