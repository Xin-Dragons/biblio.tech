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
  image: string | null
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
 * Decodes a fixed-size null-terminated string from bytes
 * The string is stored directly without a length prefix, padded with nulls
 */
function decodeFixedString(data: Uint8Array, offset: number, maxLength: number): string {
  const strBytes = data.slice(offset, offset + maxLength)
  const nullIndex = strBytes.indexOf(0)
  const actualBytes = nullIndex >= 0 ? strBytes.slice(0, nullIndex) : strBytes
  return new TextDecoder().decode(actualBytes)
}

/**
 * Decodes a length-prefixed string from bytes
 * Format: 4 byte little-endian length prefix followed by UTF-8 bytes
 */
function decodeLengthPrefixedString(
  data: Uint8Array,
  offset: number,
  maxLen: number
): { value: string; bytesRead: number } {
  if (offset + 4 > data.length) {
    return { value: "", bytesRead: 0 }
  }

  const view = new DataView(data.buffer, data.byteOffset + offset, 4)
  const length = view.getUint32(0, true)

  if (length === 0) {
    return { value: "", bytesRead: 4 }
  }

  if (length > maxLen || offset + 4 + length > data.length) {
    return { value: "", bytesRead: 4 }
  }

  const strBytes = data.slice(offset + 4, offset + 4 + length)
  const value = new TextDecoder().decode(strBytes).replace(/\0/g, "")
  return { value, bytesRead: 4 + length }
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
 * Nifty uses length-prefixed strings with 4-byte LE length
 * Format: symbol (len + bytes) + description (len + bytes) + uri (len + bytes)
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

  const maxStringLen = 1000

  // Read symbol
  const symbolResult = decodeLengthPrefixedString(data, pos, maxStringLen)
  if (symbolResult.bytesRead > 0) {
    symbol = symbolResult.value || null
    pos += symbolResult.bytesRead
  }

  // Read description
  if (pos < endOffset) {
    const descResult = decodeLengthPrefixedString(data, pos, maxStringLen)
    if (descResult.bytesRead > 0) {
      description = descResult.value || null
      pos += descResult.bytesRead
    }
  }

  // Read uri
  if (pos < endOffset) {
    const uriResult = decodeLengthPrefixedString(data, pos, maxStringLen)
    if (uriResult.bytesRead > 0) {
      uri = uriResult.value || null
    }
  }

  // Fallback: if we didn't find URI with length-prefix, search for https://
  if (!uri) {
    const extData = data.slice(offset, offset + length)
    const httpsMarker = new TextEncoder().encode("https://")
    let httpsIndex = -1
    for (let i = 0; i < extData.length - httpsMarker.length; i++) {
      let match = true
      for (let j = 0; j < httpsMarker.length; j++) {
        if (extData[i + j] !== httpsMarker[j]) {
          match = false
          break
        }
      }
      if (match) {
        httpsIndex = i
        break
      }
    }
    if (httpsIndex >= 0) {
      const uriBytes = extData.slice(httpsIndex)
      const nullIndex = uriBytes.indexOf(0)
      const actualUri = nullIndex > 0 ? uriBytes.slice(0, nullIndex) : uriBytes
      uri = new TextDecoder().decode(actualUri)
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

  // Name is stored as fixed 35-byte field at offset 133 (null-terminated, no length prefix)
  const name = decodeFixedString(data, 133, 35)

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
    image: null, // Will be populated by fetchNiftyMetadata
    description,
    symbol,
    attributes,
  }
}

type NiftyMetadata = {
  image?: string
  name?: string
  description?: string
  attributes?: Array<{ trait_type: string; value: string }>
  properties?: {
    files?: Array<{ uri?: string; type?: string }>
  }
}

/**
 * Fetches off-chain metadata JSON for nifty assets and extracts image URLs
 * Handles arweave URLs that may require redirect following
 */
async function fetchNiftyMetadata(assets: NiftyAsset[]): Promise<void> {
  const assetsWithUri = assets.filter((a) => a.uri)
  if (assetsWithUri.length === 0) return

  const BATCH_SIZE = 10
  for (let i = 0; i < assetsWithUri.length; i += BATCH_SIZE) {
    const batch = assetsWithUri.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (asset) => {
        if (!asset.uri) return
        try {
          const response = await fetch(asset.uri, {
            redirect: "follow",
            headers: { Accept: "application/json" },
          })
          if (response.ok) {
            const contentType = response.headers.get("content-type") ?? ""
            if (contentType.includes("application/json") || contentType.includes("text/plain")) {
              const metadata = (await response.json()) as NiftyMetadata
              if (metadata.image) {
                asset.image = metadata.image
              } else if (metadata.properties?.files?.[0]?.uri) {
                asset.image = metadata.properties.files[0].uri
              }
            } else if (contentType.includes("image/")) {
              asset.image = asset.uri
            }
          }
        } catch {
          // Ignore metadata fetch errors, image will remain null
        }
      })
    )
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

  // Fetch off-chain metadata to get actual image URLs
  await fetchNiftyMetadata(assets)

  return assets
}

/**
 * Fetches all nifty assets where wallet has update authority
 * For Nifty, update authority works as follows:
 * - Standalone assets (no group): asset's authority field
 * - Grouped assets: the GROUP's authority is the update authority
 *
 * So we need to:
 * 1. Find collections where user is authority → get all assets in those collections
 * 2. Find standalone assets where user is direct authority
 */
export async function getNiftyAssetsByAuthority(env: Env, authority: string): Promise<NiftyAsset[]> {
  const rpc = getClient(env)

  type Base58EncodedBytes = string & {
    readonly "__brand:@solana/kit": "Base58EncodedBytes"
    readonly "__stringEncoding:@solana/kit": "base58"
  }

  const base64Encoder = getBase64Encoder()
  const assets: NiftyAsset[] = []

  // Step 1: Find all collections where user is authority (at offset 68)
  const collectionsResponse = await rpc
    .getProgramAccounts(NIFTY_PROGRAM_ID, {
      encoding: "base64",
      filters: [{ memcmp: { offset: 68n, bytes: authority as Base58EncodedBytes, encoding: "base58" } }],
    })
    .send()

  const userCollections: string[] = []
  for (const account of collectionsResponse) {
    const [dataBase64] = account.account.data
    const rawData = base64Encoder.encode(dataBase64)
    const data = new Uint8Array(rawData)
    const decodedAsset = decodeNiftyAsset(data, account.pubkey)
    if (decodedAsset && decodedAsset.authority === authority) {
      // Check if this is a collection (no group) or standalone asset
      if (!decodedAsset.group) {
        // This could be a collection OR a standalone asset
        // Collections have assets pointing to them via group field
        userCollections.push(account.pubkey)
        // Also add as a potential standalone asset
        assets.push(decodedAsset)
      }
    }
  }

  // Step 2: For each collection the user owns, find all assets in that collection
  for (const collectionAddress of userCollections) {
    const assetsInCollection = await rpc
      .getProgramAccounts(NIFTY_PROGRAM_ID, {
        encoding: "base64",
        filters: [{ memcmp: { offset: 36n, bytes: collectionAddress as Base58EncodedBytes, encoding: "base58" } }],
      })
      .send()

    for (const account of assetsInCollection) {
      const [dataBase64] = account.account.data
      const rawData = base64Encoder.encode(dataBase64)
      const data = new Uint8Array(rawData)
      const decodedAsset = decodeNiftyAsset(data, account.pubkey)
      if (decodedAsset && decodedAsset.group === collectionAddress) {
        assets.push(decodedAsset)
      }
    }
  }

  // Dedupe by address (in case collection was added as standalone)
  const uniqueAssets = new Map<string, NiftyAsset>()
  for (const asset of assets) {
    uniqueAssets.set(asset.address, asset)
  }

  const result = Array.from(uniqueAssets.values())

  // Fetch off-chain metadata to get actual image URLs
  await fetchNiftyMetadata(result)

  return result
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
          image: null, // Will be populated below
          symbol: decodedAsset.symbol,
        })
        // Store uri temporarily for metadata fetch
        ;(collections.get(address) as NiftyCollection & { uri?: string }).uri = decodedAsset.uri ?? undefined
      }
    }
  }

  // Fetch metadata for collections to get actual image URLs
  const collectionsArray = Array.from(collections.values())
  await Promise.all(
    collectionsArray.map(async (collection) => {
      const uri = (collection as NiftyCollection & { uri?: string }).uri
      if (!uri) return
      try {
        const response = await fetch(uri, {
          redirect: "follow",
          headers: { Accept: "application/json" },
        })
        if (response.ok) {
          const contentType = response.headers.get("content-type") ?? ""
          if (contentType.includes("application/json") || contentType.includes("text/plain")) {
            const metadata = (await response.json()) as { image?: string }
            if (metadata.image) {
              collection.image = metadata.image
            }
          } else if (contentType.includes("image/")) {
            collection.image = uri
          }
        }
      } catch {
        // Ignore metadata fetch errors
      }
      delete (collection as NiftyCollection & { uri?: string }).uri
    })
  )

  return collections
}
