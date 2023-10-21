"use server"
import axios from "axios"
import { HELIUS_RPC, helius } from "./helius"
import { getHmDigitalAsset, getListingForMint } from "./hello-moon-server-actions"
import { fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { publicKey, unwrapOption } from "@metaplex-foundation/umi"
import { CollectionMintsRequest } from "@hellomoon/api"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { Listing } from "@/app/models/Listing"
import { hmClient } from "./hello-moon"
import { getTensorMint } from "./tensor-server-actions"
import { DAS } from "helius-sdk"
import { flatten } from "lodash"

const PAGE_SIZE = 1_000

type GetAssetResponseListWithGrandTotal = DAS.GetAssetResponseList & {
  grand_total: number
  items: (DAS.GetAssetResponse & {
    content: DAS.Content & {
      metadata: DAS.Metadata & {
        token_standard?: number
      }
    }
  })[]
}

export async function getAllDigitalAssetsByOwner(ownerAddress: string) {
  const { grand_total, total, items } = await fetchDigitalAssetsByOwner(ownerAddress)
  if (total >= grand_total) {
    return items
  }

  const remainingPages = Math.ceil((grand_total - total) / PAGE_SIZE)
  const rest = flatten(
    await Promise.all(
      Array.from(new Array(remainingPages).keys()).map(async (index) => {
        return (await fetchDigitalAssetsByOwner(ownerAddress, index + 2)).items
      })
    )
  )

  return [...items, ...rest]
}

export async function fetchDigitalAssetsByOwner(
  ownerAddress: string,
  page = 1
): Promise<GetAssetResponseListWithGrandTotal> {
  try {
    const { data } = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0",
      id: "1",
      method: "getAssetsByOwner",
      params: {
        ownerAddress,
        page: page,
        limit: PAGE_SIZE,
        displayOptions: {
          showGrandTotal: true,
        },
        sortBy: {
          sortBy: "none",
        },
      },
    })

    return data.result
  } catch {
    return {
      items: [],
    } as any
  }
}

export async function getDandiesForWallets(wallets: string[]) {
  const nfts = flatten(
    await Promise.all(
      wallets.map(async (owner) => {
        const { data } = await axios.post(HELIUS_RPC, {
          jsonrpc: "2.0",
          id: "1",
          method: "searchAssets",
          params: {
            grouping: ["collection", process.env.NEXT_PUBLIC_COLLECTION_ID],
            compressed: false,
            ownerAddress: owner,
            page: 1,
            limit: 1_000,
            sortBy: {
              sortBy: "none",
            },
          },
        })

        return data?.result?.items || []
      })
    )
  )

  return nfts
}

export async function fetchDigitalAssetsByCollection(
  collection: string,
  page = 1
): Promise<{ items: any[] } | undefined> {
  try {
    const { data } = await axios.post(HELIUS_RPC, {
      jsonrpc: "2.0",
      id: "1",
      method: "getAssetsByGroup",
      params: {
        groupKey: "collection",
        groupValue: collection,
        page: page,
        limit: 1_000,
        sortBy: {
          sortBy: "none",
        },
      },
    })

    return data.result
  } catch (err) {
    console.log(err)
  }
}

export async function fetchDigitalAssetByCollection(collection: string): Promise<any> {
  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    id: "1",
    method: "getAssetsByGroup",
    params: {
      groupKey: "collection",
      groupValue: collection,
      page: 1,
      limit: 1,
      sortBy: {
        sortBy: "none",
      },
    },
  })

  return data.result.items[0]
}

export async function fetchDigitalAssetsByCreator(creatorAddress: string, page = 1): Promise<any[]> {
  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    id: "1",
    method: "getAssetsByCreator",
    params: {
      creatorAddress,
      page: page,
      limit: 1_000,
      sortBy: {
        sortBy: "none",
      },
      displayOptions: {
        showGrandTotal: true,
      },
    },
  })

  return data.result
}

export async function getDigitalAsset(mintAddress: string) {
  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    id: "1",
    method: "getAsset",
    params: {
      id: mintAddress,
    },
  })

  return data.result
}

export async function fetchAllDigitalAssetsByIds(ids: string[]) {
  if (!ids.length) {
    return []
  }

  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    method: "getAssetBatch",
    id: "1",
    params: {
      ids,
    },
  })

  return data.result
}

export async function fetchAllDigitalAssetProofsByIds(ids: string[]) {
  if (!ids.length) {
    return []
  }

  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    method: "getAssetProofBatch",
    id: "1",
    params: {
      ids,
    },
  })

  return data.result
}

export async function loadDigitalAsset(mintAddress: string) {
  let digitalAsset = await getDigitalAsset(mintAddress)
  const tensorMint = await getTensorMint(digitalAsset.id)
  console.log({ tensorMint })

  if (!digitalAsset) {
    digitalAsset = await getHmDigitalAsset(mintAddress)
  }

  const image =
    digitalAsset.content?.links.image ||
    (digitalAsset.content.json_uri && (await fetchJsonMetadata(umi, digitalAsset.content.json_uri)).image)

  let tokenStandard = 6
  let isMasterEdition: boolean | undefined = true
  let isEdition: boolean | undefined = false
  try {
    if (!digitalAsset.compression.compressed) {
      const da = await fetchDigitalAsset(umi, publicKey(digitalAsset.id))
      tokenStandard = unwrapOption(da.metadata.tokenStandard) || 0
      isMasterEdition = da.edition?.isOriginal
      isEdition = da.edition && !da.edition.isOriginal
    } else {
      tokenStandard = 5
    }
  } catch {}

  const listing = await getListingForMint(mintAddress)

  const helloMoonCollectionId = (
    await hmClient.send(
      new CollectionMintsRequest({
        nftMint: digitalAsset.id,
      })
    )
  )?.data?.[0]?.helloMoonCollectionId

  return DigitalAsset.solana({
    ...digitalAsset,
    image,
    helloMoonCollectionId,
    listing: listing ? Listing.fromHelloMoon(listing) : null,
    tokenStandard,
    isMasterEdition,
    isEdition,
    lastSale: tensorMint?.lastSale,
    collection: tensorMint?.collection,
  })
}
