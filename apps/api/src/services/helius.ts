interface HeliusAsset {
  id: string
  interface: string
  content?: {
    json_uri: string
    files?: Array<{ uri?: string; mime?: string }>
    metadata: {
      name: string
      symbol: string
      description?: string
      attributes?: Array<{ trait_type: string; value: string }>
      token_standard?: string
    }
    links?: {
      image?: string
      external_url?: string
    }
  }
  authorities?: Array<{ address: string; scopes: string[] }>
  compression?: {
    compressed: boolean
    tree: string
    leaf_id: number
  }
  grouping?: Array<{ group_key: string; group_value: string }>
  royalty?: {
    basis_points: number
    primary_sale_happened: boolean
  }
  ownership: {
    owner: string
    frozen: boolean
    delegated: boolean
    delegate?: string
  }
  creators?: Array<{ address: string; share: number; verified: boolean }>
  burnt: boolean
  mutable: boolean
  token_info?: {
    balance: number
    decimals: number
    price_info?: {
      price_per_token: number
      total_price: number
    }
  }
}

interface HeliusResponse {
  items: HeliusAsset[]
  total: number
  limit: number
  page?: number
  grand_total?: number
}

async function heliusRpc<T>(apiKey: string, method: string, params: unknown): Promise<T> {
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`Helius API error: ${response.statusText}`)
  }

  const data = await response.json<{ result: T; error?: { message: string } }>()

  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message}`)
  }

  return data.result
}

export const heliusService = {
  async getAssetsByOwner(apiKey: string, ownerAddress: string, page: number = 1): Promise<HeliusResponse> {
    return heliusRpc(apiKey, "getAssetsByOwner", {
      ownerAddress,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
        showUnverifiedCollections: true,
        showCollectionMetadata: true,
      },
    })
  },

  async getAsset(apiKey: string, id: string): Promise<HeliusAsset> {
    return heliusRpc(apiKey, "getAsset", { id })
  },

  async getAssetsByGroup(
    apiKey: string,
    groupKey: string,
    groupValue: string,
    page: number = 1
  ): Promise<HeliusResponse> {
    return heliusRpc(apiKey, "getAssetsByGroup", {
      groupKey,
      groupValue,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })
  },

  async getAssetBatch(apiKey: string, ids: string[]): Promise<HeliusAsset[]> {
    return heliusRpc(apiKey, "getAssetBatch", { ids })
  },

  async searchAssets(
    apiKey: string,
    params: {
      ownerAddress?: string
      grouping?: [string, string]
      tokenType?: "fungible" | "nonFungible" | "regularNft" | "compressedNft"
      page?: number
    }
  ): Promise<HeliusResponse> {
    return heliusRpc(apiKey, "searchAssets", {
      ...params,
      limit: 1000,
    })
  },
}
