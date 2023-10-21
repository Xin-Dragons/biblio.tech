"use server"

import { getTensorStats } from "@/helpers/tensor-server-actions"
import { Collection } from "@/types/database"

export async function getSolanaCollectionStats(collection: Collection) {
  if (collection.slug_tensor) {
    const tensorCollection = await getTensorStats(collection.slug_tensor)
    if (tensorCollection) {
      return tensorCollection
    }
  }
  return null
}

// "use server"

// import { umi } from "@/app/helpers/umi"
// import { Collection } from "@/app/models/Collection"
// import { getDigitalAsset } from "@/helpers/digital-assets"
// import { hmClient } from "@/helpers/hello-moon"
// import {
//   getCollectionIdFromHelloMoonCollectionId,
//   getHelloMoonCollectionId,
//   getSingleMint,
// } from "@/helpers/hello-moon-server-actions"
// import { getTensorCollection } from "@/helpers/tensor-server-actions"
// import { isUUID } from "@/helpers/utils"
// import {
//   CollectionAllTimeRequest,
//   LeaderboardStats,
//   LeaderboardStatsRequest,
//   NftMintInformationRequest,
// } from "@hellomoon/api"
// import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
// import { isPublicKey, publicKey, unwrapOption } from "@metaplex-foundation/umi"
// import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
// import { redirect } from "next/navigation"

// export async function getSolanaCollectionStats(collectionId: string) {
//   let collection: Pick<
//     LeaderboardStats,
//     | "collectionName"
//     | "sample_image"
//     | "floorPrice"
//     | "price_percent_change"
//     | "volume"
//     | "listing_count"
//     | "supply"
//     | "helloMoonCollectionId"
//   > & {
//     id: string
//     totalVolumeLamports: number
//   } = {
//     collectionName: "Unknown collection",
//     id: collectionId,
//     helloMoonCollectionId: "",
//     sample_image: "",
//     floorPrice: 0,
//     totalVolumeLamports: 0,
//     price_percent_change: 0,
//     volume: 0,
//     listing_count: 0,
//     supply: 0,
//   }

//   // if (isUUID(collectionId)) {
//   const tensorCollection = await getTensorCollection(collectionId)
//   console.log({ tensorCollection })
//   if (tensorCollection) {
//     Object.assign(collection, tensorCollection)
//     return Collection.fromHelloMoon(collection as LeaderboardStats & { totalVolumeLamports: number; id: string })
//   }
//   // }

//   const helloMoonCollectionId = await getHelloMoonCollectionId(collectionId)

//   if (helloMoonCollectionId) {
//     const { data } = await hmClient.send(
//       new LeaderboardStatsRequest({
//         helloMoonCollectionId,
//         granularity: "ONE_DAY",
//       })
//     )

//     const response = (await hmClient.send(
//       new CollectionAllTimeRequest({
//         helloMoonCollectionId,
//       })
//     )) as any

//     collection = {
//       ...data[0],
//       id: collectionId,
//       helloMoonCollectionId,
//       totalVolumeLamports: response.totalVolumeLamports,
//     }
//   }

//   if (isPublicKey(collectionId)) {
//     const da = await getDigitalAsset(collectionId)

//     collection.collectionName = da.content.metadata.name
//     collection.sample_image = da.content.links.image

//     if (!helloMoonCollectionId || !collection.floorPrice) {
//       return null
//     }
//   } else {
//     const collectionMint = await getCollectionIdFromHelloMoonCollectionId(collectionId)

//     if (collectionMint) {
//       return redirect(`/collection/${collectionMint}`)
//     }

//     const singleMint = await getSingleMint(collectionId)

//     const { data } = await hmClient.send(
//       new NftMintInformationRequest({
//         nftMint: singleMint,
//       })
//     )

//     if (!data.length) {
//       throw new Error("Error looking up mint")
//     }

//     const item = data[0]

//     if (item.nftCollectionMint) {
//       const info = await umi.rpc.getAccount(publicKey(item.nftCollectionMint))
//       if (info.exists && info.owner === TOKEN_PROGRAM_ID.toBase58()) {
//         return redirect(`/collection/${item.nftCollectionMint}`)
//       } else {
//         try {
//           const da = await fetchDigitalAsset(umi, publicKey(item.nftMint as string))
//           const collection = unwrapOption(da.metadata.collection)
//           if (collection?.verified) {
//             return redirect(`/collection/${collection.key}`)
//           }
//         } catch {}
//       }
//     }
//   }

//   return Collection.fromHelloMoon(collection as LeaderboardStats & { totalVolumeLamports: number; id: string })
// }
