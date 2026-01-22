/**
 * Nifty Asset Service
 * Fetches nifty-oss assets by owner using @solana/kit
 *
 * Nifty assets use a non-standard account structure with 168-byte minimum:
 * - discriminator: 1 byte (0) - always 0x01 for Asset accounts
 * - state: 1 byte (1) - 0=Unlocked, 1=Locked
 * - standard: 1 byte (2) - 0=NonFungible, 1=Managed, 2=Soulbound, 3=Proxied
 * - mutable: 1 byte (3) - 0=false, 1=true
 * - owner: 32 bytes (4-35)
 * - group: 32 bytes (36-67) - collection/group address (all zeros if none)
 * - authority: 32 bytes (68-99)
 * - delegate: 33 bytes (100-132) - 1 byte flag + 32 bytes address
 * - name: 35 bytes (133-167) - 4 byte length prefix + up to 31 chars
 *
 * Extensions follow after the base 168 bytes, each with 4 byte header:
 * - type: 4 bytes (ExtensionType enum)
 * - length: 4 bytes
 * - boundary: 4 bytes
 * - padding: 4 bytes
 * - data: variable
 */

import { type Address, getBase64Encoder, getBase58Decoder } from "@solana/kit"
import { asset } from "@biblio/solana-programs"
import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

export const NIFTY_PROGRAM_ID = asset.ASSET_PROGRAM_PROGRAM_ADDRESS

function getClient(env: Env): SolanaClient {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  return getRpc(rpcUrl)
}

/**
 * Nifty Asset discriminator - first byte is 0x01 for Asset accounts
 */
const ASSET_DISCRIMINATOR = 1

/**
 * Extension types as defined in nifty-oss spec
 */
enum ExtensionType {
  None = 0,
  Attributes = 1,
  Blob = 2,
  Creators = 3,
  Links = 4,
  Metadata = 5,
  Grouping = 6,
  Royalties = 7,
  Manager = 8,
  Proxy = 9,
  Properties = 10,
  Bucket = 11,
}

export type NiftyAssetState = "Unlocked" | "Locked"
export type NiftyAssetStandard = "NonFungible" | "Managed" | "Soulbound" | "Proxied"

export type NiftyAttribute = {
  name: string
  value: string
}

export type NiftyAsset = {
  address: string
  name: string
  state: NiftyAssetState
  standard: NiftyAssetStandard
  mutable: boolean
  owner: string
  group: string | null
  authority: string
  delegate: string | null
  uri: string | null
  description: string | null
  symbol: string | null
  attributes: NiftyAttribute[]
}

function decodeAddress(data: Uint8Array, offset: number): string {
  const bytes = data.slice(offset, offset + 32)
  const base58Decoder = getBase58Decoder()
  return base58Decoder.decode(bytes)
}

function isNullAddress(address: string): boolean {
  return address === "11111111111111111111111111111111"
}

/**
 * Decodes a string from bytes using the nifty format
 * Format: 4 byte little-endian length prefix followed by UTF-8 bytes
 */
function decodeString(data: Uint8Array, offset: number, maxLength: number): string {
  const view = new DataView(data.buffer, data.byteOffset + offset, 4)
  const length = view.getUint32(0, true)

  if (length === 0 || length > maxLength) {
    return ""
  }

  const strBytes = data.slice(offset + 4, offset + 4 + length)
  return new TextDecoder().decode(strBytes).replace(/\0/g, "")
}

/**
 * Parse extension header from data
 * Header: 4 bytes type, 4 bytes length, 4 bytes boundary, 4 bytes padding
 */
function parseExtensionHeader(
  data: Uint8Array,
  offset: number
): { type: ExtensionType; length: number; dataOffset: number } | null {
  if (offset + 16 > data.length) {
    return null
  }

  const view = new DataView(data.buffer, data.byteOffset + offset, 16)
  const type = view.getUint32(0, true) as ExtensionType
  const length = view.getUint32(4, true)

  return {
    type,
    length,
    dataOffset: offset + 16,
  }
}

/**
 * Parse Metadata extension
 * Format: 4 byte symbol length + symbol + 4 byte description length + description + 4 byte uri length + uri
 */
function parseMetadataExtension(
  data: Uint8Array,
  offset: number,
  length: number
): {
  symbol: string | null
  description: string | null
  uri: string | null
} {
  let pos = offset
  const endOffset = offset + length

  let symbol: string | null = null
  let description: string | null = null
  let uri: string | null = null

  if (pos + 4 <= endOffset) {
    const view = new DataView(data.buffer, data.byteOffset + pos, 4)
    const symbolLen = view.getUint32(0, true)
    pos += 4
    if (symbolLen > 0 && pos + symbolLen <= endOffset) {
      symbol = new TextDecoder().decode(data.slice(pos, pos + symbolLen)).replace(/\0/g, "")
      pos += symbolLen
    }
  }

  if (pos + 4 <= endOffset) {
    const view = new DataView(data.buffer, data.byteOffset + pos, 4)
    const descLen = view.getUint32(0, true)
    pos += 4
    if (descLen > 0 && pos + descLen <= endOffset) {
      description = new TextDecoder().decode(data.slice(pos, pos + descLen)).replace(/\0/g, "")
      pos += descLen
    }
  }

  if (pos + 4 <= endOffset) {
    const view = new DataView(data.buffer, data.byteOffset + pos, 4)
    const uriLen = view.getUint32(0, true)
    pos += 4
    if (uriLen > 0 && pos + uriLen <= endOffset) {
      uri = new TextDecoder().decode(data.slice(pos, pos + uriLen)).replace(/\0/g, "")
    }
  }

  return { symbol, description, uri }
}

/**
 * Parse Attributes extension
 * Format: 4 byte count, then array of (4 byte name length + name + 4 byte value length + value)
 */
function parseAttributesExtension(data: Uint8Array, offset: number, length: number): NiftyAttribute[] {
  const attributes: NiftyAttribute[] = []
  let pos = offset
  const endOffset = offset + length

  if (pos + 4 > endOffset) {
    return attributes
  }

  const view = new DataView(data.buffer, data.byteOffset + pos, 4)
  const count = view.getUint32(0, true)
  pos += 4

  for (let i = 0; i < count && pos + 4 <= endOffset; i++) {
    const nameView = new DataView(data.buffer, data.byteOffset + pos, 4)
    const nameLen = nameView.getUint32(0, true)
    pos += 4

    if (nameLen === 0 || pos + nameLen > endOffset) break

    const name = new TextDecoder().decode(data.slice(pos, pos + nameLen)).replace(/\0/g, "")
    pos += nameLen

    if (pos + 4 > endOffset) break

    const valueView = new DataView(data.buffer, data.byteOffset + pos, 4)
    const valueLen = valueView.getUint32(0, true)
    pos += 4

    if (pos + valueLen > endOffset) break

    const value = new TextDecoder().decode(data.slice(pos, pos + valueLen)).replace(/\0/g, "")
    pos += valueLen

    attributes.push({ name, value })
  }

  return attributes
}

/**
 * Decodes a nifty asset account from raw bytes
 */
function decodeNiftyAsset(data: Uint8Array, address: string): NiftyAsset | null {
  if (data.length < 168) {
    return null
  }

  const discriminator = data[0]
  if (discriminator !== ASSET_DISCRIMINATOR) {
    return null
  }

  const stateValue = data[1]
  const state: NiftyAssetState = stateValue === 1 ? "Locked" : "Unlocked"

  const standardValue = data[2]
  const standardMap: NiftyAssetStandard[] = ["NonFungible", "Managed", "Soulbound", "Proxied"]
  const standard: NiftyAssetStandard = standardMap[standardValue] ?? "NonFungible"

  const mutable = data[3] === 1

  const owner = decodeAddress(data, 4)
  const groupAddr = decodeAddress(data, 36)
  const group = isNullAddress(groupAddr) ? null : groupAddr
  const authority = decodeAddress(data, 68)

  const delegateFlag = data[100]
  const delegate = delegateFlag === 1 ? decodeAddress(data, 101) : null

  const name = decodeString(data, 133, 31)

  let uri: string | null = null
  let description: string | null = null
  let symbol: string | null = null
  let attributes: NiftyAttribute[] = []

  let extOffset = 168
  while (extOffset + 16 < data.length) {
    const header = parseExtensionHeader(data, extOffset)
    if (!header || header.type === ExtensionType.None || header.length === 0) {
      break
    }

    if (header.type === ExtensionType.Metadata) {
      const metadata = parseMetadataExtension(data, header.dataOffset, header.length)
      uri = metadata.uri
      description = metadata.description
      symbol = metadata.symbol
    } else if (header.type === ExtensionType.Attributes) {
      attributes = parseAttributesExtension(data, header.dataOffset, header.length)
    }

    const paddedLength = Math.ceil(header.length / 8) * 8
    extOffset = header.dataOffset + paddedLength
  }

  return {
    address,
    name,
    state,
    standard,
    mutable,
    owner,
    group,
    authority,
    delegate,
    uri,
    description,
    symbol,
    attributes,
  }
}

/**
 * Fetches all nifty assets owned by a wallet
 */
export async function getNiftyAssetsByOwner(env: Env, wallet: string): Promise<NiftyAsset[]> {
  const rpc = getClient(env)

  type Base58EncodedBytes = string & {
    readonly "__brand:@solana/kit": "Base58EncodedBytes"
    readonly "__stringEncoding:@solana/kit": "base58"
  }

  const response = await rpc
    .getProgramAccounts(NIFTY_PROGRAM_ID, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 4n, bytes: wallet as Base58EncodedBytes, encoding: "base58" } }],
    })
    .send()

  const base64Encoder = getBase64Encoder()
  const assets: NiftyAsset[] = []

  for (const account of response) {
    const [dataBase64] = account.account.data
    const rawData = base64Encoder.encode(dataBase64)
    const data = new Uint8Array(rawData)

    const decodedAsset = decodeNiftyAsset(data, account.pubkey)
    if (decodedAsset && decodedAsset.owner === wallet) {
      assets.push(decodedAsset)
    }
  }

  return assets
}

export type NiftyCollection = {
  address: string
  name: string
  image: string | null
  symbol: string | null
}

/**
 * Fetches nifty collection metadata for a list of collection addresses
 * Collections in nifty-oss are also asset accounts referenced by the `group` field
 */
export async function fetchNiftyCollections(
  env: Env,
  collectionMints: string[]
): Promise<Map<string, NiftyCollection>> {
  const collections = new Map<string, NiftyCollection>()

  if (collectionMints.length === 0) {
    return collections
  }

  const uniqueMints = [...new Set(collectionMints)]

  const rpc = getClient(env)
  const base64Encoder = getBase64Encoder()
  const BATCH_SIZE = 100

  for (let i = 0; i < uniqueMints.length; i += BATCH_SIZE) {
    const batch = uniqueMints.slice(i, i + BATCH_SIZE) as Address[]

    const response = await rpc.getMultipleAccounts(batch, { encoding: "base64" }).send()

    for (let j = 0; j < response.value.length; j++) {
      const accountInfo = response.value[j]
      const address = batch[j]

      if (!accountInfo || !accountInfo.data) {
        continue
      }

      const [dataBase64] = accountInfo.data
      const rawData = base64Encoder.encode(dataBase64)
      const data = new Uint8Array(rawData)

      const decodedAsset = decodeNiftyAsset(data, address)
      if (decodedAsset) {
        collections.set(address, {
          address,
          name: decodedAsset.name,
          image: decodedAsset.uri,
          symbol: decodedAsset.symbol,
        })
      }
    }
  }

  return collections
}
