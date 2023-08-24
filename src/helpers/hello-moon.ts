import {
  CollectionMintsRequest,
  CollectionNameRequest,
  NftListingStatus,
  NftListingStatusRequest,
  RestClient,
} from "@hellomoon/api"
import { isPublicKey } from "@metaplex-foundation/umi"
import { fetchDigitalAssetByCollection } from "./digital-assets"

export const hmClient = new RestClient(process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY!)

export async function getListings(
  helloMoonCollectionId?: string,
  publicKey?: string,
  paginationToken?: string
): Promise<NftListingStatus[]> {
  const result = await hmClient.send(
    new NftListingStatusRequest({
      helloMoonCollectionId,
      seller: publicKey,
      limit: 1_000,
      isListed: true,
      paginationToken,
    })
  )

  if (result.paginationToken) {
    return [...result.data, ...(await getListings(helloMoonCollectionId, publicKey, result.paginationToken))]
  }

  return result.data
}

export async function getHelloMoonCollectionIdFromNft(nftMint: string) {
  const { data } = await hmClient.send(
    new CollectionMintsRequest({
      nftMint,
    })
  )

  return data[0]?.helloMoonCollectionId
}

export async function isValidHelloMoonCollectionId(helloMoonCollectionId: string) {
  const { data } = await hmClient.send(new CollectionNameRequest({ helloMoonCollectionId }))
  return !!data[0].collectionName
}

export async function getHelloMoonCollectionId(collectionId: string) {
  if (isPublicKey(collectionId as string)) {
    const randoNft = await fetchDigitalAssetByCollection(collectionId)
    console.log({ randoNft })
    const helloMoonCollectionId = await getHelloMoonCollectionIdFromNft(randoNft.id)
    return helloMoonCollectionId
  } else {
    const valid = await isValidHelloMoonCollectionId(collectionId)
    if (valid) {
      return collectionId
    }
  }
  return null
}
