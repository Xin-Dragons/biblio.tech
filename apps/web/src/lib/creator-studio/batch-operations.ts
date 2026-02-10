import { type Address, type TransactionSigner, type Instruction } from "@solana/kit"
import { TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda, getInitializeMint2Instruction } from "@solana-program/token"
import { getCreateAccountInstruction } from "@solana-program/system"
import { mplCore, tokenMetadata, asset } from "@biblio/solana-programs"
import { prepareAndSendTransaction } from "@/lib/transaction"
import {
  AUTH_RULES_PROGRAM_ADDRESS,
  RULE_SET_ADDRESSES,
  MINT_ACCOUNT_SIZE,
  MINT_RENT_LAMPORTS,
  type RuleSetOption,
} from "./types"
import { getMetadataPda, getMasterEditionPda, getTokenRecordPda } from "./rpc"
import {
  encodeMetadataExtension,
  encodeAttributesExtension,
  encodeCreatorsExtension,
  encodeLinksExtension,
  encodeRoyaltiesExtension,
} from "./minting"

export interface BatchMintCoreAssetOptions {
  name: string
  uri: string
  collectionAddress?: string
  royaltiesPercent: number
  creators: Array<{ address: Address; percentage: number }>
  isCollectionNft: boolean
  feePayer: TransactionSigner
  account: string
  attributes?: Array<{ traitType: string; value: string }>
  storeAttributesOnchain?: boolean
  storeCreatorsOnchain?: boolean
  isSoulbound?: boolean
  isImmutableMetadata?: boolean
  preventNewPlugins?: boolean
}

export interface BatchMintItem {
  index: number
  assetSigner: TransactionSigner
}

export async function buildCoreAssetInstructions({
  assetSigner,
  name,
  uri,
  collectionAddress,
  royaltiesPercent,
  creators,
  isCollectionNft,
  feePayer,
  account,
  attributes,
  storeAttributesOnchain,
  storeCreatorsOnchain,
  isSoulbound,
  isImmutableMetadata,
  preventNewPlugins,
}: BatchMintCoreAssetOptions & { assetSigner: TransactionSigner }): Promise<Instruction[]> {
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

  return [createInstruction]
}

export interface BatchMintPnftOptions {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators: Array<{ address: Address; verified: boolean; share: number }>
  collectionAddress?: string
  ruleSetOption: RuleSetOption
  customRuleSetAddress?: string
  isMutable: boolean
  isCollectionNft: boolean
  feePayer: TransactionSigner
  account: string
}

export async function buildPnftInstructions({
  mintSigner,
  name,
  symbol,
  uri,
  sellerFeeBasisPoints,
  creators,
  collectionAddress,
  ruleSetOption,
  customRuleSetAddress,
  isMutable,
  isCollectionNft,
  feePayer,
  account,
}: BatchMintPnftOptions & { mintSigner: TransactionSigner }): Promise<Instruction[]> {
  const mintAddress = mintSigner.address

  const metadata = await getMetadataPda(mintAddress)
  const masterEdition = await getMasterEditionPda(mintAddress)

  const [ata] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: account as Address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })
  const tokenRecord = await getTokenRecordPda(mintAddress, ata)

  let ruleSetAddress: Address | null = null
  if (ruleSetOption === "metaplex") {
    ruleSetAddress = RULE_SET_ADDRESSES.metaplex as Address
  } else if (ruleSetOption === "compatibility") {
    ruleSetAddress = RULE_SET_ADDRESSES.compatibility as Address
  } else if (ruleSetOption === "custom" && customRuleSetAddress) {
    ruleSetAddress = customRuleSetAddress as Address
  }

  const instructions: Instruction[] = []

  const createAccountIx = getCreateAccountInstruction({
    payer: feePayer,
    newAccount: mintSigner,
    lamports: BigInt(MINT_RENT_LAMPORTS),
    space: BigInt(MINT_ACCOUNT_SIZE),
    programAddress: TOKEN_PROGRAM_ADDRESS,
  })
  instructions.push(createAccountIx)

  const initMintIx = getInitializeMint2Instruction({
    mint: mintAddress,
    decimals: 0,
    mintAuthority: account as Address,
    freezeAuthority: account as Address,
  })
  instructions.push(initMintIx)

  const createMetadataIx = tokenMetadata.getCreateInstruction({
    metadata,
    masterEdition,
    mint: mintAddress,
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
        ruleSet: ruleSetAddress,
      },
      decimals: 0,
      printSupply: { __kind: "Zero" },
    },
  })
  instructions.push(createMetadataIx)

  const mintIx = tokenMetadata.getMintInstruction({
    token: ata,
    tokenOwner: account as Address,
    metadata,
    masterEdition,
    tokenRecord,
    mint: mintAddress,
    payer: feePayer,
    authority: feePayer,
    splTokenProgram: TOKEN_PROGRAM_ADDRESS,
    splAtaProgram: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address,
    sysvarInstructions: "Sysvar1nstructions1111111111111111111111111" as Address,
    authorizationRulesProgram: ruleSetAddress ? AUTH_RULES_PROGRAM_ADDRESS : undefined,
    authorizationRules: ruleSetAddress ?? undefined,
    mintArgs: {
      __kind: "V1",
      amount: BigInt(1),
      authorizationData: null,
    },
  })
  instructions.push(mintIx)

  return instructions
}

export interface BatchMintNiftyOptions {
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
  storeAttributesOnchain?: boolean
  storeCreatorsOnchain?: boolean
  creators?: Array<{ address: Address; percentage: number }>
  royaltiesPercent?: number
  externalLinks?: Array<{ name: string; url: string }>
}

export async function buildNiftyAssetInstructions({
  assetSigner,
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
  storeAttributesOnchain,
  storeCreatorsOnchain,
  creators,
  royaltiesPercent,
  externalLinks,
}: BatchMintNiftyOptions & { assetSigner: TransactionSigner }): Promise<Instruction[]> {
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
  if (!isCollectionNft && royaltiesPercent !== undefined && royaltiesPercent > 0 && creators && creators.length > 0) {
    const royaltiesBytes = encodeRoyaltiesExtension(Math.round(royaltiesPercent * 100), creators)
    extensions.push({
      extensionType: asset.ExtensionType.Royalties,
      length: royaltiesBytes.length,
      data: royaltiesBytes,
    })
  }

  // Links extension
  if (!isCollectionNft && externalLinks && externalLinks.length > 0) {
    const filteredLinks = externalLinks.filter((l) => l.name.trim() && l.url.trim())
    if (filteredLinks.length > 0) {
      const linksBytes = encodeLinksExtension(filteredLinks)
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

  return [createInstruction]
}

export interface UpdateCoreAssetOptions {
  assetAddress: Address
  newName?: string
  newUri?: string
  collectionAddress?: string
  feePayer: TransactionSigner
}

export async function updateCoreAsset({
  assetAddress,
  newName,
  newUri,
  collectionAddress,
  feePayer,
}: UpdateCoreAssetOptions): Promise<string> {
  const updateInstruction = mplCore.getUpdateV1Instruction({
    asset: assetAddress,
    payer: feePayer,
    authority: feePayer,
    collection: collectionAddress ? (collectionAddress as Address) : undefined,
    newName: newName ?? null,
    newUri: newUri ?? null,
    newUpdateAuthority: null,
  })

  const signature = await prepareAndSendTransaction({
    instructions: [updateInstruction],
    feePayer,
  })

  return signature
}

export interface UpdatePnftOptions {
  mintAddress: Address
  newName?: string
  newSymbol?: string
  newUri?: string
  sellerFeeBasisPoints?: number
  creators?: Array<{ address: Address; verified: boolean; share: number }>
  collectionAddress?: string
  originalCollectionAddress?: string
  ruleSetAddress?: Address | null
  feePayer: TransactionSigner
  account: string
}

export async function updatePnft({
  mintAddress,
  newName,
  newSymbol,
  newUri,
  sellerFeeBasisPoints,
  creators,
  collectionAddress,
  originalCollectionAddress,
  ruleSetAddress,
  feePayer,
  account,
}: UpdatePnftOptions): Promise<string> {
  const metadata = await getMetadataPda(mintAddress)
  const masterEdition = await getMasterEditionPda(mintAddress)

  const [ata] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: account as Address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const data =
    newName !== undefined ||
    newSymbol !== undefined ||
    newUri !== undefined ||
    sellerFeeBasisPoints !== undefined ||
    creators !== undefined
      ? {
          name: newName ?? "",
          symbol: newSymbol ?? "",
          uri: newUri ?? "",
          sellerFeeBasisPoints: sellerFeeBasisPoints ?? 0,
          creators: creators ?? null,
        }
      : null

  let collectionToggle:
    | { __kind: "None" }
    | { __kind: "Clear" }
    | { __kind: "Set"; fields: readonly [{ key: Address; verified: boolean }] } = { __kind: "None" }
  if (collectionAddress !== originalCollectionAddress) {
    if (collectionAddress) {
      collectionToggle = { __kind: "Set", fields: [{ key: collectionAddress as Address, verified: false }] }
    } else if (originalCollectionAddress) {
      collectionToggle = { __kind: "Clear" }
    }
  }

  const updateIx = tokenMetadata.getUpdateInstruction({
    authority: feePayer,
    mint: mintAddress,
    metadata,
    edition: masterEdition,
    token: ata,
    payer: feePayer,
    updateArgs: {
      __kind: "V1",
      newUpdateAuthority: null,
      data,
      primarySaleHappened: null,
      isMutable: null,
      collection: collectionToggle,
      collectionDetails: { __kind: "None" },
      uses: { __kind: "None" },
      ruleSet: { __kind: "None" },
      authorizationData: null,
    },
    ...(ruleSetAddress && {
      authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
      authorizationRules: ruleSetAddress,
    }),
  })

  const signature = await prepareAndSendTransaction({
    instructions: [updateIx],
    feePayer,
  })

  return signature
}

export interface UpdateNiftyAssetOptions {
  assetAddress: Address
  newName?: string
  newUri?: string
  newSymbol?: string
  newDescription?: string
  attributes?: Array<{ traitType: string; value: string }>
  collectionAddress?: string
  feePayer: TransactionSigner
}

export async function updateNiftyAsset({
  assetAddress,
  newName,
  newUri,
  newSymbol,
  newDescription,
  attributes,
  collectionAddress,
  feePayer,
}: UpdateNiftyAssetOptions): Promise<string> {
  const instructions: Instruction[] = []

  if (newUri !== undefined || newSymbol !== undefined || newDescription !== undefined) {
    const metadataBytes = encodeMetadataExtension(newSymbol ?? "", newDescription ?? "", newUri ?? "")
    const metadataUpdateIx = asset.getUpdateInstruction({
      asset: assetAddress,
      authority: feePayer,
      payer: feePayer,
      group: collectionAddress ? (collectionAddress as Address) : undefined,
      name: newName ?? null,
      mutable: null,
      extension: {
        extensionType: asset.ExtensionType.Metadata,
        length: metadataBytes.length,
        data: metadataBytes,
      },
    })
    instructions.push(metadataUpdateIx)
  } else if (newName !== undefined) {
    const nameUpdateIx = asset.getUpdateInstruction({
      asset: assetAddress,
      authority: feePayer,
      payer: feePayer,
      group: collectionAddress ? (collectionAddress as Address) : undefined,
      name: newName,
      mutable: null,
      extension: null,
    })
    instructions.push(nameUpdateIx)
  }

  if (attributes !== undefined && attributes.length > 0) {
    const filteredAttrs = attributes.filter((a) => a.traitType.trim() && a.value.trim())
    if (filteredAttrs.length > 0) {
      const attributesBytes = encodeAttributesExtension(filteredAttrs)
      const attrsUpdateIx = asset.getUpdateInstruction({
        asset: assetAddress,
        authority: feePayer,
        payer: feePayer,
        group: collectionAddress ? (collectionAddress as Address) : undefined,
        name: null,
        mutable: null,
        extension: {
          extensionType: asset.ExtensionType.Attributes,
          length: attributesBytes.length,
          data: attributesBytes,
        },
      })
      instructions.push(attrsUpdateIx)
    }
  }

  if (instructions.length === 0) {
    throw new Error("No changes to update")
  }

  const signature = await prepareAndSendTransaction({
    instructions,
    feePayer,
  })

  return signature
}
