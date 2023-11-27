import { Connection } from "@solana/web3.js"
import * as helius from "helius-sdk"
import { flatten, isEqual } from "lodash"

const client = new helius.RpcClient(
  new Connection(process.env.NEXT_PUBLIC_RPC_HOST!),
  process.env.NEXT_PUBLIC_HELIUS_API_KEY
)

async function getByCollection(collection: string, page: number) {
  return await client.getAssetsByGroup({
    groupKey: "collection",
    groupValue: collection,
    page,
    displayOptions: {
      showGrandTotal: true,
    },
  })
}

async function getByCreator(creator: string, page: number) {
  return await client.getAssetsByCreator({
    creatorAddress: creator,
    onlyVerified: true,
    page,
    displayOptions: {
      showGrandTotal: true,
    },
  })
}

async function getAllByCreator(creator: string) {
  const nfts = []
  let total = 1001
  let page = 1
  while (nfts.length < total) {
    const result = await getByCreator(creator, page)
    total = result.grand_total as any as number
    nfts.push(...result.items)
    page++
  }

  return nfts
}

async function getAllByCollection(collection: string) {
  const nfts = []
  let total = 1001
  let page = 1
  while (nfts.length < total) {
    const result = await getByCollection(collection, page)
    total = result.grand_total as any as number
    nfts.push(...result.items)
    page++
  }

  return nfts
}

export async function getMintlist(data: any) {
  let nfts: helius.DAS.GetAssetResponse[] = []
  if (data.collections) {
    const nftsByCollection = flatten(await Promise.all(data.collections.map(getAllByCollection)))
    nfts = nfts.concat(...nftsByCollection)
  }

  if (data.creators) {
    const nftsByCreator = flatten(await Promise.all(data.creators.map(getAllByCreator)))
    nfts = nfts.concat(...nftsByCreator)
  }

  if (data.filters && data.filters.length) {
    data.filters.forEach((filter: { trait_type: string; value: any }) => {
      nfts = nfts.filter((nft) => {
        return nft.content?.metadata.attributes?.find((item) => isEqual(item, filter))
      })
    })
  }

  return nfts.map((n) => n.id)
}
