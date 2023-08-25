import {
  fetchAllDigitalAssetsByIds,
  fetchDigitalAssetsByCollection,
  fetchDigitalAssetsByCreator,
  fetchDigitalAssetsByOwner,
} from "@/helpers/digital-assets"
import { hmClient } from "@/helpers/hello-moon"
import { CollectionMintsRequest, NftMintInformationRequest } from "@hellomoon/api"
import { isPublicKey } from "@metaplex-foundation/umi"

async function getDigitalAssets(collectionId: string) {
  if (isPublicKey(collectionId)) {
    const digitalAssets = await fetchDigitalAssetsByCollection(collectionId)
    return digitalAssets
  }
  const { data: nfts } = await hmClient.send(
    new CollectionMintsRequest({
      helloMoonCollectionId: collectionId,
      limit: 1,
    })
  )

  if (!nfts.length) {
    throw new Error("Error looking up mints")
  }

  const { data } = await hmClient.send(
    new NftMintInformationRequest({
      nftMint: nfts[0].nftMint,
    })
  )

  if (!data.length) {
    throw new Error("Error looking up mint")
  }

  const item = data[0]

  if (item.nftCollectionMint) {
    const digitalAssets = await fetchDigitalAssetsByCollection(collectionId)
    if (digitalAssets.length) {
      return digitalAssets
    }
  }

  const creator = (item.nftMetadataJson.creators.find((c: any) => c.verified) as any)?.address

  const digitalAssets = await fetchDigitalAssetsByCreator(creator)
  return digitalAssets
}

self.addEventListener("message", async (event) => {
  try {
    const { collectionId, wallet, ids } = event.data

    if (ids) {
      const digitalAssets = await fetchAllDigitalAssetsByIds(ids)
      self.postMessage({ digitalAssets })
    } else if (wallet && !collectionId) {
      const digitalAssets = await fetchDigitalAssetsByOwner(wallet)
      self.postMessage({ digitalAssets })
    } else {
      const digitalAssets = await getDigitalAssets(collectionId)
      self.postMessage({ digitalAssets })
    }
  } catch (err: any) {
    console.log(err)
    self.postMessage({ ok: false })
  }
})
