import {
  getProgramDerivedAddress,
  getAddressEncoder,
  createRpc,
  createJsonRpcApi,
  type Address,
  type SolanaRpcApiMainnet,
  type Rpc,
  type RpcTransport,
} from "@solana/kit"
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import {
  TOKEN_METADATA_PROGRAM_ADDRESS,
  MPL_CORE_PROGRAM_ADDRESS,
  NIFTY_ASSET_PROGRAM_ADDRESS,
  type AssetStandard,
} from "./types"
import { API_BASE } from "@/lib/api"

export async function rpcRequest<T>(method: string, params: unknown[] | Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params,
    }),
  })
  const data = (await response.json()) as { result?: T; error?: { message: string } }
  if (data.error) {
    throw new Error(data.error.message)
  }
  return data.result as T
}

const proxyTransport: RpcTransport = async ({ payload }) => {
  const response = await fetch(`${API_BASE}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return await response.json()
}

let cachedRpc: Rpc<SolanaRpcApiMainnet> | null = null

export function getRpc(): Rpc<SolanaRpcApiMainnet> {
  if (!cachedRpc) {
    const api = createJsonRpcApi<SolanaRpcApiMainnet>()
    cachedRpc = createRpc({ api, transport: proxyTransport })
  }
  return cachedRpc
}

export interface AccountInfo {
  data: [string, string]
  owner: string
  lamports: number
  executable: boolean
  rentEpoch: number
}

export async function getMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: ["metadata", getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS), getAddressEncoder().encode(mint)],
  })
  return pda
}

export async function getMasterEditionPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      "metadata",
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      "edition",
    ],
  })
  return pda
}

export async function getTokenRecordPda(mint: Address, tokenAccount: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      "metadata",
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      "token_record",
      getAddressEncoder().encode(tokenAccount),
    ],
  })
  return pda
}

export async function detectAssetStandard(mintAddress: string): Promise<{
  standard: AssetStandard
  accountData: Uint8Array
  owner: string
} | null> {
  const accountInfo = await rpcRequest<{ value: AccountInfo | null }>("getAccountInfo", [
    mintAddress,
    { encoding: "base64" },
  ])

  if (!accountInfo.value) {
    return null
  }

  const owner = accountInfo.value.owner
  const dataBase64 = accountInfo.value.data[0]

  if (!dataBase64) {
    return null
  }

  const accountData = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0))

  if (accountData.length < 32) {
    return null
  }

  if (owner === MPL_CORE_PROGRAM_ADDRESS) {
    return { standard: "core", accountData, owner }
  }

  if (owner === NIFTY_ASSET_PROGRAM_ADDRESS) {
    return { standard: "nifty", accountData, owner }
  }

  if (owner === TOKEN_PROGRAM_ADDRESS) {
    const metadataPda = await getMetadataPda(mintAddress as Address)
    const metadataAccountInfo = await rpcRequest<{ value: AccountInfo | null }>("getAccountInfo", [
      metadataPda,
      { encoding: "base64" },
    ])

    if (metadataAccountInfo.value && metadataAccountInfo.value.owner === TOKEN_METADATA_PROGRAM_ADDRESS) {
      const metadataBase64 = metadataAccountInfo.value.data[0]
      if (!metadataBase64) {
        return null
      }
      const metadataData = Uint8Array.from(atob(metadataBase64), (c) => c.charCodeAt(0))
      if (metadataData.length < 32) {
        return null
      }
      return { standard: "pnft", accountData: metadataData, owner: TOKEN_METADATA_PROGRAM_ADDRESS }
    }
  }

  return null
}

export async function fetchNftMetadataJson(uri: string): Promise<{
  name?: string
  symbol?: string
  description?: string
  image?: string
  external_url?: string
  attributes?: Array<{ trait_type: string; value: string }>
  seller_fee_basis_points?: number
  properties?: {
    creators?: Array<{ address: string; share: number }>
  }
} | null> {
  try {
    const response = await fetch(uri)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function checkAccountExists(address: string): Promise<boolean> {
  const accountInfo = await rpcRequest<{ value: AccountInfo | null }>("getAccountInfo", [
    address,
    { encoding: "base64" },
  ])
  return accountInfo.value !== null
}
