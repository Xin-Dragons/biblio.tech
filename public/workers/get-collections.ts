import client from "@/helpers/apollo"
import { fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"
import { getHelloMoonCollectionsFromNfts } from "@/helpers/hello-moon"
import { gql } from "@apollo/client"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import axios from "axios"
import { groupBy, partition, uniq } from "lodash"

async function getCollections(digitalAssets: any[]) {
  const grouped = groupBy(digitalAssets.map((da) => da.collectionId))

  const collections = Object.keys(grouped)

  const { items: collectionNfts } = (await fetchAllDigitalAssetsByIds(collections)) as any
  const withAssets = (collectionNfts || []).map((collection: any) => {
    const das = digitalAssets.filter((da) => da.collectionId === collection.id)

    return {
      id: collection.id,
      name: collection.content.metadata.name,
      image: collection.content.links.image,
      digitalAssets: das,
      currency: "solana",
    }
  })

  const [compressed, regular] = partition(withAssets, (item) => item.digitalAssets[0].compression.compressed)

  const hmCollections = await getHelloMoonCollectionsFromNfts(
    regular.map((w: any) => ({ id: w.id, mint: w.digitalAssets[0].id }))
  )

  const { data: compressedCollections } = await axios.post("/api/get-tensor-fp", {
    mints: compressed.map((c) => c.digitalAssets[0].id),
  })

  console.log({ compressedCollections })

  return withAssets.map((item: any) => {
    const helloMoonCollection = hmCollections.find((hm) => hm.id === item.id)?.helloMoonCollection
    const compressedCollection = compressedCollections.find((c) => c.mint === item.digitalAssets[0].id)
    return {
      ...item,
      helloMoonCollection,
      name: item.name || helloMoonCollection?.collectionName,
      image: item.image || helloMoonCollection?.sample_image || item.digitalAssets[0]?.content.links.image,
      value: helloMoonCollection
        ? ((helloMoonCollection?.floorPrice || 0) * (item.digitalAssets?.length || 0)) / LAMPORTS_PER_SOL
        : compressedCollection?.statsOverall?.floorPrice
        ? (Number(compressedCollection?.statsOverall?.floorPrice) / LAMPORTS_PER_SOL) * item.digitalAssets.length
        : 0,
    }
  })
}

self.addEventListener("message", async (event) => {
  const { digitalAssets } = event.data

  const collections = await getCollections(digitalAssets)

  self.postMessage({ collections })
})
