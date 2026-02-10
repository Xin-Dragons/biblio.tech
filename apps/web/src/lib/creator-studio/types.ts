import type { KeyPairSigner, Address } from "@solana/kit"

export type TabValue = "create" | "update" | "batch"
export type AssetStandard = "core" | "pnft" | "nifty"
export type RuleSetOption = "metaplex" | "compatibility" | "none" | "custom"
export type BatchLookupMode = "collection" | "creator" | "hashlist"
export type MultimediaCategory = "video" | "audio" | "vr"

export const RULE_SET_ADDRESSES = {
  metaplex: "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9",
  compatibility: "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5",
} as const

export const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address
export const AUTH_RULES_PROGRAM_ADDRESS = "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg" as Address
export const MPL_CORE_PROGRAM_ADDRESS = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d" as Address
export const NIFTY_ASSET_PROGRAM_ADDRESS = "AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73" as Address

export const MINT_ACCOUNT_SIZE = 82
export const MINT_RENT_LAMPORTS = 1461600

export interface Creator {
  address: string
  share: number
}

export interface Attribute {
  traitType: string
  value: string
}

export interface ExternalLink {
  name: string
  url: string
}

export interface CreateFormState {
  name: string
  symbol: string
  description: string
  externalUrl: string
  imageFile: File | null
  multimediaFile: File | null
  multimediaCategory: MultimediaCategory | null
  royaltiesPercent: number
  creators: Creator[]
  attributes: Attribute[]
  storeAttributesOnchain: boolean
  storeCreatorsOnchain: boolean
  externalLinks: ExternalLink[]
  isSoulbound: boolean
  isImmutableMetadata: boolean
  preventNewPlugins: boolean
  collectionAddress: string
  isMutable: boolean
  isCollectionNft: boolean
  isCreateMany: boolean
  createManyQuantity: number
  ruleSetOption: RuleSetOption
  customRuleSetAddress: string
  customKeypair: KeyPairSigner | null
}

export interface CreateFormErrors {
  name?: string
  symbol?: string
  description?: string
  externalUrl?: string
  imageFile?: string
  multimediaFile?: string
  royaltiesPercent?: string
  creators?: string
  creatorAddresses?: Record<number, string>
  creatorShares?: Record<number, string>
  collectionAddress?: string
  customRuleSetAddress?: string
  customKeypair?: string
}

export type TextFormField = Exclude<
  keyof CreateFormState,
  | "imageFile"
  | "multimediaFile"
  | "multimediaCategory"
  | "royaltiesPercent"
  | "creators"
  | "attributes"
  | "storeAttributesOnchain"
  | "storeCreatorsOnchain"
  | "externalLinks"
  | "isSoulbound"
  | "isImmutableMetadata"
  | "preventNewPlugins"
  | "collectionAddress"
  | "isMutable"
  | "isCollectionNft"
  | "isCreateMany"
  | "createManyQuantity"
  | "ruleSetOption"
  | "customRuleSetAddress"
  | "customKeypair"
>

export type UploadStep =
  | "idle"
  | "uploading-image"
  | "uploading-multimedia"
  | "uploading-metadata"
  | "minting"
  | "batch-minting"
  | "complete"

export type UpdateStep =
  | "idle"
  | "uploading-image"
  | "uploading-multimedia"
  | "uploading-metadata"
  | "updating"
  | "complete"

export interface MintResult {
  mintAddress: string
  signature: string
}

export interface BatchMintResult {
  successful: number
  failed: number
  mintAddresses: string[]
  signatures: string[]
}

export interface UploadedUris {
  imageUri: string | null
  multimediaUri: string | null
  metadataUri: string | null
}

export interface LoadedNftData {
  mintAddress: string
  standard: AssetStandard
  name: string
  symbol: string
  description: string
  uri: string
  imageUrl: string | null
  externalUrl: string | null
  attributes: Attribute[]
  updateAuthority: string
  owner: string
  isMutable: boolean
  royaltiesPercent: number
  creators: Creator[]
  collectionAddress: string | null
  ruleSetAddress: string | null
}

export interface BatchNft {
  mint: string
  name: string
  image: string
  collectionId: string | null
  updateAuthority: string | null
  royaltiesPercent: number
  creators: Array<{ address: string; share: number; verified: boolean }>
  interface: string | null
}

export interface BatchNftFilters {
  creator: string | null
  royalties: string | null
  updateAuthority: string | null
}

export type BatchNftGridCellData = {
  nfts: BatchNft[]
  columnCount: number
}

export interface CollectionNft {
  mint: string
  name: string
  image: string
}

export type CollectionNftGridCellData = {
  nfts: CollectionNft[]
  columnCount: number
  selectedMint: string | null
  onSelect: (mint: string) => void
}

export interface HeliusDasAsset {
  id: string
  interface?: string
  content?: {
    metadata?: {
      name?: string
    }
    links?: {
      image?: string
    }
    files?: Array<{ uri?: string }>
  }
  grouping?: Array<{ group_key: string; group_value: string }>
  authorities?: Array<{ address: string; scopes: string[] }>
  royalty?: {
    basis_points: number
  }
  creators?: Array<{ address: string; share: number; verified: boolean }>
  burnt?: boolean
}

export interface HeliusDasAssetExtended extends HeliusDasAsset {
  specification_asset_class?: string
}

export interface HeliusDasResponse {
  items: HeliusDasAsset[]
  total: number
  grand_total?: number
}

export interface BatchOperationProgress {
  completed: number
  total: number
  failed: number
}

export interface NftPreviewData {
  name: string
  symbol: string
  description: string
  imagePreviewUrl: string | null
  attributes: Attribute[]
}

export const ASSET_STANDARDS: Array<{ value: AssetStandard; label: string; description: string }> = [
  { value: "core", label: "Core Asset", description: "Metaplex Core" },
  { value: "pnft", label: "pNFT", description: "Programmable NFT" },
  { value: "nifty", label: "Nifty Asset", description: "Nifty Asset Standard" },
]
