import axios from "axios"
import { HELIUS_RPC, helius } from "./helius"

export async function fetchDigitalAssetsByOwner(ownerAddress: string, page = 1): Promise<any> {
  const { data } = await axios.post(HELIUS_RPC, {
    jsonrpc: "2.0",
    id: "1",
    method: "getAssetsByOwner",
    params: {
      ownerAddress,
      page: page,
      limit: 1_000,
      displayOptions: {
        showGrandTotal: true,
      },
    },
  })

  return data.result
}

export async function fetchDigitalAssetsByCollection(collection: string, page = 1): Promise<any[]> {
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
      displayOptions: {
        showGrandTotal: true,
      },
    },
  })

  return data.result
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
    id: "string",
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
  const batch = ids.map((id, i) => ({
    jsonrpc: "2.0",
    method: "getAsset",
    id: `my-id-${i}`,
    params: {
      id,
    },
  }))

  const { data } = await axios.post(HELIUS_RPC, batch)
  return {
    items: data.filter((item: any) => !item.error).map((item: any) => item.result),
  }
}
