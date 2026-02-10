import {
  generateKeyPairSigner,
  type Address,
  type TransactionSigner,
  type KeyPairSigner,
  type Instruction,
} from "@solana/kit"
import { getCreateAccountInstruction } from "@solana-program/system"
import { getInitializeMint2Instruction, TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda } from "@solana-program/token"
import { mplCore, tokenMetadata, asset } from "@biblio/solana-programs"
import { prepareAndSendTransaction } from "@/lib/transaction"
import {
  AUTH_RULES_PROGRAM_ADDRESS,
  RULE_SET_ADDRESSES,
  MINT_ACCOUNT_SIZE,
  MINT_RENT_LAMPORTS,
  type Attribute,
  type RuleSetOption,
} from "./types"
import { getMetadataPda, getMasterEditionPda, getTokenRecordPda } from "./rpc"

export function encodeLengthPrefixedString(str: string): Uint8Array {
  const textEncoder = new TextEncoder()
  const textBytes = textEncoder.encode(str)
  const lengthBytes = new Uint8Array(4)
  new DataView(lengthBytes.buffer).setUint32(0, textBytes.length, true)
  const combined = new Uint8Array(4 + textBytes.length)
  combined.set(lengthBytes)
  combined.set(textBytes, 4)
  return combined
}

export function encodeMetadataExtension(symbol: string, description: string, uri: string): Uint8Array {
  const symbolBytes = encodeLengthPrefixedString(symbol)
  const descriptionBytes = encodeLengthPrefixedString(description)
  const uriBytes = encodeLengthPrefixedString(uri)

  const combined = new Uint8Array(symbolBytes.length + descriptionBytes.length + uriBytes.length)
  combined.set(symbolBytes)
  combined.set(descriptionBytes, symbolBytes.length)
  combined.set(uriBytes, symbolBytes.length + descriptionBytes.length)

  return combined
}

export function encodeAttributesExtension(attributes: Attribute[]): Uint8Array {
  const countBytes = new Uint8Array(4)
  new DataView(countBytes.buffer).setUint32(0, attributes.length, true)

  let totalAttrSize = 4
  const attrByteArrays: Uint8Array[] = []

  for (const attr of attributes) {
    const nameBytes = encodeLengthPrefixedString(attr.traitType)
    const valueBytes = encodeLengthPrefixedString(attr.value)
    attrByteArrays.push(nameBytes)
    attrByteArrays.push(valueBytes)
    totalAttrSize += nameBytes.length + valueBytes.length
  }

  const combined = new Uint8Array(totalAttrSize)
  combined.set(countBytes)

  let offset = 4
  for (const bytes of attrByteArrays) {
    combined.set(bytes, offset)
    offset += bytes.length
  }

  return combined
}

// Nifty Asset Creators extension: count (4 bytes) + [{address (32), verified (1), share (1)}]
export function encodeCreatorsExtension(
  creators: Array<{ address: Address; percentage: number }>,
  accountAddress: string
): Uint8Array {
  const count = creators.length
  const creatorSize = 32 + 1 + 1 // address + verified + share
  const totalSize = 4 + count * creatorSize

  const result = new Uint8Array(totalSize)
  const view = new DataView(result.buffer)

  view.setUint32(0, count, true)

  let offset = 4
  for (const creator of creators) {
    // Decode base58 address to bytes
    const addressBytes = decodeBase58Address(creator.address)
    result.set(addressBytes, offset)
    offset += 32

    // Verified flag - true if this is the account creating the asset
    result[offset] = creator.address === accountAddress ? 1 : 0
    offset += 1

    // Share (percentage as u8)
    result[offset] = creator.percentage
    offset += 1
  }

  return result
}

// Nifty Asset Links extension: count (4 bytes) + [{name (string), uri (string)}]
export function encodeLinksExtension(links: Array<{ name: string; url: string }>): Uint8Array {
  const countBytes = new Uint8Array(4)
  new DataView(countBytes.buffer).setUint32(0, links.length, true)

  let totalSize = 4
  const linkByteArrays: Uint8Array[] = []

  for (const link of links) {
    const nameBytes = encodeLengthPrefixedString(link.name)
    const urlBytes = encodeLengthPrefixedString(link.url)
    linkByteArrays.push(nameBytes)
    linkByteArrays.push(urlBytes)
    totalSize += nameBytes.length + urlBytes.length
  }

  const result = new Uint8Array(totalSize)
  result.set(countBytes)

  let offset = 4
  for (const bytes of linkByteArrays) {
    result.set(bytes, offset)
    offset += bytes.length
  }

  return result
}

// Nifty Asset Royalties extension: basisPoints (u64, 8 bytes) + count (4 bytes) + [{address (32), share (1)}]
export function encodeRoyaltiesExtension(
  basisPoints: number,
  creators: Array<{ address: Address; percentage: number }>
): Uint8Array {
  const count = creators.length
  const creatorSize = 32 + 1 // address + share
  const totalSize = 8 + 4 + count * creatorSize

  const result = new Uint8Array(totalSize)
  const view = new DataView(result.buffer)

  // Basis points as u64 (little endian)
  view.setBigUint64(0, BigInt(basisPoints), true)

  // Creator count
  view.setUint32(8, count, true)

  let offset = 12
  for (const creator of creators) {
    const addressBytes = decodeBase58Address(creator.address)
    result.set(addressBytes, offset)
    offset += 32

    result[offset] = creator.percentage
    offset += 1
  }

  return result
}

// Helper to decode base58 address to bytes
function decodeBase58Address(address: Address): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  const bytes: number[] = []
  for (const char of address) {
    let carry = ALPHABET.indexOf(char)
    if (carry < 0) throw new Error(`Invalid base58 character: ${char}`)
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58
      bytes[i] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  // Handle leading zeros
  for (const char of address) {
    if (char !== "1") break
    bytes.push(0)
  }
  const result = new Uint8Array(32)
  const decoded = new Uint8Array(bytes.reverse())
  result.set(decoded, 32 - decoded.length)
  return result
}

export interface MintCoreAssetParams {
  name: string
  uri: string
  account: string
  feePayer: TransactionSigner
  collectionAddress?: string
  royaltiesPercent: number
  creators: Array<{ address: Address; percentage: number }>
  isCollectionNft: boolean
  customKeypair?: KeyPairSigner | null
  attributes?: Array<{ traitType: string; value: string }>
  storeAttributesOnchain?: boolean
  storeCreatorsOnchain?: boolean
  isSoulbound?: boolean
  isImmutableMetadata?: boolean
  preventNewPlugins?: boolean
}

export async function mintCoreAsset(params: MintCoreAssetParams): Promise<{ mintAddress: string; signature: string }> {
  const {
    name,
    uri,
    account,
    feePayer,
    collectionAddress,
    royaltiesPercent,
    creators,
    isCollectionNft,
    customKeypair,
    attributes,
    storeAttributesOnchain,
    storeCreatorsOnchain,
    isSoulbound,
    isImmutableMetadata,
    preventNewPlugins,
  } = params

  const assetSigner = customKeypair ?? (await generateKeyPairSigner())

  const plugins: mplCore.PluginAuthorityPairArgs[] = []

  if (!isCollectionNft && royaltiesPercent > 0 && creators.length > 0) {
    plugins.push({
      plugin: mplCore.plugin("Royalties", [
        {
          basisPoints: Math.round(royaltiesPercent * 100),
          creators,
          ruleSet: mplCore.ruleSet("None"),
        },
      ]),
      authority: null,
    })
  }

  if (!isCollectionNft && storeAttributesOnchain && attributes && attributes.length > 0) {
    const filteredAttrs = attributes.filter((a) => a.traitType.trim() && a.value.trim())
    if (filteredAttrs.length > 0) {
      plugins.push({
        plugin: mplCore.plugin("Attributes", [
          { attributeList: filteredAttrs.map((a) => ({ key: a.traitType, value: a.value })) },
        ]),
        authority: null,
      })
    }
  }

  // VerifiedCreators plugin
  if (!isCollectionNft && storeCreatorsOnchain && creators.length > 0) {
    plugins.push({
      plugin: mplCore.plugin("VerifiedCreators", [
        {
          signatures: creators.map((c) => ({
            address: c.address,
            verified: c.address === (account as Address),
          })),
        },
      ]),
      authority: null,
    })
  }

  // PermanentFreezeDelegate plugin (soulbound)
  if (!isCollectionNft && isSoulbound) {
    plugins.push({
      plugin: mplCore.plugin("PermanentFreezeDelegate", [{ frozen: true }]),
      authority: null,
    })
  }

  // ImmutableMetadata plugin
  if (!isCollectionNft && isImmutableMetadata) {
    plugins.push({
      plugin: mplCore.plugin("ImmutableMetadata", [{}]),
      authority: null,
    })
  }

  // AddBlocker plugin (prevent new plugins)
  if (!isCollectionNft && preventNewPlugins) {
    plugins.push({
      plugin: mplCore.plugin("AddBlocker", [{}]),
      authority: null,
    })
  }

  const createInstruction = mplCore.getCreateV1Instruction({
    asset: assetSigner,
    payer: feePayer,
    owner: account as Address,
    updateAuthority: account as Address,
    collection: collectionAddress ? (collectionAddress as Address) : undefined,
    dataState: mplCore.DataState.AccountState,
    name,
    uri,
    plugins: plugins.length > 0 ? plugins : null,
  })

  const signature = await prepareAndSendTransaction({
    instructions: [createInstruction],
    feePayer,
  })

  return { mintAddress: assetSigner.address, signature }
}

export interface MintPnftParams {
  name: string
  symbol: string
  uri: string
  account: string
  feePayer: TransactionSigner
  sellerFeeBasisPoints: number
  creators: Array<{ address: Address; verified: boolean; share: number }>
  isMutable: boolean
  isCollectionNft: boolean
  collectionAddress?: string
  ruleSetOption: RuleSetOption
  customRuleSetAddress?: string
  customKeypair?: KeyPairSigner | null
}

export async function mintPnft(params: MintPnftParams): Promise<{ mintAddress: string; signature: string }> {
  const {
    name,
    symbol,
    uri,
    account,
    feePayer,
    sellerFeeBasisPoints,
    creators,
    isMutable,
    isCollectionNft,
    collectionAddress,
    ruleSetOption,
    customRuleSetAddress,
    customKeypair,
  } = params

  const mintKeypair = customKeypair ?? (await generateKeyPairSigner())
  const mint = mintKeypair.address

  const metadataPda = await getMetadataPda(mint)
  const masterEditionPda = await getMasterEditionPda(mint)

  const [ata] = await findAssociatedTokenPda({
    mint,
    owner: account as Address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const tokenRecordPda = await getTokenRecordPda(mint, ata)

  let ruleSet: Address | null = null
  if (ruleSetOption === "metaplex") {
    ruleSet = RULE_SET_ADDRESSES.metaplex as Address
  } else if (ruleSetOption === "compatibility") {
    ruleSet = RULE_SET_ADDRESSES.compatibility as Address
  } else if (ruleSetOption === "custom" && customRuleSetAddress) {
    ruleSet = customRuleSetAddress as Address
  }

  const createAccountInstruction = getCreateAccountInstruction({
    payer: feePayer,
    newAccount: mintKeypair,
    lamports: BigInt(MINT_RENT_LAMPORTS),
    space: BigInt(MINT_ACCOUNT_SIZE),
    programAddress: TOKEN_PROGRAM_ADDRESS,
  })

  const initializeMintInstruction = getInitializeMint2Instruction({
    mint,
    decimals: 0,
    mintAuthority: account as Address,
    freezeAuthority: account as Address,
  })

  const createMetadataInstruction = tokenMetadata.getCreateInstruction({
    metadata: metadataPda,
    masterEdition: masterEditionPda,
    mint,
    authority: feePayer,
    payer: feePayer,
    updateAuthority: account as Address,
    splTokenProgram: TOKEN_PROGRAM_ADDRESS,
    createArgs: {
      __kind: "V1",
      assetData: {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints,
        creators: isCollectionNft ? null : creators,
        primarySaleHappened: false,
        isMutable,
        tokenStandard: tokenMetadata.TokenStandard.ProgrammableNonFungible,
        collection: collectionAddress ? { key: collectionAddress as Address, verified: false } : null,
        uses: null,
        collectionDetails: isCollectionNft ? { __kind: "V1", size: BigInt(0) } : null,
        ruleSet,
      },
      decimals: 0,
      printSupply: { __kind: "Zero" },
    },
  })

  const mintTokenInstruction = tokenMetadata.getMintInstruction({
    token: ata,
    tokenOwner: account as Address,
    metadata: metadataPda,
    masterEdition: masterEditionPda,
    tokenRecord: tokenRecordPda,
    mint,
    authority: feePayer,
    payer: feePayer,
    splTokenProgram: TOKEN_PROGRAM_ADDRESS,
    mintArgs: {
      __kind: "V1",
      amount: 1,
      authorizationData: null,
    },
    ...(ruleSet && {
      authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
      authorizationRules: ruleSet,
    }),
  })

  const signature = await prepareAndSendTransaction({
    instructions: [
      createAccountInstruction,
      initializeMintInstruction,
      createMetadataInstruction,
      mintTokenInstruction,
    ],
    feePayer,
  })

  return { mintAddress: mint, signature }
}

export interface MintNiftyAssetParams {
  name: string
  uri: string
  symbol: string
  description: string
  attributes: Array<{ traitType: string; value: string }>
  collectionAddress?: string
  isMutable: boolean
  isCollectionNft: boolean
  feePayer: TransactionSigner
  account: string
  customKeypair?: KeyPairSigner | null
  storeAttributesOnchain?: boolean
  storeCreatorsOnchain?: boolean
  creators?: Array<{ address: Address; percentage: number }>
  royaltiesPercent?: number
  externalLinks?: Array<{ name: string; url: string }>
}

export async function mintNiftyAsset(
  params: MintNiftyAssetParams
): Promise<{ mintAddress: string; signature: string }> {
  const {
    name,
    uri,
    symbol,
    description,
    attributes,
    collectionAddress,
    isMutable,
    isCollectionNft,
    feePayer,
    account,
    customKeypair,
    storeAttributesOnchain,
    storeCreatorsOnchain,
    creators,
    royaltiesPercent,
    externalLinks,
  } = params

  const assetSigner = customKeypair ?? (await generateKeyPairSigner())

  const extensions: asset.ExtensionInputArgs[] = []

  const metadataBytes = encodeMetadataExtension(symbol, description, uri)
  extensions.push({
    extensionType: asset.ExtensionType.Metadata,
    length: metadataBytes.length,
    data: metadataBytes,
  })

  if (!isCollectionNft && storeAttributesOnchain) {
    const filteredAttrs = attributes.filter((a) => a.traitType.trim() && a.value.trim())
    if (filteredAttrs.length > 0) {
      const attributesBytes = encodeAttributesExtension(filteredAttrs)
      extensions.push({
        extensionType: asset.ExtensionType.Attributes,
        length: attributesBytes.length,
        data: attributesBytes,
      })
    }
  }

  // Creators extension
  if (!isCollectionNft && storeCreatorsOnchain && creators && creators.length > 0) {
    const creatorsBytes = encodeCreatorsExtension(creators, account)
    extensions.push({
      extensionType: asset.ExtensionType.Creators,
      length: creatorsBytes.length,
      data: creatorsBytes,
    })
  }

  // Royalties extension
  if (!isCollectionNft && royaltiesPercent && royaltiesPercent > 0 && creators && creators.length > 0) {
    const basisPoints = Math.round(royaltiesPercent * 100)
    const royaltiesBytes = encodeRoyaltiesExtension(basisPoints, creators)
    extensions.push({
      extensionType: asset.ExtensionType.Royalties,
      length: royaltiesBytes.length,
      data: royaltiesBytes,
    })
  }

  // Links extension
  if (!isCollectionNft && externalLinks && externalLinks.length > 0) {
    const validLinks = externalLinks.filter((l) => l.name.trim() && l.url.trim())
    if (validLinks.length > 0) {
      const linksBytes = encodeLinksExtension(validLinks)
      extensions.push({
        extensionType: asset.ExtensionType.Links,
        length: linksBytes.length,
        data: linksBytes,
      })
    }
  }

  const createInstruction = asset.getCreateInstruction({
    asset: assetSigner,
    authority: account as Address,
    owner: account as Address,
    group: collectionAddress ? (collectionAddress as Address) : undefined,
    payer: feePayer,
    name,
    standard: asset.Standard.NonFungible,
    mutable: isMutable,
    extensions: extensions.length > 0 ? extensions : null,
  })

  const signature = await prepareAndSendTransaction({
    instructions: [createInstruction],
    feePayer,
  })

  return { mintAddress: assetSigner.address, signature }
}

export interface CreateCoreAssetInstructionParams {
  name: string
  uri: string
  owner: string
  feePayer: TransactionSigner
  collectionAddress?: string
  royaltiesPercent: number
  creators: Array<{ address: Address; percentage: number }>
  isCollectionNft: boolean
  assetSigner: TransactionSigner
}

export function createCoreAssetInstruction(params: CreateCoreAssetInstructionParams): Instruction {
  const { name, uri, owner, feePayer, collectionAddress, royaltiesPercent, creators, isCollectionNft, assetSigner } =
    params

  const plugins: mplCore.PluginAuthorityPairArgs[] = []

  if (!isCollectionNft && royaltiesPercent > 0 && creators.length > 0) {
    plugins.push({
      plugin: mplCore.plugin("Royalties", [
        {
          basisPoints: Math.round(royaltiesPercent * 100),
          creators: creators.map((c) => ({ address: c.address, percentage: c.percentage })),
          ruleSet: mplCore.ruleSet("None"),
        },
      ]),
      authority: null,
    })
  }

  return mplCore.getCreateV1Instruction({
    asset: assetSigner,
    payer: feePayer,
    owner: owner as Address,
    updateAuthority: owner as Address,
    collection: collectionAddress ? (collectionAddress as Address) : undefined,
    dataState: mplCore.DataState.AccountState,
    name,
    uri,
    plugins: plugins.length > 0 ? plugins : null,
  })
}

export interface CreateNiftyAssetInstructionParams {
  name: string
  symbol: string
  description: string
  uri: string
  owner: string
  payer: TransactionSigner
  attributes: Attribute[]
  collectionAddress?: string
  isMutable: boolean
  isCollectionNft: boolean
  assetSigner: TransactionSigner
}

export function createNiftyAssetInstruction(params: CreateNiftyAssetInstructionParams): Instruction {
  const {
    name,
    symbol,
    description,
    uri,
    owner,
    payer,
    attributes,
    collectionAddress,
    isMutable,
    isCollectionNft,
    assetSigner,
  } = params

  const extensions: asset.ExtensionInputArgs[] = []

  const metadataBytes = encodeMetadataExtension(symbol, description, uri)
  extensions.push({
    extensionType: asset.ExtensionType.Metadata,
    length: metadataBytes.length,
    data: metadataBytes,
  })

  if (!isCollectionNft) {
    const filteredAttrs = attributes.filter((a) => a.traitType.trim() && a.value.trim())
    if (filteredAttrs.length > 0) {
      const attributesBytes = encodeAttributesExtension(filteredAttrs)
      extensions.push({
        extensionType: asset.ExtensionType.Attributes,
        length: attributesBytes.length,
        data: attributesBytes,
      })
    }
  }

  return asset.getCreateInstruction({
    asset: assetSigner,
    authority: owner as Address,
    owner: owner as Address,
    group: collectionAddress ? (collectionAddress as Address) : undefined,
    payer,
    name,
    standard: asset.Standard.NonFungible,
    mutable: isMutable,
    extensions: extensions.length > 0 ? extensions : null,
  })
}
