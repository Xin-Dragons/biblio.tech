import { getAddressDecoder, type Address } from "@solana/kit"
import { mplCore } from "@biblio/solana-programs"
import type { LoadedNftData, Attribute } from "./types"
import { fetchNftMetadataJson, detectAssetStandard, getRpc } from "./rpc"

export function decodeLengthPrefixedString(
  data: Uint8Array,
  offset: number,
  maxLen = 1000
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

export async function loadCoreAsset(mintAddress: string): Promise<LoadedNftData> {
  const rpc = getRpc()
  const asset = await mplCore.fetchAssetV1(rpc, mintAddress as Address)

  const updateAuthority =
    asset.data.updateAuthority.__kind === "Address"
      ? asset.data.updateAuthority.fields[0]
      : asset.data.updateAuthority.__kind === "Collection"
        ? asset.data.updateAuthority.fields[0]
        : asset.data.owner

  const metadata = await fetchNftMetadataJson(asset.data.uri)

  return {
    mintAddress,
    standard: "core",
    name: asset.data.name.replace(/\0+$/, ""),
    symbol: metadata?.symbol || "",
    description: metadata?.description || "",
    uri: asset.data.uri,
    imageUrl: metadata?.image || null,
    externalUrl: metadata?.external_url || null,
    attributes: (metadata?.attributes || []).map((a) => ({ traitType: a.trait_type, value: a.value })),
    updateAuthority,
    owner: asset.data.owner,
    isMutable: true,
    royaltiesPercent: (metadata?.seller_fee_basis_points || 0) / 100,
    creators: metadata?.properties?.creators?.map((c) => ({ address: c.address, share: c.share })) || [],
    collectionAddress: null,
    ruleSetAddress: null,
  }
}

export async function loadPnftMetadata(mintAddress: string, accountData: Uint8Array): Promise<LoadedNftData> {
  let offset = 1
  const updateAuthorityBytes = accountData.slice(offset, offset + 32)
  const updateAuthority = getAddressDecoder().decode(updateAuthorityBytes) as string
  offset += 32 + 32

  const { value: name, bytesRead: nameBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += nameBytes

  const { value: symbol, bytesRead: symbolBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += symbolBytes

  const { value: uri, bytesRead: uriBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += uriBytes

  const view = new DataView(accountData.buffer, accountData.byteOffset + offset)
  const sellerFeeBasisPoints = view.getUint16(0, true)
  offset += 2

  const hasCreators = accountData[offset] === 1
  offset += 1

  const creators: Array<{ address: string; share: number }> = []
  if (hasCreators) {
    const creatorsLength = view.getUint32(offset - 2 - 1, true)
    offset += 4
    for (let i = 0; i < creatorsLength; i++) {
      const creatorBytes = accountData.slice(offset, offset + 32)
      const creatorAddress = getAddressDecoder().decode(creatorBytes) as string
      offset += 32
      offset += 1
      const share = accountData[offset]
      offset += 1
      creators.push({ address: creatorAddress, share })
    }
  }

  const metadata = await fetchNftMetadataJson(uri)

  return {
    mintAddress,
    standard: "pnft",
    name: name.replace(/\0+$/, ""),
    symbol: symbol.replace(/\0+$/, ""),
    description: metadata?.description || "",
    uri,
    imageUrl: metadata?.image || null,
    externalUrl: metadata?.external_url || null,
    attributes: (metadata?.attributes || []).map((a) => ({ traitType: a.trait_type, value: a.value })),
    updateAuthority,
    owner: "",
    isMutable: true,
    royaltiesPercent: sellerFeeBasisPoints / 100,
    creators,
    collectionAddress: null,
    ruleSetAddress: null,
  }
}

enum NiftyExtensionType {
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

function parseNiftyMetadataExtension(
  data: Uint8Array,
  offset: number,
  length: number
): { symbol: string; description: string; uri: string } {
  let pos = offset
  const endOffset = offset + length
  const maxStringLen = 1000

  let symbol = ""
  let description = ""
  let uri = ""

  const symbolResult = decodeLengthPrefixedString(data, pos, maxStringLen)
  if (symbolResult.bytesRead > 0) {
    symbol = symbolResult.value
    pos += symbolResult.bytesRead
  }

  if (pos < endOffset) {
    const descResult = decodeLengthPrefixedString(data, pos, maxStringLen)
    if (descResult.bytesRead > 0) {
      description = descResult.value
      pos += descResult.bytesRead
    }
  }

  if (pos < endOffset) {
    const uriResult = decodeLengthPrefixedString(data, pos, maxStringLen)
    if (uriResult.bytesRead > 0) {
      uri = uriResult.value
    }
  }

  if (!uri) {
    const extData = data.slice(offset, offset + length)
    const httpsMarker = new TextEncoder().encode("https://")
    for (let i = 0; i < extData.length - httpsMarker.length; i++) {
      let match = true
      for (let j = 0; j < httpsMarker.length; j++) {
        if (extData[i + j] !== httpsMarker[j]) {
          match = false
          break
        }
      }
      if (match) {
        const uriBytes = extData.slice(i)
        const nullIdx = uriBytes.indexOf(0)
        const actualUri = nullIdx > 0 ? uriBytes.slice(0, nullIdx) : uriBytes
        uri = new TextDecoder().decode(actualUri)
        break
      }
    }
  }

  return { symbol, description, uri }
}

function parseNiftyAttributesExtension(data: Uint8Array, offset: number, length: number): Attribute[] {
  const attributes: Attribute[] = []
  let pos = offset
  const endOffset = offset + length

  if (pos + 4 > endOffset) return attributes

  const view = new DataView(data.buffer, data.byteOffset + pos, 4)
  const count = view.getUint32(0, true)
  pos += 4

  for (let i = 0; i < count && pos + 4 <= endOffset; i++) {
    const nameView = new DataView(data.buffer, data.byteOffset + pos, 4)
    const nameLen = nameView.getUint32(0, true)
    pos += 4

    if (nameLen === 0 || pos + nameLen > endOffset) break

    const traitType = new TextDecoder().decode(data.slice(pos, pos + nameLen)).replace(/\0/g, "")
    pos += nameLen

    if (pos + 4 > endOffset) break

    const valueView = new DataView(data.buffer, data.byteOffset + pos, 4)
    const valueLen = valueView.getUint32(0, true)
    pos += 4

    if (pos + valueLen > endOffset) break

    const value = new TextDecoder().decode(data.slice(pos, pos + valueLen)).replace(/\0/g, "")
    pos += valueLen

    attributes.push({ traitType, value })
  }

  return attributes
}

function parseNiftyCreatorsExtension(
  data: Uint8Array,
  offset: number,
  length: number
): Array<{ address: string; share: number }> {
  const creators: Array<{ address: string; share: number }> = []
  let pos = offset
  const endOffset = offset + length

  if (pos + 4 > endOffset) return creators

  const view = new DataView(data.buffer, data.byteOffset + pos, 4)
  const count = view.getUint32(0, true)
  pos += 4

  for (let i = 0; i < count && pos + 33 <= endOffset; i++) {
    const address = getAddressDecoder().decode(data.slice(pos, pos + 32)) as string
    pos += 32
    const share = data[pos]
    pos += 1
    creators.push({ address, share })
  }

  return creators
}

function parseNiftyRoyaltiesExtension(data: Uint8Array, offset: number, length: number): number {
  if (length < 2) return 0
  const view = new DataView(data.buffer, data.byteOffset + offset, 2)
  return view.getUint16(0, true)
}

export async function loadNiftyAsset(mintAddress: string, accountData: Uint8Array): Promise<LoadedNftData> {
  if (accountData.length < 168) {
    throw new Error("Invalid Nifty asset: account data too short")
  }

  const owner = getAddressDecoder().decode(accountData.slice(4, 36)) as string
  const groupAddress = getAddressDecoder().decode(accountData.slice(36, 68)) as string
  const collectionAddress = groupAddress === "11111111111111111111111111111111" ? null : groupAddress
  const updateAuthority = getAddressDecoder().decode(accountData.slice(68, 100)) as string

  const nameBytes = accountData.slice(133, 168)
  const nullIndex = nameBytes.indexOf(0)
  const name = new TextDecoder().decode(nullIndex >= 0 ? nameBytes.slice(0, nullIndex) : nameBytes)

  let symbol = ""
  let description = ""
  let uri = ""
  let attributes: Attribute[] = []
  let creators: Array<{ address: string; share: number }> = []
  let royaltiesBasisPoints = 0

  let offset = 168
  while (offset + 16 < accountData.length) {
    if (offset + 16 > accountData.length) break

    const extView = new DataView(accountData.buffer, accountData.byteOffset + offset, 16)
    const extensionType = extView.getUint32(0, true)
    const extensionLength = extView.getUint32(4, true)
    const dataOffset = offset + 16

    if (extensionType === NiftyExtensionType.None || extensionLength === 0) break
    if (dataOffset + extensionLength > accountData.length) break

    if (extensionType === NiftyExtensionType.Metadata) {
      const metadata = parseNiftyMetadataExtension(accountData, dataOffset, extensionLength)
      symbol = metadata.symbol
      description = metadata.description
      uri = metadata.uri
    } else if (extensionType === NiftyExtensionType.Attributes) {
      attributes = parseNiftyAttributesExtension(accountData, dataOffset, extensionLength)
    } else if (extensionType === NiftyExtensionType.Creators) {
      creators = parseNiftyCreatorsExtension(accountData, dataOffset, extensionLength)
    } else if (extensionType === NiftyExtensionType.Royalties) {
      royaltiesBasisPoints = parseNiftyRoyaltiesExtension(accountData, dataOffset, extensionLength)
    }

    const paddedLength = Math.ceil(extensionLength / 8) * 8
    offset = dataOffset + paddedLength
  }

  const metadata = uri ? await fetchNftMetadataJson(uri) : null

  return {
    mintAddress,
    standard: "nifty",
    name: name.replace(/\0+$/, ""),
    symbol: symbol || metadata?.symbol || "",
    description: description || metadata?.description || "",
    uri,
    imageUrl: metadata?.image || null,
    externalUrl: metadata?.external_url || null,
    attributes:
      attributes.length > 0
        ? attributes
        : (metadata?.attributes || []).map((a) => ({ traitType: a.trait_type, value: a.value })),
    updateAuthority,
    owner,
    isMutable: true,
    royaltiesPercent:
      royaltiesBasisPoints > 0 ? royaltiesBasisPoints / 100 : (metadata?.seller_fee_basis_points || 0) / 100,
    creators:
      creators.length > 0
        ? creators
        : metadata?.properties?.creators?.map((c) => ({ address: c.address, share: c.share })) || [],
    collectionAddress,
    ruleSetAddress: null,
  }
}

export async function loadNft(mintAddress: string): Promise<LoadedNftData> {
  const detection = await detectAssetStandard(mintAddress)

  if (!detection) {
    throw new Error("Could not find NFT or determine asset standard")
  }

  const { standard, accountData } = detection

  switch (standard) {
    case "core":
      return loadCoreAsset(mintAddress)
    case "pnft":
      return loadPnftMetadata(mintAddress, accountData)
    case "nifty":
      return loadNiftyAsset(mintAddress, accountData)
  }
}
