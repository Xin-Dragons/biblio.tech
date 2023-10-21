"use server"
import {
  CollectionMintsRequest,
  CollectionNameRequest,
  LeaderboardStatsRequest,
  MvNftCollectionMapRequest,
  NftListingStatus,
  NftListingStatusRequest,
  NftLoanSummaryRequest,
  NftMintInformationRequest,
  SalesSecondary,
  SalesSecondaryRequest,
} from "@hellomoon/api"
import { isPublicKey } from "@metaplex-foundation/umi"
import { fetchDigitalAssetByCollection } from "./digital-assets"
import { fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"
import { uniqBy } from "lodash"
import axios from "axios"
import { hmClient } from "./hello-moon"

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

export async function getListingForMint(nftMint: string) {
  const result = await hmClient.send(
    new NftListingStatusRequest({
      nftMint,
      isListed: true,
      limit: 1,
    })
  )

  return result.data[0]
}

// export async function getTopWallets(paginationToken?: string) {
//   const result = await hmClient.send(
//     new WalletAllTimeStatsRequest({
//       limit: 1000,
//       paginationToken,
//     })
//   )

//   console.log(result.data.length)

//   if (result.paginationToken) {
//     return {
//       ...result.data,
//       ...(await getTopWallets(result.paginationToken)),
//     }
//   }

//   return result.data
// }

export async function getActiveLoansForUser(wallet: string) {
  try {
    const { data } = await hmClient.send(
      new NftLoanSummaryRequest({
        status: ["active", "open", "extended"],
        borrower: wallet,
        limit: 1_000,
      })
    )

    return data
  } catch (err) {
    console.log(err)
    return []
  }
}

export async function getTopCollections(sortBy = "smartMoneyInflow", days = 1) {
  const { data } = await axios.post(
    "https://rest-api.hellomoon.io/v0/nft/leaderboard",
    {
      orderby: {
        [sortBy]: "desc",
      },
      pagination: {
        limit: 10,
        offset: 0,
      },
      viewRange: `${days}d`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
      },
    }
  )

  return data.nfts
}

export async function getAllSalesInPeriod(
  hours = 24,
  minPrice: number = 0,
  paginationToken?: string
): Promise<SalesSecondary[]> {
  const result = await hmClient.send(
    new SalesSecondaryRequest({
      blockTime: {
        value: Math.floor(Date.now() / 1000 - 60 * 60 * hours),
        operator: ">",
      },
      price: {
        value: 30,
        operator: ">",
      },
      paginationToken,
      limit: 1000,
    })
  )

  if (result.paginationToken) {
    return {
      ...result.data,
      ...(await getAllSalesInPeriod(hours, minPrice, result.paginationToken)),
    }
  }

  return result.data
}

export async function getCollectionIdFromHelloMoonCollectionId(helloMoonCollectionId: string) {
  const { data } = await hmClient.send(new MvNftCollectionMapRequest({ helloMoonCollectionId }))

  return data[0]?.nftCollectionMint
}

export async function getHelloMoonCollectionIdFromNft(nftMint: string) {
  const { data } = await hmClient.send(
    new CollectionMintsRequest({
      nftMint,
    })
  )

  return data[0]?.helloMoonCollectionId
}

export async function getHelloMoonCollectionsFromNfts(items: { id: string; mint: string }[]) {
  const { data } = await hmClient.send(
    new CollectionMintsRequest({
      nftMint: items.map((item) => item.mint),
      limit: 1000,
    })
  )

  const collections = await getHelloMoonCollections(data.map((item) => item.helloMoonCollectionId))

  return collections.map((c) => {
    const mint = data.find((d) => d.helloMoonCollectionId === c.helloMoonCollectionId)?.nftMint
    const id = items.find((item) => item.mint === mint)?.id
    return {
      helloMoonCollection: c,
      id,
    }
  })
}

export async function getHelloMoonCollections(collectionIds: string[]) {
  const collections = await hmClient.send(
    new LeaderboardStatsRequest({
      limit: 1000,
      helloMoonCollectionId: collectionIds,
      granularity: "ONE_DAY",
    })
  )
  return uniqBy(collections.data, (item) => item.helloMoonCollectionId)
}

export async function isValidHelloMoonCollectionId(helloMoonCollectionId: string) {
  const { data } = await hmClient.send(new CollectionNameRequest({ helloMoonCollectionId }))
  return !!data[0]?.collectionName
}

export async function getHelloMoonCollectionId(collectionId: string) {
  if (isPublicKey(collectionId as string)) {
    const randoNft = await fetchDigitalAssetByCollection(collectionId)

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

export async function getSingleMint(helloMoonCollectionId: string) {
  const { data: nfts } = await hmClient.send(
    new CollectionMintsRequest({
      helloMoonCollectionId,
      limit: 1,
    })
  )

  if (!nfts.length) {
    throw new Error("Error looking up mints")
  }

  return nfts[0].nftMint as string
}

export async function getHmDigitalAsset(nftMint: string) {
  try {
    const { data } = await hmClient.send(
      new NftMintInformationRequest({
        nftMint,
      })
    )

    if (!data?.length) {
      throw new Error("Unable to find digital asset")
    }

    const item = data[0]
    const json = await fetchJsonMetadata(umi, item.nftMetadataJson.uri)

    const digitalAsset = {
      id: item.nftMint,
      burned: true,
      content: {
        metadata: {
          name: json.name || item.nftMetadataJson.name,
          description: json.description,
          symbol: json.symbol || item.nftMetadataJson.symbol,
        },
        json_uri: item.nftMetadataJson.uri,
        links: {
          image: json.image,
          external_url: json.external_url,
        },
      },
      compression: {
        compressed: false,
      },
      authorities: [],
      grouping: [] as any,
    }

    if (item.nftCollectionMint) {
      digitalAsset.grouping = [
        {
          group_key: "collection",
          group_value: item.nftCollectionMint,
        },
      ]
    }

    return digitalAsset
  } catch (err: any) {
    console.log(err)
    return null
  }
}

export async function lookupHelloMoonCollectionIdFromSlug(slug: string) {
  const { data } = await hmClient.send(new CollectionNameRequest({ collectionName: slug }))

  return data[0]?.helloMoonCollectionId
}
