import {
  fetchAllDigitalAssetsByIds,
  fetchDigitalAssetByCollection,
  fetchDigitalAssetsByCollection,
  fetchDigitalAssetsByCreator,
  fetchDigitalAssetsByOwner,
} from "@/helpers/digital-assets"
import { hmClient } from "@/helpers/hello-moon"
import { CollectionMintsRequest, NftMintInformationRequest } from "@hellomoon/api"
import { isPublicKey } from "@metaplex-foundation/umi"

async function fetchResultsGradually(func: Function, param: any) {
  console.log("NO FUCCK")
  let page = 1
  let total = 1_001
  let loaded = 0
  while (loaded < total) {
    const result = await func(param, page)
    const digitalAssets = result.items
    total = result.grand_total
    page += 1
    self.postMessage({ total, loaded: (loaded += digitalAssets.length), digitalAssets })
  }
}

async function fetchAllResults(func: Function, param: any) {
  let page = 1
  let total = 1_001
  const digitalAssets = []
  while (digitalAssets.length < total) {
    const result = await func(param, page)
    digitalAssets.push(...result.items)
    total = result.grand_total
    page += 1
    self.postMessage({ total, loaded: digitalAssets.length })
  }
  self.postMessage({ digitalAssets })
}

async function getDigitalAssets(collectionId: string, gradual?: boolean) {
  if (isPublicKey(collectionId)) {
    gradual
      ? await fetchResultsGradually(fetchDigitalAssetsByCollection, collectionId)
      : await fetchAllResults(fetchDigitalAssetsByCollection, collectionId)

    return
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
    const asset = await fetchDigitalAssetByCollection(item.nftCollectionMint)
    if (asset) {
      gradual
        ? await fetchResultsGradually(fetchDigitalAssetsByCollection, item.nftCollectionMint)
        : await fetchAllResults(fetchDigitalAssetsByCollection, item.nftCollectionMint)

      return
    }
  }

  const creator = (item.nftMetadataJson.creators.find((c: any) => c.verified) as any)?.address

  gradual
    ? await fetchResultsGradually(fetchDigitalAssetsByCreator, creator)
    : await fetchAllResults(fetchDigitalAssetsByCreator, creator)
}

self.addEventListener("message", async (event) => {
  try {
    const { collectionId, wallet, ids, gradual } = event.data

    if (ids) {
      gradual
        ? await fetchResultsGradually(fetchAllDigitalAssetsByIds, ids)
        : await fetchAllResults(fetchAllDigitalAssetsByIds, ids)
    } else if (wallet && !collectionId) {
      gradual
        ? await fetchResultsGradually(fetchDigitalAssetsByOwner, wallet)
        : await fetchAllResults(fetchDigitalAssetsByOwner, wallet)
    } else {
      await getDigitalAssets(collectionId, gradual)
    }
  } catch (err: any) {
    console.log("WELLL THIS IS FUCKED", err)
    self.postMessage({ ok: false })
  }
})
