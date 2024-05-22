import { Connection } from "@solana/web3.js"
import { DAS, Helius } from "helius-sdk"
import { chunk, flatten, groupBy, isEqual, mapValues } from "lodash"
import { DANDIES_NIFTY_COLLECTION, PriorityFees } from "../constants"
import axios from "axios"
import { getAssetGpaBuilder } from "@nifty-oss/asset"
import { umi } from "./umi"
import { publicKey } from "@metaplex-foundation/umi"

const client = new Helius(process.env.NEXT_PUBLIC_HELIUS_API_KEY!)

async function getByCollection(collection: string, page: number) {
  return await client.rpc.getAssetsByGroup({
    groupKey: "collection",
    groupValue: collection,
    page,
    displayOptions: {
      showGrandTotal: true,
    },
  })
}

async function getByCreator(creator: string, page: number) {
  return await client.rpc.getAssetsByCreator({
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
    console.log(result)
    total = result.grand_total as any as number
    nfts.push(...result.items)
    page++
  }

  return nfts
}

async function getFungiblesByOwner(ownerAddress: string, page: number) {
  try {
    const result = await client.rpc.searchAssets({
      ownerAddress,
      page,
      tokenType: "fungible",
    } as any)
    return result
  } catch (err) {
    console.log(err)
  }
}

const url = "https://perfect-cordy-fast-mainnet.helius-rpc.com/"

export async function getPriorityFeesForTx(tx: string, feeLevel: PriorityFees) {
  const { data } = await axios.post(url, {
    jsonrpc: "2.0",
    id: "1",
    method: "getPriorityFeeEstimate",
    params: [
      {
        transaction: tx,
        options: { priorityLevel: feeLevel },
      },
    ],
  })

  return data?.result?.priorityFeeEstimate || 0
}

async function getByOwner(ownerAddress: string, page: number) {
  try {
    const result = await client.rpc.getAssetsByOwner({
      ownerAddress,
      page,
      displayOptions: {
        showGrandTotal: true,
        showUnverifiedCollections: true,
        showCollectionMetadata: true,
        // showFungible: true,
        // showNativeBalance: true,
      },
    } as any)
    return result
  } catch (err) {
    console.log(err)
  }
}

export async function getAllByOwner(owner: string) {
  const nfts = []
  let page = 1
  let result
  while ((result = await getByOwner(owner, page++))?.items.length) {
    nfts.push(...result.items)
  }

  return nfts
}

export async function getAllFungiblesByOwner(owner: string) {
  const nfts = []
  let page = 1
  let result
  while ((result = await getFungiblesByOwner(owner, page++))?.items.length) {
    nfts.push(...result.items)
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
  let nfts: DAS.GetAssetResponse[] = []
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

export async function getNfts(mints: string[]) {
  const nfts = flatten(await Promise.all(chunk(mints, 1_000).map(async (ids) => client.rpc.getAssetBatch({ ids }))))

  const grouped = groupBy(nfts, (nft) => nft.ownership.owner)

  return mapValues(grouped, (value) => {
    return {
      amount: value.length,
      mints: value.map((v) => v.id),
    }
  })
}

export async function getDigitalAssets(mints: string[]) {
  const nfts = flatten(await Promise.all(chunk(mints, 1_000).map(async (ids) => client.rpc.getAssetBatch({ ids }))))

  return nfts
}

export async function getDigitalAsset(id: string) {
  const da = await client.rpc.getAsset({ id })

  return da
}

async function getDandiesForWallet(ownerAddress: string) {
  const dandies = await client.rpc.searchAssets({
    ownerAddress,
    grouping: ["collection", process.env.NEXT_PUBLIC_COLLECTION_ID!],
    page: 1,
    limit: 1000,
  })
  return dandies.items
}

export async function getDandies(wallets: string[]) {
  const dandies = flatten(await Promise.all(wallets.map((wallet) => getDandiesForWallet(wallet)))).filter(
    (d) => !d.burnt
  )

  return dandies
}

export async function getAssetProof(id: string) {
  return await client.rpc.getAssetProof({
    id,
  })
}
