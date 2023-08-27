import axios from "axios"

export async function fetchDigitalAssetsByOwner(ownerAddress: string, page = 1): Promise<any[]> {
  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, {
    jsonrpc: "2.0",
    id: "1",
    method: "getAssetsByOwner",
    params: {
      ownerAddress,
      page: page,
      limit: 1_000,
    },
  })

  if (data.result.total < 1000) {
    return data.result.items
  }

  return [...data.result.items, ...(await fetchDigitalAssetsByOwner(ownerAddress, page + 1))]
}

export async function fetchDigitalAssetsByCollection(collection: string, page = 1): Promise<any[]> {
  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, {
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

  if (data.result.total < 1000) {
    return data.result.items
  }

  return [...data.result.items, ...(await fetchDigitalAssetsByCollection(collection, page + 1))]
}

export async function fetchDigitalAssetByCollection(collection: string): Promise<any> {
  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, {
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
  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, {
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
    },
  })

  return data.result.items
}

export async function getDigitalAsset(mintAddress: string) {
  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, {
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
  const batch = ids.map((id, i) => ({
    jsonrpc: "2.0",
    method: "getAsset",
    id: `my-id-${i}`,
    params: {
      id,
    },
  }))

  const { data } = await axios.post(`https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`, batch)
  return data.filter((item: any) => !item.error).map((item: any) => item.result)
}
