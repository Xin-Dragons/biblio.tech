import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react"
import { useSearchParams } from "react-router"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import {
  generateKeyPairSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
  getAddressDecoder,
  type Address,
  type TransactionSigner,
  type Instruction,
} from "@solana/kit"
import { getCreateAccountInstruction } from "@solana-program/system"
import { getInitializeMint2Instruction, TOKEN_PROGRAM_ADDRESS, findAssociatedTokenPda } from "@solana-program/token"
import { toast } from "sonner"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import {
  Hammer,
  Plus,
  Pencil,
  Layers,
  Box,
  Shield,
  Sparkles,
  ImagePlus,
  X,
  Film,
  Music,
  Trash2,
  FolderOpen,
  AlertTriangle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Search,
  Users,
  FileCode,
  Filter,
  ChevronDown,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  uploadToIrys,
  uploadJsonMetadata,
  type ConnectorSigner,
  type NftMetadataInput,
  type MultimediaCategory as IrysMultimediaCategory,
} from "@/lib/irys"
import {
  prepareAndSendTransaction,
  batchInstructionsBySize,
  getBlockhash,
  prepareSignedTransaction,
  sendTransaction,
  confirmTransactionViaWebSocket,
  type InstructionGroup,
} from "@/lib/transaction"
import { mplCore, tokenMetadata, asset } from "@biblio/solana-programs"

type TabValue = "create" | "update" | "batch"
type AssetStandard = "core" | "pnft" | "nifty"
type RuleSetOption = "metaplex" | "compatibility" | "none" | "custom"
type BatchLookupMode = "collection" | "creator" | "hashlist"

type MultimediaCategory = "video" | "audio" | "vr"

const RULE_SET_ADDRESSES = {
  metaplex: "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9",
  compatibility: "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5",
} as const

const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address
const AUTH_RULES_PROGRAM_ADDRESS = "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg" as Address
const MPL_CORE_PROGRAM_ADDRESS = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d" as Address
const NIFTY_ASSET_PROGRAM_ADDRESS = "AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73" as Address

const MINT_ACCOUNT_SIZE = 82
const MINT_RENT_LAMPORTS = 1461600

async function getMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: ["metadata", getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS), getAddressEncoder().encode(mint)],
  })
  return pda
}

async function getMasterEditionPda(mint: Address): Promise<Address> {
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

async function getTokenRecordPda(mint: Address, tokenAccount: Address): Promise<Address> {
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

interface Creator {
  address: string
  share: number
}

interface Attribute {
  traitType: string
  value: string
}

interface CreateFormState {
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
  collectionAddress: string
  isMutable: boolean
  isCollectionNft: boolean
  ruleSetOption: RuleSetOption
  customRuleSetAddress: string
}

interface CreateFormErrors {
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
}

type TextFormField = Exclude<
  keyof CreateFormState,
  | "imageFile"
  | "multimediaFile"
  | "multimediaCategory"
  | "royaltiesPercent"
  | "creators"
  | "attributes"
  | "collectionAddress"
  | "isMutable"
  | "isCollectionNft"
  | "ruleSetOption"
  | "customRuleSetAddress"
>

type UploadStep = "idle" | "uploading-image" | "uploading-multimedia" | "uploading-metadata" | "minting" | "complete"

interface MintResult {
  mintAddress: string
  signature: string
}

interface UploadedUris {
  imageUri: string | null
  multimediaUri: string | null
  metadataUri: string | null
}

interface LoadedNftData {
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

interface BatchNft {
  mint: string
  name: string
  image: string
  collectionId: string | null
  updateAuthority: string | null
  royaltiesPercent: number
  creators: Array<{ address: string; share: number; verified: boolean }>
}

interface BatchNftFilters {
  creator: string | null
  royalties: string | null
  updateAuthority: string | null
}

type BatchNftGridCellData = {
  nfts: BatchNft[]
  columnCount: number
}

interface HeliusDasAsset {
  id: string
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
}

interface HeliusDasResponse {
  items: HeliusDasAsset[]
  total: number
  grand_total?: number
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"]
const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.gif"
const MAX_IMAGE_SIZE_MB = 20
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

const ACCEPTED_MULTIMEDIA_EXTENSIONS = ".mp4,.mov,.mp3,.flac,.wav,.glb,.gltf"
const MAX_MULTIMEDIA_SIZE_MB = 100
const MAX_MULTIMEDIA_SIZE_BYTES = MAX_MULTIMEDIA_SIZE_MB * 1024 * 1024

const VIDEO_EXTENSIONS = [".mp4", ".mov"]
const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav"]
const VR_EXTENSIONS = [".glb", ".gltf"]

function getMultimediaCategory(filename: string): MultimediaCategory | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio"
  if (VR_EXTENSIONS.includes(ext)) return "vr"
  return null
}

const MAX_NAME_LENGTH = 32
const MAX_SYMBOL_LENGTH = 10

function validateUrl(url: string): boolean {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false
  if (address.length < 32 || address.length > 44) return false
  for (const char of address) {
    if (!BASE58_CHARS.includes(char)) return false
  }
  return true
}

async function rpcRequest<T>(method: string, params: unknown[] | Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/rpc", {
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

interface AccountInfo {
  data: [string, string]
  owner: string
  lamports: number
  executable: boolean
  rentEpoch: number
}

async function detectAssetStandard(mintAddress: string): Promise<{
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
  const accountData = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0))

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
      const metadataData = Uint8Array.from(atob(metadataAccountInfo.value.data[0]), (c) => c.charCodeAt(0))
      return { standard: "pnft", accountData: metadataData, owner: TOKEN_METADATA_PROGRAM_ADDRESS }
    }
  }

  return null
}

async function fetchNftMetadataJson(uri: string): Promise<{
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

function decodeLengthPrefixedString(data: Uint8Array, offset: number): { value: string; bytesRead: number } {
  const view = new DataView(data.buffer, data.byteOffset + offset)
  const length = view.getUint32(0, true)
  const textDecoder = new TextDecoder()
  const value = textDecoder.decode(data.slice(offset + 4, offset + 4 + length))
  return { value, bytesRead: 4 + length }
}

async function loadCoreAsset(mintAddress: string, accountData: Uint8Array): Promise<LoadedNftData> {
  const ownerBytes = accountData.slice(1, 33)
  const ownerAddress = getAddressDecoder().decode(ownerBytes) as string

  let offset = 33
  const updateAuthorityType = accountData[offset]
  offset += 1

  let updateAuthority = ""
  if (updateAuthorityType === 1) {
    const updateAuthorityBytes = accountData.slice(offset, offset + 32)
    updateAuthority = getAddressDecoder().decode(updateAuthorityBytes) as string
    offset += 32
  } else if (updateAuthorityType === 2) {
    offset += 32
    updateAuthority = ownerAddress
  }

  const { value: name, bytesRead: nameBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += nameBytes

  const { value: uri, bytesRead: uriBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += uriBytes

  const metadata = await fetchNftMetadataJson(uri)

  return {
    mintAddress,
    standard: "core",
    name: name.replace(/\0+$/, ""),
    symbol: metadata?.symbol || "",
    description: metadata?.description || "",
    uri,
    imageUrl: metadata?.image || null,
    externalUrl: metadata?.external_url || null,
    attributes: (metadata?.attributes || []).map((a) => ({ traitType: a.trait_type, value: a.value })),
    updateAuthority,
    owner: ownerAddress,
    isMutable: true,
    royaltiesPercent: (metadata?.seller_fee_basis_points || 0) / 100,
    creators: metadata?.properties?.creators?.map((c) => ({ address: c.address, share: c.share })) || [],
    collectionAddress: null,
    ruleSetAddress: null,
  }
}

async function loadPnftMetadata(mintAddress: string, accountData: Uint8Array): Promise<LoadedNftData> {
  let offset = 1
  const updateAuthorityBytes = accountData.slice(offset, offset + 32)
  const updateAuthority = getAddressDecoder().decode(updateAuthorityBytes) as string
  offset += 32

  offset += 32

  const { value: name, bytesRead: nameBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += nameBytes

  const { value: symbol, bytesRead: symbolBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += symbolBytes

  const { value: uri, bytesRead: uriBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += uriBytes

  const view = new DataView(accountData.buffer, accountData.byteOffset)
  const sellerFeeBasisPoints = view.getUint16(offset, true)
  offset += 2

  const hasCreators = accountData[offset] === 1
  offset += 1

  const creators: Creator[] = []
  if (hasCreators) {
    const creatorsCount = view.getUint32(offset, true)
    offset += 4
    for (let i = 0; i < creatorsCount; i++) {
      const creatorBytes = accountData.slice(offset, offset + 32)
      const creatorAddress = getAddressDecoder().decode(creatorBytes) as string
      offset += 32
      offset += 1
      const share = accountData[offset]
      offset += 1
      creators.push({ address: creatorAddress, share })
    }
  }

  offset += 1
  const isMutable = accountData[offset] === 1
  offset += 1

  const metadata = await fetchNftMetadataJson(uri)

  let collectionAddress: string | null = null
  const hasEditionNonce = accountData[offset] === 1
  offset += hasEditionNonce ? 2 : 1

  const hasTokenStandard = accountData[offset] === 1
  offset += hasTokenStandard ? 2 : 1

  const hasCollection = accountData[offset] === 1
  offset += 1
  if (hasCollection) {
    offset += 1
    const collectionBytes = accountData.slice(offset, offset + 32)
    collectionAddress = getAddressDecoder().decode(collectionBytes) as string
    offset += 32
  }

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
    isMutable,
    royaltiesPercent: sellerFeeBasisPoints / 100,
    creators,
    collectionAddress,
    ruleSetAddress: null,
  }
}

async function loadNiftyAsset(mintAddress: string, accountData: Uint8Array): Promise<LoadedNftData> {
  let offset = 1

  const ownerBytes = accountData.slice(offset, offset + 32)
  const ownerAddress = getAddressDecoder().decode(ownerBytes) as string
  offset += 32

  const authorityBytes = accountData.slice(offset, offset + 32)
  const updateAuthority = getAddressDecoder().decode(authorityBytes) as string
  offset += 32

  const hasGroup = accountData[offset] === 1
  offset += 1
  let collectionAddress: string | null = null
  if (hasGroup) {
    const groupBytes = accountData.slice(offset, offset + 32)
    collectionAddress = getAddressDecoder().decode(groupBytes) as string
    offset += 32
  }

  const { value: name, bytesRead: nameBytes } = decodeLengthPrefixedString(accountData, offset)
  offset += nameBytes

  let uri = ""
  let symbol = ""
  let description = ""
  const attributes: Attribute[] = []

  const extensionDataOffset = offset + 3
  if (extensionDataOffset < accountData.length) {
    let extOffset = extensionDataOffset

    while (extOffset + 5 < accountData.length) {
      const extType = accountData[extOffset]
      extOffset += 1
      const extView = new DataView(accountData.buffer, accountData.byteOffset + extOffset)
      const extLength = extView.getUint32(0, true)
      extOffset += 4

      if (extType === 2 && extLength > 0) {
        let metaOffset = extOffset
        const { value: sym, bytesRead: symBytes } = decodeLengthPrefixedString(accountData, metaOffset)
        symbol = sym
        metaOffset += symBytes
        const { value: desc, bytesRead: descBytes } = decodeLengthPrefixedString(accountData, metaOffset)
        description = desc
        metaOffset += descBytes
        const { value: uriVal } = decodeLengthPrefixedString(accountData, metaOffset)
        uri = uriVal
      } else if (extType === 3 && extLength > 0) {
        const attrView = new DataView(accountData.buffer, accountData.byteOffset + extOffset)
        const attrCount = attrView.getUint32(0, true)
        let attrOffset = extOffset + 4
        for (let i = 0; i < attrCount && attrOffset < extOffset + extLength; i++) {
          const { value: traitType, bytesRead: traitBytes } = decodeLengthPrefixedString(accountData, attrOffset)
          attrOffset += traitBytes
          const { value: traitValue, bytesRead: valueBytes } = decodeLengthPrefixedString(accountData, attrOffset)
          attrOffset += valueBytes
          attributes.push({ traitType, value: traitValue })
        }
      }

      extOffset += extLength
    }
  }

  const metadata = uri ? await fetchNftMetadataJson(uri) : null

  return {
    mintAddress,
    standard: "nifty",
    name: name.replace(/\0+$/, ""),
    symbol: symbol.replace(/\0+$/, ""),
    description: description || metadata?.description || "",
    uri,
    imageUrl: metadata?.image || null,
    externalUrl: metadata?.external_url || null,
    attributes:
      attributes.length > 0
        ? attributes
        : (metadata?.attributes || []).map((a) => ({ traitType: a.trait_type, value: a.value })),
    updateAuthority,
    owner: ownerAddress,
    isMutable: true,
    royaltiesPercent: (metadata?.seller_fee_basis_points || 0) / 100,
    creators: metadata?.properties?.creators?.map((c) => ({ address: c.address, share: c.share })) || [],
    collectionAddress,
    ruleSetAddress: null,
  }
}

async function loadNft(mintAddress: string): Promise<LoadedNftData> {
  const detection = await detectAssetStandard(mintAddress)

  if (!detection) {
    throw new Error("Could not find NFT or determine asset standard")
  }

  const { standard, accountData } = detection

  switch (standard) {
    case "core":
      return loadCoreAsset(mintAddress, accountData)
    case "pnft":
      return loadPnftMetadata(mintAddress, accountData)
    case "nifty":
      return loadNiftyAsset(mintAddress, accountData)
  }
}

function mapHeliusAssetToBatchNft(asset: HeliusDasAsset): BatchNft {
  const collectionGrouping = asset.grouping?.find((g) => g.group_key === "collection")
  const rawImage = asset.content?.links?.image ?? asset.content?.files?.[0]?.uri ?? ""
  const updateAuthority = asset.authorities?.find((a) => a.scopes.includes("full"))?.address ?? null

  return {
    mint: asset.id,
    name: asset.content?.metadata?.name ?? "Unknown",
    image: rawImage,
    collectionId: collectionGrouping?.group_value ?? null,
    updateAuthority,
    royaltiesPercent: (asset.royalty?.basis_points ?? 0) / 100,
    creators: asset.creators ?? [],
  }
}

async function lookupNftsByCollection(collectionAddress: string): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  let page = 1
  let total = 1

  while (allNfts.length < total) {
    const response = await rpcRequest<HeliusDasResponse>("getAssetsByGroup", {
      groupKey: "collection",
      groupValue: collectionAddress,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })

    total = response.grand_total ?? response.total
    for (const item of response.items) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
    page++
  }

  return allNfts
}

async function lookupNftsByCreator(creatorAddress: string): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  let page = 1
  let total = 1

  while (allNfts.length < total) {
    const response = await rpcRequest<HeliusDasResponse>("getAssetsByCreator", {
      creatorAddress,
      onlyVerified: true,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })

    total = response.grand_total ?? response.total
    for (const item of response.items) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
    page++
  }

  return allNfts
}

async function lookupNftsByHashlist(mintAddresses: string[]): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  const batchSize = 100

  for (let i = 0; i < mintAddresses.length; i += batchSize) {
    const batch = mintAddresses.slice(i, i + batchSize)
    const response = await rpcRequest<HeliusDasAsset[]>("getAssetBatch", {
      ids: batch,
    })

    for (const item of response) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
  }

  return allNfts
}

function validateCreators(creators: Creator[]): { isValid: boolean; errors: CreateFormErrors } {
  const errors: CreateFormErrors = {
    creatorAddresses: {},
    creatorShares: {},
  }

  let totalShare = 0
  let hasErrors = false

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i]

    if (!creator.address.trim()) {
      errors.creatorAddresses![i] = "Address is required"
      hasErrors = true
    } else if (!isValidSolanaAddress(creator.address.trim())) {
      errors.creatorAddresses![i] = "Invalid Solana address"
      hasErrors = true
    }

    if (creator.share < 0 || creator.share > 100) {
      errors.creatorShares![i] = "Share must be 0-100"
      hasErrors = true
    }

    totalShare += creator.share
  }

  if (totalShare !== 100) {
    errors.creators = `Creator shares must sum to 100% (currently ${totalShare}%)`
    hasErrors = true
  }

  return { isValid: !hasErrors, errors }
}

const VALID_TABS: TabValue[] = ["create", "update", "batch"]
const VALID_STANDARDS: AssetStandard[] = ["core", "pnft", "nifty"]

interface NftPreviewData {
  name: string
  symbol: string
  description: string
  imagePreviewUrl: string | null
  attributes: Attribute[]
}

function isValidTab(value: string | null): value is TabValue {
  return value !== null && VALID_TABS.includes(value as TabValue)
}

function isValidStandard(value: string | null): value is AssetStandard {
  return value !== null && VALID_STANDARDS.includes(value as AssetStandard)
}

const ASSET_STANDARDS: Array<{ value: AssetStandard; label: string; icon: typeof Box }> = [
  { value: "core", label: "Core Asset", icon: Box },
  { value: "pnft", label: "pNFT (Metaplex)", icon: Shield },
  { value: "nifty", label: "Nifty Asset", icon: Sparkles },
]

export function CreatorStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const standardParam = searchParams.get("standard")
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "create"
  const activeStandard: AssetStandard = isValidStandard(standardParam) ? standardParam : "core"

  const [previewData, setPreviewData] = useState<NftPreviewData>({
    name: "",
    symbol: "",
    description: "",
    imagePreviewUrl: null,
    attributes: [],
  })

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === "create") {
      newParams.delete("tab")
    } else {
      newParams.set("tab", value)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleStandardChange = (value: AssetStandard) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === "core") {
      newParams.delete("standard")
    } else {
      newParams.set("standard", value)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handlePreviewUpdate = useCallback((data: NftPreviewData) => {
    setPreviewData(data)
  }, [])

  return (
    <div className="h-full flex flex-col animate-fade-up">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10" />
            <Hammer className="relative h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Creator Studio</h1>
            <p className="text-sm text-muted-foreground">Create, update, and manage your NFTs</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <Pencil className="h-4 w-4" />
              Update
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-full">
            <div className="min-h-0">
              <TabsContent value="create" className="mt-0 h-full">
                <CreateTabContent
                  standard={activeStandard}
                  onStandardChange={handleStandardChange}
                  onPreviewUpdate={handlePreviewUpdate}
                />
              </TabsContent>
              <TabsContent value="update" className="mt-0 h-full">
                <UpdateTabContent onPreviewUpdate={handlePreviewUpdate} />
              </TabsContent>
              <TabsContent value="batch" className="mt-0 h-full">
                <BatchTabContent />
              </TabsContent>
            </div>
            <div className="hidden lg:block">
              <NftPreviewCard data={previewData} />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

interface AssetStandardSelectorProps {
  value: AssetStandard
  onChange: (value: AssetStandard) => void
}

function AssetStandardSelector({ value, onChange }: AssetStandardSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">Asset Standard</label>
      <div className="inline-flex items-center rounded-lg bg-muted p-1 text-muted-foreground">
        {ASSET_STANDARDS.map(({ value: standardValue, label, icon: Icon }) => (
          <button
            key={standardValue}
            type="button"
            onClick={() => onChange(standardValue)}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === standardValue
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MintCoreAssetOptions {
  name: string
  uri: string
  collectionAddress?: string
  royaltiesPercent: number
  creators: Array<{ address: Address; percentage: number }>
  isCollectionNft: boolean
  feePayer: TransactionSigner
  account: string
}

async function mintCoreAsset({
  name,
  uri,
  collectionAddress,
  royaltiesPercent,
  creators,
  isCollectionNft,
  feePayer,
  account,
}: MintCoreAssetOptions): Promise<MintResult> {
  const assetSigner = await generateKeyPairSigner()

  const plugins: mplCore.PluginAuthorityPairArgs[] = []

  if (!isCollectionNft && royaltiesPercent > 0 && creators.length > 0) {
    plugins.push({
      plugin: {
        __kind: "Royalties",
        fields: [
          {
            basisPoints: Math.round(royaltiesPercent * 100),
            creators: creators,
            ruleSet: { __kind: "None" },
          },
        ],
      },
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

  return {
    mintAddress: assetSigner.address,
    signature,
  }
}

interface MintPnftOptions {
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

async function mintPnft({
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
}: MintPnftOptions): Promise<MintResult> {
  const mintSigner = await generateKeyPairSigner()
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
    authority: feePayer,
    payer: feePayer,
    splTokenProgram: TOKEN_PROGRAM_ADDRESS,
    mintArgs: {
      __kind: "V1",
      amount: 1,
      authorizationData: null,
    },
    ...(ruleSetAddress && {
      authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
      authorizationRules: ruleSetAddress,
    }),
  })
  instructions.push(mintIx)

  const signature = await prepareAndSendTransaction({
    instructions,
    feePayer,
  })

  return {
    mintAddress,
    signature,
  }
}

function encodeLengthPrefixedString(str: string): Uint8Array {
  const encoder = new TextEncoder()
  const strBytes = encoder.encode(str)
  const buffer = new ArrayBuffer(4 + strBytes.length)
  const view = new DataView(buffer)
  view.setUint32(0, strBytes.length, true)
  const arr = new Uint8Array(buffer)
  arr.set(strBytes, 4)
  return arr
}

function encodeMetadataExtension(symbol: string, description: string, uri: string): Uint8Array {
  const symbolBytes = encodeLengthPrefixedString(symbol)
  const descBytes = encodeLengthPrefixedString(description)
  const uriBytes = encodeLengthPrefixedString(uri)
  const totalLen = symbolBytes.length + descBytes.length + uriBytes.length
  const buffer = new Uint8Array(totalLen)
  let offset = 0
  buffer.set(symbolBytes, offset)
  offset += symbolBytes.length
  buffer.set(descBytes, offset)
  offset += descBytes.length
  buffer.set(uriBytes, offset)
  return buffer
}

function encodeAttributesExtension(attributes: Array<{ traitType: string; value: string }>): Uint8Array {
  const filtered = attributes.filter((a) => a.traitType.trim() && a.value.trim())
  const parts: Uint8Array[] = []
  const countBuffer = new ArrayBuffer(4)
  new DataView(countBuffer).setUint32(0, filtered.length, true)
  parts.push(new Uint8Array(countBuffer))

  for (const attr of filtered) {
    parts.push(encodeLengthPrefixedString(attr.traitType))
    parts.push(encodeLengthPrefixedString(attr.value))
  }

  const totalLen = parts.reduce((sum, p) => sum + p.length, 0)
  const buffer = new Uint8Array(totalLen)
  let offset = 0
  for (const part of parts) {
    buffer.set(part, offset)
    offset += part.length
  }
  return buffer
}

interface MintNiftyAssetOptions {
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
}

async function mintNiftyAsset({
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
}: MintNiftyAssetOptions): Promise<MintResult> {
  const assetSigner = await generateKeyPairSigner()

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

  return {
    mintAddress: assetSigner.address,
    signature,
  }
}

interface UpdateCoreAssetOptions {
  assetAddress: Address
  newName?: string
  newUri?: string
  collectionAddress?: string
  feePayer: TransactionSigner
}

async function updateCoreAsset({
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

interface UpdatePnftOptions {
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

async function updatePnft({
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

interface UpdateNiftyAssetOptions {
  assetAddress: Address
  newName?: string
  newUri?: string
  newSymbol?: string
  newDescription?: string
  attributes?: Array<{ traitType: string; value: string }>
  collectionAddress?: string
  feePayer: TransactionSigner
}

async function updateNiftyAsset({
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

interface CreateTabContentProps {
  standard: AssetStandard
  onStandardChange: (value: AssetStandard) => void
  onPreviewUpdate: (data: NftPreviewData) => void
}

function CreateTabContent({ standard, onStandardChange, onPreviewUpdate }: CreateTabContentProps) {
  const { account } = useWallet()

  const [form, setForm] = useState<CreateFormState>({
    name: "",
    symbol: "",
    description: "",
    externalUrl: "",
    imageFile: null,
    multimediaFile: null,
    multimediaCategory: null,
    royaltiesPercent: 5,
    creators: [],
    attributes: [{ traitType: "", value: "" }],
    collectionAddress: "",
    isMutable: true,
    isCollectionNft: false,
    ruleSetOption: "metaplex",
    customRuleSetAddress: "",
  })

  const [errors, setErrors] = useState<CreateFormErrors>({})
  const [touched, setTouched] = useState<Record<keyof CreateFormState, boolean>>({
    name: false,
    symbol: false,
    description: false,
    externalUrl: false,
    imageFile: false,
    multimediaFile: false,
    multimediaCategory: false,
    royaltiesPercent: false,
    creators: false,
    attributes: false,
    collectionAddress: false,
    isMutable: false,
    isCollectionNft: false,
    ruleSetOption: false,
    customRuleSetAddress: false,
  })

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [multimediaPreviewUrl, setMultimediaPreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const multimediaInputRef = useRef<HTMLInputElement>(null)

  const [uploadStep, setUploadStep] = useState<UploadStep>("idle")
  const [, setUploadedUris] = useState<UploadedUris>({
    imageUri: null,
    multimediaUri: null,
    metadataUri: null,
  })
  const [mintResult, setMintResult] = useState<MintResult | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const { signer, capabilities } = useTransactionSigner()

  const validateField = useCallback((field: TextFormField, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required"
        if (value.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or less`
        return undefined
      case "symbol":
        if (!value.trim()) return "Symbol is required"
        if (value.length > MAX_SYMBOL_LENGTH) return `Symbol must be ${MAX_SYMBOL_LENGTH} characters or less`
        return undefined
      case "description":
        if (!value.trim()) return "Description is required"
        return undefined
      case "externalUrl":
        if (value && !validateUrl(value)) return "Please enter a valid URL"
        return undefined
      default:
        return undefined
    }
  }, [])

  const validateImageFile = useCallback((file: File): string | undefined => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please select a valid image file (JPG, PNG, or GIF)"
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `Image must be ${MAX_IMAGE_SIZE_MB}MB or less`
    }
    return undefined
  }, [])

  const validateMultimediaFile = useCallback((file: File): string | undefined => {
    const category = getMultimediaCategory(file.name)
    if (!category) {
      return "Please select a valid multimedia file (MP4, MOV, MP3, FLAC, WAV, GLB, or GLTF)"
    }
    if (file.size > MAX_MULTIMEDIA_SIZE_BYTES) {
      return `File must be ${MAX_MULTIMEDIA_SIZE_MB}MB or less`
    }
    return undefined
  }, [])

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const error = validateImageFile(file)
      if (error) {
        setErrors((prev) => ({ ...prev, imageFile: error }))
        setTouched((prev) => ({ ...prev, imageFile: true }))
        e.target.value = ""
        return
      }

      setForm((prev) => ({ ...prev, imageFile: file }))
      setErrors((prev) => ({ ...prev, imageFile: undefined }))
      setTouched((prev) => ({ ...prev, imageFile: true }))

      const objectUrl = URL.createObjectURL(file)
      setImagePreviewUrl(objectUrl)
    },
    [validateImageFile]
  )

  const handleImageClear = useCallback(() => {
    setForm((prev) => ({ ...prev, imageFile: null }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }, [imagePreviewUrl])

  const handleMultimediaSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const error = validateMultimediaFile(file)
      if (error) {
        setErrors((prev) => ({ ...prev, multimediaFile: error }))
        setTouched((prev) => ({ ...prev, multimediaFile: true }))
        e.target.value = ""
        return
      }

      const category = getMultimediaCategory(file.name)
      setForm((prev) => ({ ...prev, multimediaFile: file, multimediaCategory: category }))
      setErrors((prev) => ({ ...prev, multimediaFile: undefined }))
      setTouched((prev) => ({ ...prev, multimediaFile: true }))

      const objectUrl = URL.createObjectURL(file)
      setMultimediaPreviewUrl(objectUrl)
    },
    [validateMultimediaFile]
  )

  const handleMultimediaClear = useCallback(() => {
    setForm((prev) => ({ ...prev, multimediaFile: null, multimediaCategory: null }))
    setErrors((prev) => ({ ...prev, multimediaFile: undefined }))
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }
    if (multimediaInputRef.current) {
      multimediaInputRef.current.value = ""
    }
  }, [multimediaPreviewUrl])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      if (multimediaPreviewUrl) {
        URL.revokeObjectURL(multimediaPreviewUrl)
      }
    }
  }, [imagePreviewUrl, multimediaPreviewUrl])

  const handleChange = useCallback(
    (field: TextFormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))

      if (touched[field]) {
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
      }
    },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (field: TextFormField) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }))
    },
    [form, validateField]
  )

  useEffect(() => {
    if (account && form.creators.length === 0) {
      setForm((prev) => ({
        ...prev,
        creators: [{ address: account, share: 100 }],
      }))
    }
  }, [account, form.creators.length])

  useEffect(() => {
    onPreviewUpdate({
      name: form.name,
      symbol: form.symbol,
      description: form.description,
      imagePreviewUrl,
      attributes: form.attributes.filter((attr) => attr.traitType.trim()),
    })
  }, [form.name, form.symbol, form.description, imagePreviewUrl, form.attributes, onPreviewUpdate])

  const handleRoyaltiesChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, royaltiesPercent: value }))
    setTouched((prev) => ({ ...prev, royaltiesPercent: true }))
  }, [])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setForm((prev) => {
      const newCreators = [...prev.creators]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return { ...prev, creators: newCreators }
    })
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const handleAddCreator = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      creators: [...prev.creators, { address: "", share: 0 }],
    }))
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index),
    }))
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const validateCreatorsOnBlur = useCallback(() => {
    if (touched.creators) {
      const { errors: creatorErrors } = validateCreators(form.creators)
      setErrors((prev) => ({
        ...prev,
        creators: creatorErrors.creators,
        creatorAddresses: creatorErrors.creatorAddresses,
        creatorShares: creatorErrors.creatorShares,
      }))
    }
  }, [form.creators, touched.creators])

  const handleAttributeChange = useCallback((index: number, field: "traitType" | "value", value: string) => {
    setForm((prev) => {
      const newAttributes = [...prev.attributes]
      newAttributes[index] = { ...newAttributes[index], [field]: value }
      return { ...prev, attributes: newAttributes }
    })
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleAddAttribute = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { traitType: "", value: "" }],
    }))
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleRemoveAttribute = useCallback((index: number) => {
    setForm((prev) => {
      const newAttributes = prev.attributes.filter((_, i) => i !== index)
      return { ...prev, attributes: newAttributes.length > 0 ? newAttributes : [{ traitType: "", value: "" }] }
    })
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleCollectionAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, collectionAddress: value }))

      if (touched.collectionAddress) {
        const error = value && !isValidSolanaAddress(value) ? "Invalid Solana address" : undefined
        setErrors((prev) => ({ ...prev, collectionAddress: error }))
      }
    },
    [touched.collectionAddress]
  )

  const handleCollectionAddressBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, collectionAddress: true }))
    const error =
      form.collectionAddress && !isValidSolanaAddress(form.collectionAddress) ? "Invalid Solana address" : undefined
    setErrors((prev) => ({ ...prev, collectionAddress: error }))
  }, [form.collectionAddress])

  const handleMutableChange = useCallback((checked: boolean) => {
    setForm((prev) => ({ ...prev, isMutable: checked }))
    setTouched((prev) => ({ ...prev, isMutable: true }))
  }, [])

  const handleCollectionNftChange = useCallback((checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isCollectionNft: checked,
      royaltiesPercent: checked ? 0 : prev.royaltiesPercent,
    }))
    setTouched((prev) => ({ ...prev, isCollectionNft: true }))
  }, [])

  const handleRuleSetOptionChange = useCallback((option: RuleSetOption) => {
    setForm((prev) => ({
      ...prev,
      ruleSetOption: option,
      customRuleSetAddress: option === "custom" ? prev.customRuleSetAddress : "",
    }))
    setTouched((prev) => ({ ...prev, ruleSetOption: true }))
    if (option !== "custom") {
      setErrors((prev) => ({ ...prev, customRuleSetAddress: undefined }))
    }
  }, [])

  const handleCustomRuleSetAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, customRuleSetAddress: value }))

      if (touched.customRuleSetAddress) {
        const error = value && !isValidSolanaAddress(value) ? "Invalid Solana address" : undefined
        setErrors((prev) => ({ ...prev, customRuleSetAddress: error }))
      }
    },
    [touched.customRuleSetAddress]
  )

  const handleCustomRuleSetAddressBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, customRuleSetAddress: true }))
    const error =
      form.customRuleSetAddress && !isValidSolanaAddress(form.customRuleSetAddress)
        ? "Invalid Solana address"
        : undefined
    setErrors((prev) => ({ ...prev, customRuleSetAddress: error }))
  }, [form.customRuleSetAddress])

  const validateForm = useCallback((): boolean => {
    const newErrors: CreateFormErrors = {}
    let isValid = true

    const nameError = validateField("name", form.name)
    if (nameError) {
      newErrors.name = nameError
      isValid = false
    }

    const symbolError = validateField("symbol", form.symbol)
    if (symbolError) {
      newErrors.symbol = symbolError
      isValid = false
    }

    const descriptionError = validateField("description", form.description)
    if (descriptionError) {
      newErrors.description = descriptionError
      isValid = false
    }

    const externalUrlError = validateField("externalUrl", form.externalUrl)
    if (externalUrlError) {
      newErrors.externalUrl = externalUrlError
      isValid = false
    }

    if (!form.imageFile) {
      newErrors.imageFile = "Image is required"
      isValid = false
    }

    if (form.collectionAddress && !isValidSolanaAddress(form.collectionAddress)) {
      newErrors.collectionAddress = "Invalid Solana address"
      isValid = false
    }

    if (!form.isCollectionNft) {
      const { isValid: creatorsValid, errors: creatorErrors } = validateCreators(form.creators)
      if (!creatorsValid) {
        newErrors.creators = creatorErrors.creators
        newErrors.creatorAddresses = creatorErrors.creatorAddresses
        newErrors.creatorShares = creatorErrors.creatorShares
        isValid = false
      }
    }

    if (standard === "pnft" && form.ruleSetOption === "custom") {
      if (!form.customRuleSetAddress) {
        newErrors.customRuleSetAddress = "Custom rule set address is required"
        isValid = false
      } else if (!isValidSolanaAddress(form.customRuleSetAddress)) {
        newErrors.customRuleSetAddress = "Invalid Solana address"
        isValid = false
      }
    }

    setErrors(newErrors)
    setTouched({
      name: true,
      symbol: true,
      description: true,
      externalUrl: true,
      imageFile: true,
      multimediaFile: true,
      multimediaCategory: true,
      royaltiesPercent: true,
      creators: true,
      attributes: true,
      collectionAddress: true,
      isMutable: true,
      isCollectionNft: true,
      ruleSetOption: true,
      customRuleSetAddress: true,
    })

    return isValid
  }, [form, standard, validateField])

  const isFormValid = useCallback((): boolean => {
    if (!form.name.trim()) return false
    if (!form.symbol.trim()) return false
    if (!form.description.trim()) return false
    if (form.externalUrl && !validateUrl(form.externalUrl)) return false
    if (!form.imageFile) return false
    if (form.collectionAddress && !isValidSolanaAddress(form.collectionAddress)) return false

    if (!form.isCollectionNft) {
      const { isValid } = validateCreators(form.creators)
      if (!isValid) return false
    }

    if (standard === "pnft" && form.ruleSetOption === "custom") {
      if (!form.customRuleSetAddress || !isValidSolanaAddress(form.customRuleSetAddress)) return false
    }

    return true
  }, [form, standard])

  const handleSubmit = useCallback(async () => {
    if (!account) {
      toast.error("Please connect your wallet")
      return
    }

    if (!signer || !capabilities.canSign) {
      toast.error("Wallet does not support signing")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before continuing")
      return
    }

    if (!form.imageFile) {
      toast.error("Image is required")
      return
    }

    const connectorSigner: ConnectorSigner = {
      signMessage: signer.signMessage?.bind(signer) as ConnectorSigner["signMessage"],
    }

    try {
      setUploadStep("uploading-image")
      toast.loading("Uploading image...", { id: "upload-progress" })

      const imageResult = await uploadToIrys(form.imageFile, account, connectorSigner)
      setUploadedUris((prev) => ({ ...prev, imageUri: imageResult.uri }))

      let multimediaResult: { uri: string; type: string } | null = null
      if (form.multimediaFile) {
        setUploadStep("uploading-multimedia")
        toast.loading("Uploading multimedia...", { id: "upload-progress" })

        const result = await uploadToIrys(form.multimediaFile, account, connectorSigner)
        multimediaResult = { uri: result.uri, type: form.multimediaFile.type }
        setUploadedUris((prev) => ({ ...prev, multimediaUri: result.uri }))
      }

      setUploadStep("uploading-metadata")
      toast.loading("Uploading metadata...", { id: "upload-progress" })

      const metadataInput: NftMetadataInput = {
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        image: imageResult.uri,
        imageType: form.imageFile.type,
        externalUrl: form.externalUrl || undefined,
        attributes: form.attributes
          .filter((attr) => attr.traitType.trim() && attr.value.trim())
          .map((attr) => ({ trait_type: attr.traitType, value: attr.value })),
      }

      if (multimediaResult) {
        metadataInput.animationUrl = multimediaResult.uri
        metadataInput.animationType = multimediaResult.type
        metadataInput.multimediaCategory = form.multimediaCategory as IrysMultimediaCategory
      }

      if (!form.isCollectionNft) {
        metadataInput.sellerFeeBasisPoints = Math.round(form.royaltiesPercent * 100)
        metadataInput.creators = form.creators.map((c) => ({
          address: c.address,
          share: c.share,
          verified: c.address === account,
        }))
      }

      const metadataResult = await uploadJsonMetadata(metadataInput, account, connectorSigner)
      setUploadedUris((prev) => ({ ...prev, metadataUri: metadataResult.uri }))

      setUploadStep("minting")
      toast.loading("Minting NFT...", { id: "upload-progress" })

      let result: MintResult

      if (standard === "core") {
        result = await mintCoreAsset({
          name: form.name,
          uri: metadataResult.uri,
          collectionAddress: form.collectionAddress || undefined,
          royaltiesPercent: form.isCollectionNft ? 0 : form.royaltiesPercent,
          creators: form.isCollectionNft
            ? []
            : form.creators.map((c) => ({
                address: c.address as Address,
                percentage: c.share,
              })),
          isCollectionNft: form.isCollectionNft,
          feePayer: signer as unknown as TransactionSigner,
          account,
        })
      } else if (standard === "pnft") {
        result = await mintPnft({
          name: form.name,
          symbol: form.symbol,
          uri: metadataResult.uri,
          sellerFeeBasisPoints: form.isCollectionNft ? 0 : Math.round(form.royaltiesPercent * 100),
          creators: form.isCollectionNft
            ? []
            : form.creators.map((c) => ({
                address: c.address as Address,
                verified: c.address === account,
                share: c.share,
              })),
          collectionAddress: form.collectionAddress || undefined,
          ruleSetOption: form.ruleSetOption,
          customRuleSetAddress: form.customRuleSetAddress || undefined,
          isMutable: form.isMutable,
          isCollectionNft: form.isCollectionNft,
          feePayer: signer as unknown as TransactionSigner,
          account,
        })
      } else {
        result = await mintNiftyAsset({
          name: form.name,
          uri: metadataResult.uri,
          symbol: form.symbol,
          description: form.description,
          attributes: form.attributes,
          collectionAddress: form.collectionAddress || undefined,
          isMutable: form.isMutable,
          isCollectionNft: form.isCollectionNft,
          feePayer: signer as unknown as TransactionSigner,
          account,
        })
      }

      setMintResult(result)
      setUploadStep("complete")
      toast.success("NFT created successfully!", { id: "upload-progress" })
      setShowSuccessDialog(true)
    } catch (err) {
      console.error("Operation failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Operation failed"
      toast.error(errorMessage, {
        id: "upload-progress",
        action: {
          label: "Retry",
          onClick: () => handleSubmit(),
        },
      })
      setUploadStep("idle")
    }
  }, [account, signer, capabilities.canSign, form, standard, validateForm])

  const isSubmitting = uploadStep !== "idle" && uploadStep !== "complete"

  const getSubmitButtonText = (): string => {
    switch (uploadStep) {
      case "uploading-image":
        return "Uploading image..."
      case "uploading-multimedia":
        return "Uploading multimedia..."
      case "uploading-metadata":
        return "Uploading metadata..."
      case "minting":
        return "Minting NFT..."
      case "complete":
        return mintResult ? "NFT Created!" : "Ready to mint"
      default:
        return "Create NFT"
    }
  }

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      symbol: "",
      description: "",
      externalUrl: "",
      imageFile: null,
      multimediaFile: null,
      multimediaCategory: null,
      royaltiesPercent: 5,
      creators: account ? [{ address: account, share: 100 }] : [],
      attributes: [{ traitType: "", value: "" }],
      collectionAddress: "",
      isMutable: true,
      isCollectionNft: false,
      ruleSetOption: "metaplex",
      customRuleSetAddress: "",
    })
    setErrors({})
    setTouched({
      name: false,
      symbol: false,
      description: false,
      externalUrl: false,
      imageFile: false,
      multimediaFile: false,
      multimediaCategory: false,
      royaltiesPercent: false,
      creators: false,
      attributes: false,
      collectionAddress: false,
      isMutable: false,
      isCollectionNft: false,
      ruleSetOption: false,
      customRuleSetAddress: false,
    })
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
    if (multimediaInputRef.current) {
      multimediaInputRef.current.value = ""
    }
    setUploadStep("idle")
    setUploadedUris({ imageUri: null, multimediaUri: null, metadataUri: null })
    setMintResult(null)
  }, [account, imagePreviewUrl, multimediaPreviewUrl])

  const handleSuccessDialogClose = useCallback(() => {
    setShowSuccessDialog(false)
    resetForm()
  }, [resetForm])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }, [])

  return (
    <div className="space-y-6">
      <AssetStandardSelector value={standard} onChange={onStandardChange} />

      <div className="space-y-4">
        <FormField
          label="Name"
          required
          error={errors.name}
          counter={{ current: form.name.length, max: MAX_NAME_LENGTH }}
        >
          <Input
            value={form.name}
            onChange={handleChange("name")}
            onBlur={handleBlur("name")}
            placeholder="My Awesome NFT"
            maxLength={MAX_NAME_LENGTH}
            error={!!errors.name}
          />
        </FormField>

        <FormField
          label="Symbol"
          required
          error={errors.symbol}
          counter={{ current: form.symbol.length, max: MAX_SYMBOL_LENGTH }}
        >
          <Input
            value={form.symbol}
            onChange={handleChange("symbol")}
            onBlur={handleBlur("symbol")}
            placeholder="NFT"
            maxLength={MAX_SYMBOL_LENGTH}
            error={!!errors.symbol}
          />
        </FormField>

        <FormField label="Description" required error={errors.description}>
          <Textarea
            value={form.description}
            onChange={handleChange("description")}
            onBlur={handleBlur("description")}
            placeholder="Describe your NFT..."
            rows={4}
            error={!!errors.description}
          />
        </FormField>

        <FormField label="External URL / Website" error={errors.externalUrl}>
          <Input
            type="url"
            value={form.externalUrl}
            onChange={handleChange("externalUrl")}
            onBlur={handleBlur("externalUrl")}
            placeholder="https://example.com"
            error={!!errors.externalUrl}
          />
        </FormField>

        <FormField label="Image" required error={errors.imageFile}>
          <input
            ref={imageInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_EXTENSIONS}
            onChange={handleImageSelect}
            className="hidden"
          />
          {form.imageFile && imagePreviewUrl ? (
            <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
              <img src={imagePreviewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{form.imageFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(form.imageFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleImageClear}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => imageInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                <span>Select Image</span>
                <span className="text-xs">JPG, PNG, or GIF (max {MAX_IMAGE_SIZE_MB}MB)</span>
              </div>
            </Button>
          )}
        </FormField>

        <FormField label="Multimedia (Optional)" error={errors.multimediaFile}>
          <input
            ref={multimediaInputRef}
            type="file"
            accept={ACCEPTED_MULTIMEDIA_EXTENSIONS}
            onChange={handleMultimediaSelect}
            className="hidden"
          />
          {form.multimediaFile && multimediaPreviewUrl ? (
            <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
              <MultimediaPreview category={form.multimediaCategory} previewUrl={multimediaPreviewUrl} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{form.multimediaFile.name}</p>
                  <MultimediaCategoryBadge category={form.multimediaCategory} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(form.multimediaFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleMultimediaClear}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => multimediaInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Film className="h-8 w-8" />
                <span>Add Multimedia</span>
                <span className="text-xs">Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)</span>
              </div>
            </Button>
          )}
        </FormField>

        {!form.isCollectionNft && (
          <RoyaltiesCreatorsSection
            royaltiesPercent={form.royaltiesPercent}
            creators={form.creators}
            errors={errors}
            onRoyaltiesChange={handleRoyaltiesChange}
            onCreatorChange={handleCreatorChange}
            onAddCreator={handleAddCreator}
            onRemoveCreator={handleRemoveCreator}
            onBlur={validateCreatorsOnBlur}
          />
        )}

        {!form.isCollectionNft && (
          <AttributesSection
            attributes={form.attributes}
            onAttributeChange={handleAttributeChange}
            onAddAttribute={handleAddAttribute}
            onRemoveAttribute={handleRemoveAttribute}
          />
        )}

        <CollectionSection
          collectionAddress={form.collectionAddress}
          error={errors.collectionAddress}
          onChange={handleCollectionAddressChange}
          onBlur={handleCollectionAddressBlur}
        />

        <SettingsSection
          isMutable={form.isMutable}
          isCollectionNft={form.isCollectionNft}
          onMutableChange={handleMutableChange}
          onCollectionNftChange={handleCollectionNftChange}
        />

        {standard === "pnft" && (
          <RuleSetSection
            ruleSetOption={form.ruleSetOption}
            customRuleSetAddress={form.customRuleSetAddress}
            error={errors.customRuleSetAddress}
            onRuleSetOptionChange={handleRuleSetOptionChange}
            onCustomAddressChange={handleCustomRuleSetAddressChange}
            onCustomAddressBlur={handleCustomRuleSetAddressBlur}
          />
        )}

        <div className="pt-6 border-t">
          <Button
            type="button"
            className="w-full h-12"
            disabled={!isFormValid() || isSubmitting || !account || mintResult !== null}
            onClick={handleSubmit}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mintResult && <CheckCircle2 className="h-4 w-4 mr-2" />}
            {getSubmitButtonText()}
          </Button>
          {!account && <p className="text-sm text-muted-foreground text-center mt-2">Connect wallet to create NFT</p>}
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              NFT Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your {standard === "core" ? "Core Asset" : standard === "pnft" ? "pNFT" : "Nifty Asset"} has been minted
              on Solana.
            </DialogDescription>
          </DialogHeader>

          {mintResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mint Address</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                    {mintResult.mintAddress}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyToClipboard(mintResult.mintAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Transaction Signature</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                    {mintResult.signature.slice(0, 20)}...{mintResult.signature.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyToClipboard(mintResult.signature)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={`https://solscan.io/token/${mintResult.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
                    "ring-offset-background transition-all duration-200 ease-out-expo",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover",
                    "h-10 px-4 py-2 text-sm w-full"
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Solscan
                </a>
                <a
                  href={`https://solscan.io/tx/${mintResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
                    "ring-offset-background transition-all duration-200 ease-out-expo",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover",
                    "h-10 px-4 py-2 text-sm w-full"
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Transaction
                </a>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={handleSuccessDialogClose} className="w-full">
              Create Another NFT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface RoyaltiesCreatorsSectionProps {
  royaltiesPercent: number
  creators: Creator[]
  errors: CreateFormErrors
  onRoyaltiesChange: (value: number) => void
  onCreatorChange: (index: number, field: "address" | "share", value: string | number) => void
  onAddCreator: () => void
  onRemoveCreator: (index: number) => void
  onBlur: () => void
}

function RoyaltiesCreatorsSection({
  royaltiesPercent,
  creators,
  errors,
  onRoyaltiesChange,
  onCreatorChange,
  onAddCreator,
  onRemoveCreator,
  onBlur,
}: RoyaltiesCreatorsSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Royalties</Label>
          <span className="text-sm font-medium">{royaltiesPercent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={royaltiesPercent}
          onChange={(e) => onRoyaltiesChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <p className="text-xs text-muted-foreground">Percentage of secondary sales you receive as royalties</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Creators</Label>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddCreator}>
            <Plus className="h-4 w-4 mr-1" />
            Add Creator
          </Button>
        </div>

        {errors.creators && <p className="text-sm text-destructive">{errors.creators}</p>}

        <div className="space-y-2">
          {creators.map((creator, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={creator.address}
                  onChange={(e) => onCreatorChange(index, "address", e.target.value)}
                  onBlur={onBlur}
                  placeholder="Wallet address"
                  error={!!errors.creatorAddresses?.[index]}
                />
                {errors.creatorAddresses?.[index] && (
                  <p className="text-xs text-destructive mt-1">{errors.creatorAddresses[index]}</p>
                )}
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={creator.share}
                  onChange={(e) => onCreatorChange(index, "share", parseInt(e.target.value) || 0)}
                  onBlur={onBlur}
                  placeholder="%"
                  error={!!errors.creatorShares?.[index]}
                />
                {errors.creatorShares?.[index] && (
                  <p className="text-xs text-destructive mt-1">{errors.creatorShares[index]}</p>
                )}
              </div>
              {creators.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveCreator(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Creator shares must sum to 100%. The first creator is typically the primary creator.
        </p>
      </div>
    </div>
  )
}

interface AttributesSectionProps {
  attributes: Attribute[]
  onAttributeChange: (index: number, field: "traitType" | "value", value: string) => void
  onAddAttribute: () => void
  onRemoveAttribute: (index: number) => void
}

function AttributesSection({
  attributes,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
}: AttributesSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Attributes / Traits</Label>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddAttribute}>
            <Plus className="h-4 w-4 mr-1" />
            Add Attribute
          </Button>
        </div>

        <div className="space-y-2">
          {attributes.map((attribute, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={attribute.traitType}
                  onChange={(e) => onAttributeChange(index, "traitType", e.target.value)}
                  placeholder="Trait type (e.g., Background)"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={attribute.value}
                  onChange={(e) => onAttributeChange(index, "value", e.target.value)}
                  placeholder="Value (e.g., Blue)"
                />
              </div>
              {attributes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveAttribute(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Add traits to describe your NFT. Attributes with empty trait types will be excluded.
        </p>
      </div>
    </div>
  )
}

interface CollectionSectionProps {
  collectionAddress: string
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

function CollectionSection({ collectionAddress, error, onChange, onBlur }: CollectionSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-2">
        <Label className={cn(error && "text-destructive")}>Collection</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={collectionAddress}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Collection address (optional)"
              error={!!error}
            />
          </div>
          <Button type="button" variant="outline" className="shrink-0" disabled>
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose Collection
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Optionally assign this NFT to a collection. Leave empty to create a standalone NFT.
        </p>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  isMutable: boolean
  isCollectionNft: boolean
  onMutableChange: (checked: boolean) => void
  onCollectionNftChange: (checked: boolean) => void
}

function SettingsSection({ isMutable, isCollectionNft, onMutableChange, onCollectionNftChange }: SettingsSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <Label>Settings</Label>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="mutable-toggle" className="text-sm font-medium cursor-pointer">
              Mutable
            </Label>
            <p className="text-xs text-muted-foreground">Allow this NFT to be updated after creation</p>
          </div>
          <Switch id="mutable-toggle" checked={isMutable} onCheckedChange={onMutableChange} />
        </div>

        {!isMutable && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs">
              <span className="font-medium">Warning:</span> Immutability is permanent. Once created, this NFT&apos;s
              metadata cannot be changed.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="collection-nft-toggle" className="text-sm font-medium cursor-pointer">
              Create as Collection NFT
            </Label>
            <p className="text-xs text-muted-foreground">Create a collection NFT that other NFTs can be added to</p>
          </div>
          <Switch id="collection-nft-toggle" checked={isCollectionNft} onCheckedChange={onCollectionNftChange} />
        </div>

        {isCollectionNft && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Collection NFTs do not have attributes or royalties. These sections have been hidden.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const RULE_SET_OPTIONS: Array<{ value: RuleSetOption; label: string; description: string }> = [
  {
    value: "metaplex",
    label: "Metaplex",
    description: "Standard Metaplex rule set for royalty enforcement",
  },
  {
    value: "compatibility",
    label: "Compatibility",
    description: "Allows trading on all marketplaces",
  },
  {
    value: "none",
    label: "None",
    description: "No programmable rules applied",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Specify your own rule set address",
  },
]

interface RuleSetSectionProps {
  ruleSetOption: RuleSetOption
  customRuleSetAddress: string
  error?: string
  onRuleSetOptionChange: (option: RuleSetOption) => void
  onCustomAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCustomAddressBlur: () => void
}

function RuleSetSection({
  ruleSetOption,
  customRuleSetAddress,
  error,
  onRuleSetOptionChange,
  onCustomAddressChange,
  onCustomAddressBlur,
}: RuleSetSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-1">
        <Label>Rule Set</Label>
        <p className="text-xs text-muted-foreground">
          pNFTs use rule sets to control transfer behavior and royalty enforcement
        </p>
      </div>

      <div className="space-y-2">
        {RULE_SET_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
              ruleSetOption === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <input
              type="radio"
              name="ruleSetOption"
              value={option.value}
              checked={ruleSetOption === option.value}
              onChange={() => onRuleSetOptionChange(option.value)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{option.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      {ruleSetOption === "custom" && (
        <div className="space-y-2">
          <Label className={cn(error && "text-destructive")}>Custom Rule Set Address</Label>
          <Input
            value={customRuleSetAddress}
            onChange={onCustomAddressChange}
            onBlur={onCustomAddressBlur}
            placeholder="Enter rule set address"
            error={!!error}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {ruleSetOption !== "custom" && ruleSetOption !== "none" && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Address:</span>{" "}
            <code className="font-mono text-xs">{RULE_SET_ADDRESSES[ruleSetOption]}</code>
          </p>
        </div>
      )}
    </div>
  )
}

interface MultimediaPreviewProps {
  category: MultimediaCategory | null
  previewUrl: string
}

function MultimediaPreview({ category, previewUrl }: MultimediaPreviewProps) {
  if (category === "video") {
    return <video src={previewUrl} className="h-24 w-24 rounded-lg object-cover border" muted playsInline />
  }

  if (category === "audio") {
    return (
      <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
        <audio src={previewUrl} controls className="w-20" />
      </div>
    )
  }

  if (category === "vr") {
    return (
      <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
        <Box className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
      <Film className="h-10 w-10 text-muted-foreground" />
    </div>
  )
}

interface MultimediaCategoryBadgeProps {
  category: MultimediaCategory | null
}

function MultimediaCategoryBadge({ category }: MultimediaCategoryBadgeProps) {
  if (!category) return null

  const config: Record<MultimediaCategory, { label: string; icon: typeof Film }> = {
    video: { label: "Video", icon: Film },
    audio: { label: "Audio", icon: Music },
    vr: { label: "3D Model", icon: Box },
  }

  const { label, icon: Icon } = config[category]

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  counter?: { current: number; max: number }
  children: React.ReactNode
}

function FormField({ label, required, error, counter, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {counter && (
          <span className={cn("text-xs", counter.current > counter.max ? "text-destructive" : "text-muted-foreground")}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface UpdateFormState {
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
  collectionAddress: string
  isMutable: boolean
}

interface OriginalFormState {
  name: string
  symbol: string
  description: string
  externalUrl: string
  imageUrl: string | null
  royaltiesPercent: number
  creators: Creator[]
  attributes: Attribute[]
  collectionAddress: string
  isMutable: boolean
}

interface UpdateTabContentProps {
  onPreviewUpdate: (data: NftPreviewData) => void
}

type UpdateStep = "idle" | "uploading-image" | "uploading-multimedia" | "uploading-metadata" | "updating" | "complete"

function UpdateTabContent({ onPreviewUpdate }: UpdateTabContentProps) {
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenAddressError, setTokenAddressError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [loadedNft, setLoadedNft] = useState<LoadedNftData | null>(null)
  const [authorityError, setAuthorityError] = useState<string | undefined>()
  const [updateStep, setUpdateStep] = useState<UpdateStep>("idle")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [updateSignature, setUpdateSignature] = useState<string | null>(null)

  const [form, setForm] = useState<UpdateFormState>({
    name: "",
    symbol: "",
    description: "",
    externalUrl: "",
    imageFile: null,
    multimediaFile: null,
    multimediaCategory: null,
    royaltiesPercent: 0,
    creators: [],
    attributes: [{ traitType: "", value: "" }],
    collectionAddress: "",
    isMutable: true,
  })

  const [originalForm, setOriginalForm] = useState<OriginalFormState | null>(null)
  const [errors, setErrors] = useState<CreateFormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [multimediaPreviewUrl, setMultimediaPreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const multimediaInputRef = useRef<HTMLInputElement>(null)

  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required"
        if (value.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or less`
        return undefined
      case "symbol":
        if (!value.trim()) return "Symbol is required"
        if (value.length > MAX_SYMBOL_LENGTH) return `Symbol must be ${MAX_SYMBOL_LENGTH} characters or less`
        return undefined
      case "description":
        if (!value.trim()) return "Description is required"
        return undefined
      case "externalUrl":
        if (value && !validateUrl(value)) return "Please enter a valid URL"
        return undefined
      default:
        return undefined
    }
  }, [])

  const populateFormFromNft = useCallback(
    (nftData: LoadedNftData) => {
      const attrs = nftData.attributes.length > 0 ? nftData.attributes : [{ traitType: "", value: "" }]
      const creators = nftData.creators.length > 0 ? nftData.creators : [{ address: account || "", share: 100 }]

      setForm({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        externalUrl: nftData.externalUrl || "",
        imageFile: null,
        multimediaFile: null,
        multimediaCategory: null,
        royaltiesPercent: nftData.royaltiesPercent,
        creators,
        attributes: attrs,
        collectionAddress: nftData.collectionAddress || "",
        isMutable: nftData.isMutable,
      })

      setOriginalForm({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        externalUrl: nftData.externalUrl || "",
        imageUrl: nftData.imageUrl,
        royaltiesPercent: nftData.royaltiesPercent,
        creators,
        attributes: attrs,
        collectionAddress: nftData.collectionAddress || "",
        isMutable: nftData.isMutable,
      })

      if (nftData.imageUrl) {
        setImagePreviewUrl(nftData.imageUrl)
      }

      setErrors({})
      setTouched({})
    },
    [account]
  )

  const handleTokenAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTokenAddress(value)
    setTokenAddressError(undefined)
    setAuthorityError(undefined)
  }, [])

  const handleTokenAddressBlur = useCallback(() => {
    if (tokenAddress && !isValidSolanaAddress(tokenAddress)) {
      setTokenAddressError("Invalid Solana address")
    }
  }, [tokenAddress])

  const handleLoadNft = useCallback(async () => {
    if (!tokenAddress) {
      setTokenAddressError("Token address is required")
      return
    }

    if (!isValidSolanaAddress(tokenAddress)) {
      setTokenAddressError("Invalid Solana address")
      return
    }

    setIsLoading(true)
    setTokenAddressError(undefined)
    setAuthorityError(undefined)
    setLoadedNft(null)

    try {
      const nftData = await loadNft(tokenAddress)
      setLoadedNft(nftData)

      if (account && nftData.updateAuthority !== account) {
        setAuthorityError(
          `You are not the update authority. Update authority: ${nftData.updateAuthority.slice(0, 8)}...${nftData.updateAuthority.slice(-8)}`
        )
      }

      populateFormFromNft(nftData)

      onPreviewUpdate({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        imagePreviewUrl: nftData.imageUrl,
        attributes: nftData.attributes,
      })

      toast.success(`Loaded ${ASSET_STANDARDS.find((s) => s.value === nftData.standard)?.label || nftData.standard}`)
    } catch (err) {
      console.error("Failed to load NFT:", err)
      const message = err instanceof Error ? err.message : "Failed to load NFT"
      setTokenAddressError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [tokenAddress, account, onPreviewUpdate, populateFormFromNft])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isLoading) {
        handleLoadNft()
      }
    },
    [handleLoadNft, isLoading]
  )

  const handleChange = useCallback(
    (field: "name" | "symbol" | "description" | "externalUrl") =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value
        setForm((prev) => ({ ...prev, [field]: value }))

        if (touched[field]) {
          setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
        }
      },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (field: "name" | "symbol" | "description" | "externalUrl") => () => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }))
    },
    [form, validateField]
  )

  const handleRoyaltiesChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, royaltiesPercent: value }))
  }, [])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setForm((prev) => {
      const newCreators = [...prev.creators]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return { ...prev, creators: newCreators }
    })
  }, [])

  const handleAddCreator = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      creators: [...prev.creators, { address: "", share: 0 }],
    }))
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index),
    }))
  }, [])

  const handleAttributeChange = useCallback((index: number, field: "traitType" | "value", value: string) => {
    setForm((prev) => {
      const newAttributes = [...prev.attributes]
      newAttributes[index] = { ...newAttributes[index], [field]: value }
      return { ...prev, attributes: newAttributes }
    })
  }, [])

  const handleAddAttribute = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { traitType: "", value: "" }],
    }))
  }, [])

  const handleRemoveAttribute = useCallback((index: number) => {
    setForm((prev) => {
      const newAttributes = prev.attributes.filter((_, i) => i !== index)
      return { ...prev, attributes: newAttributes.length > 0 ? newAttributes : [{ traitType: "", value: "" }] }
    })
  }, [])

  const handleCollectionAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, collectionAddress: value }))
  }, [])

  const handleCollectionAddressBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, collectionAddress: true }))
    const error =
      form.collectionAddress && !isValidSolanaAddress(form.collectionAddress) ? "Invalid Solana address" : undefined
    setErrors((prev) => ({ ...prev, collectionAddress: error }))
  }, [form.collectionAddress])

  const validateCreatorsOnBlur = useCallback(() => {
    const { errors: creatorErrors } = validateCreators(form.creators)
    setErrors((prev) => ({
      ...prev,
      creators: creatorErrors.creators,
      creatorAddresses: creatorErrors.creatorAddresses,
      creatorShares: creatorErrors.creatorShares,
    }))
  }, [form.creators])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, imageFile: "Please select a valid image file (JPG, PNG, or GIF)" }))
      e.target.value = ""
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, imageFile: `Image must be ${MAX_IMAGE_SIZE_MB}MB or less` }))
      e.target.value = ""
      return
    }

    setForm((prev) => ({ ...prev, imageFile: file }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))

    const objectUrl = URL.createObjectURL(file)
    setImagePreviewUrl(objectUrl)
  }, [])

  const handleImageClear = useCallback(() => {
    setForm((prev) => ({ ...prev, imageFile: null }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))
    if (imagePreviewUrl && originalForm?.imageUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl(originalForm?.imageUrl || null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }, [imagePreviewUrl, originalForm?.imageUrl])

  const handleMultimediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const category = getMultimediaCategory(file.name)
    if (!category) {
      setErrors((prev) => ({
        ...prev,
        multimediaFile: "Please select a valid multimedia file (MP4, MOV, MP3, FLAC, WAV, GLB, or GLTF)",
      }))
      e.target.value = ""
      return
    }
    if (file.size > MAX_MULTIMEDIA_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, multimediaFile: `File must be ${MAX_MULTIMEDIA_SIZE_MB}MB or less` }))
      e.target.value = ""
      return
    }

    setForm((prev) => ({ ...prev, multimediaFile: file, multimediaCategory: category }))
    setErrors((prev) => ({ ...prev, multimediaFile: undefined }))

    const objectUrl = URL.createObjectURL(file)
    setMultimediaPreviewUrl(objectUrl)
  }, [])

  const handleMultimediaClear = useCallback(() => {
    setForm((prev) => ({ ...prev, multimediaFile: null, multimediaCategory: null }))
    setErrors((prev) => ({ ...prev, multimediaFile: undefined }))
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }
    if (multimediaInputRef.current) {
      multimediaInputRef.current.value = ""
    }
  }, [multimediaPreviewUrl])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && originalForm?.imageUrl !== imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      if (multimediaPreviewUrl) {
        URL.revokeObjectURL(multimediaPreviewUrl)
      }
    }
  }, [imagePreviewUrl, multimediaPreviewUrl, originalForm?.imageUrl])

  useEffect(() => {
    if (loadedNft) {
      onPreviewUpdate({
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        imagePreviewUrl,
        attributes: form.attributes.filter((attr) => attr.traitType.trim()),
      })
    }
  }, [form.name, form.symbol, form.description, imagePreviewUrl, form.attributes, loadedNft, onPreviewUpdate])

  const isFieldDirty = useCallback(
    (field: keyof OriginalFormState): boolean => {
      if (!originalForm) return false
      if (field === "creators" || field === "attributes") {
        return JSON.stringify(form[field]) !== JSON.stringify(originalForm[field])
      }
      return form[field as keyof UpdateFormState] !== originalForm[field]
    },
    [form, originalForm]
  )

  const isImageDirty = useMemo(() => {
    if (!originalForm) return false
    return form.imageFile !== null
  }, [form.imageFile, originalForm])

  const isFormDirty = useMemo(() => {
    if (!originalForm) return false
    return (
      form.name !== originalForm.name ||
      form.symbol !== originalForm.symbol ||
      form.description !== originalForm.description ||
      form.externalUrl !== originalForm.externalUrl ||
      form.imageFile !== null ||
      form.royaltiesPercent !== originalForm.royaltiesPercent ||
      form.collectionAddress !== originalForm.collectionAddress ||
      JSON.stringify(form.creators) !== JSON.stringify(originalForm.creators) ||
      JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes)
    )
  }, [form, originalForm])

  const handleCancel = useCallback(() => {
    if (!originalForm || !loadedNft) return

    if (imagePreviewUrl && originalForm.imageUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }

    populateFormFromNft(loadedNft)
    toast.info("Changes discarded")
  }, [originalForm, loadedNft, imagePreviewUrl, multimediaPreviewUrl, populateFormFromNft])

  const handleUpdateSubmit = useCallback(async () => {
    if (!loadedNft || !account || !originalForm || !isFormDirty) return
    if (!signer || !capabilities?.canSignMessage) {
      toast.error("Please connect a wallet that can sign messages")
      return
    }

    const toastId = "update-nft"
    try {
      let imageUri = originalForm.imageUrl
      let multimediaUri: string | null = null

      const needsMetadataUpload =
        form.name !== originalForm.name ||
        form.symbol !== originalForm.symbol ||
        form.description !== originalForm.description ||
        form.externalUrl !== originalForm.externalUrl ||
        form.imageFile !== null ||
        form.multimediaFile !== null ||
        form.royaltiesPercent !== originalForm.royaltiesPercent ||
        JSON.stringify(form.creators) !== JSON.stringify(originalForm.creators) ||
        JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes)

      if (form.imageFile) {
        setUpdateStep("uploading-image")
        toast.loading("Uploading new image...", { id: toastId })
        const imageResult = await uploadToIrys(form.imageFile, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        imageUri = imageResult.uri
      }

      if (form.multimediaFile && form.multimediaCategory) {
        setUpdateStep("uploading-multimedia")
        toast.loading("Uploading multimedia...", { id: toastId })
        const multimediaResult = await uploadToIrys(form.multimediaFile, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        multimediaUri = multimediaResult.uri
      }

      let metadataUri = loadedNft.uri
      if (needsMetadataUpload) {
        setUpdateStep("uploading-metadata")
        toast.loading("Uploading metadata...", { id: toastId })

        const metadataInput: NftMetadataInput = {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          image: imageUri || "",
          externalUrl: form.externalUrl || undefined,
          attributes: form.attributes
            .filter((a) => a.traitType.trim())
            .map((a) => ({ trait_type: a.traitType, value: a.value })),
          sellerFeeBasisPoints: Math.round(form.royaltiesPercent * 100),
          creators: form.creators.map((c) => ({ address: c.address, share: c.share })),
        }

        if (multimediaUri && form.multimediaCategory) {
          metadataInput.animationUrl = multimediaUri
          metadataInput.multimediaCategory = form.multimediaCategory as IrysMultimediaCategory
        }

        if (imageUri) {
          metadataInput.imageType = form.imageFile?.type
        }

        const metadataResult = await uploadJsonMetadata(metadataInput, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        metadataUri = metadataResult.uri
      }

      setUpdateStep("updating")
      toast.loading("Updating NFT...", { id: toastId })

      const feePayer = signer as unknown as TransactionSigner
      let signature: string

      if (loadedNft.standard === "core") {
        signature = await updateCoreAsset({
          assetAddress: loadedNft.mintAddress as Address,
          newName: form.name !== originalForm.name ? form.name : undefined,
          newUri: metadataUri !== loadedNft.uri ? metadataUri : undefined,
          collectionAddress: form.collectionAddress || undefined,
          feePayer,
        })
      } else if (loadedNft.standard === "pnft") {
        const creators = form.creators.map((c) => ({
          address: c.address as Address,
          verified: c.address === account,
          share: c.share,
        }))

        signature = await updatePnft({
          mintAddress: loadedNft.mintAddress as Address,
          newName: form.name,
          newSymbol: form.symbol,
          newUri: metadataUri,
          sellerFeeBasisPoints: Math.round(form.royaltiesPercent * 100),
          creators,
          collectionAddress: form.collectionAddress || undefined,
          originalCollectionAddress: originalForm.collectionAddress || undefined,
          ruleSetAddress: loadedNft.ruleSetAddress ? (loadedNft.ruleSetAddress as Address) : null,
          feePayer,
          account,
        })
      } else {
        signature = await updateNiftyAsset({
          assetAddress: loadedNft.mintAddress as Address,
          newName: form.name !== originalForm.name ? form.name : undefined,
          newUri: metadataUri !== loadedNft.uri ? metadataUri : undefined,
          newSymbol: form.symbol !== originalForm.symbol ? form.symbol : undefined,
          newDescription: form.description !== originalForm.description ? form.description : undefined,
          attributes:
            JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes) ? form.attributes : undefined,
          collectionAddress: form.collectionAddress || undefined,
          feePayer,
        })
      }

      setUpdateStep("complete")
      setUpdateSignature(signature)
      toast.success("NFT updated successfully!", { id: toastId })
      setShowSuccessDialog(true)

      const updatedNft = await loadNft(loadedNft.mintAddress)
      setLoadedNft(updatedNft)
      populateFormFromNft(updatedNft)

      onPreviewUpdate({
        name: updatedNft.name,
        symbol: updatedNft.symbol,
        description: updatedNft.description,
        imagePreviewUrl: updatedNft.imageUrl,
        attributes: updatedNft.attributes,
      })
    } catch (err) {
      console.error("Update failed:", err)
      const message = err instanceof Error ? err.message : "Update failed"
      toast.error(message, {
        id: toastId,
        action: {
          label: "Retry",
          onClick: handleUpdateSubmit,
        },
      })
    } finally {
      setUpdateStep("idle")
    }
  }, [loadedNft, account, originalForm, isFormDirty, signer, capabilities, form, populateFormFromNft, onPreviewUpdate])

  const getStandardBadge = (standard: AssetStandard) => {
    const config = ASSET_STANDARDS.find((s) => s.value === standard)
    if (!config) return null
    const Icon = config.icon
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    )
  }

  const canUpdate = loadedNft && account && loadedNft.updateAuthority === account && !authorityError

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className={cn(tokenAddressError && "text-destructive")}>Token Address</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                value={tokenAddress}
                onChange={handleTokenAddressChange}
                onBlur={handleTokenAddressBlur}
                onKeyDown={handleKeyDown}
                placeholder="Enter NFT mint address"
                error={!!tokenAddressError}
                disabled={isLoading}
              />
            </div>
            <Button type="button" onClick={handleLoadNft} disabled={isLoading || !tokenAddress} className="shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {isLoading ? "Loading..." : "Load NFT"}
            </Button>
          </div>
          {tokenAddressError && <p className="text-sm text-destructive">{tokenAddressError}</p>}
          <p className="text-xs text-muted-foreground">Paste or type the mint address of the NFT you want to update</p>
        </div>

        {loadedNft && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Loaded NFT</h3>
              {getStandardBadge(loadedNft.standard)}
            </div>

            {authorityError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{authorityError}</p>
              </div>
            )}

            {!authorityError && account && loadedNft.updateAuthority === account && (
              <div className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">You are the update authority and can modify this NFT</p>
              </div>
            )}

            {canUpdate && (
              <div className="space-y-4 pt-4 border-t">
                <UpdateFormField
                  label="Name"
                  required
                  error={errors.name}
                  counter={{ current: form.name.length, max: MAX_NAME_LENGTH }}
                  isDirty={isFieldDirty("name")}
                >
                  <Input
                    value={form.name}
                    onChange={handleChange("name")}
                    onBlur={handleBlur("name")}
                    placeholder="NFT Name"
                    maxLength={MAX_NAME_LENGTH}
                    error={!!errors.name}
                  />
                </UpdateFormField>

                <UpdateFormField
                  label="Symbol"
                  required
                  error={errors.symbol}
                  counter={{ current: form.symbol.length, max: MAX_SYMBOL_LENGTH }}
                  isDirty={isFieldDirty("symbol")}
                >
                  <Input
                    value={form.symbol}
                    onChange={handleChange("symbol")}
                    onBlur={handleBlur("symbol")}
                    placeholder="Symbol"
                    maxLength={MAX_SYMBOL_LENGTH}
                    error={!!errors.symbol}
                  />
                </UpdateFormField>

                <UpdateFormField
                  label="Description"
                  required
                  error={errors.description}
                  isDirty={isFieldDirty("description")}
                >
                  <Textarea
                    value={form.description}
                    onChange={handleChange("description")}
                    onBlur={handleBlur("description")}
                    placeholder="Describe your NFT..."
                    rows={4}
                    error={!!errors.description}
                  />
                </UpdateFormField>

                <UpdateFormField
                  label="External URL / Website"
                  error={errors.externalUrl}
                  isDirty={isFieldDirty("externalUrl")}
                >
                  <Input
                    type="url"
                    value={form.externalUrl}
                    onChange={handleChange("externalUrl")}
                    onBlur={handleBlur("externalUrl")}
                    placeholder="https://example.com"
                    error={!!errors.externalUrl}
                  />
                </UpdateFormField>

                <UpdateFormField label="Image" error={errors.imageFile} isDirty={isImageDirty}>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept={ACCEPTED_IMAGE_EXTENSIONS}
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreviewUrl ? (
                    <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                      <img src={imagePreviewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
                      <div className="flex-1 min-w-0">
                        {form.imageFile ? (
                          <>
                            <p className="text-sm font-medium truncate">{form.imageFile.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {(form.imageFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Current image</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <ImagePlus className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                          {form.imageFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={handleImageClear}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Revert
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="h-8 w-8" />
                        <span>Select Image</span>
                        <span className="text-xs">JPG, PNG, or GIF (max {MAX_IMAGE_SIZE_MB}MB)</span>
                      </div>
                    </Button>
                  )}
                </UpdateFormField>

                <UpdateFormField
                  label="Multimedia (Optional)"
                  error={errors.multimediaFile}
                  isDirty={form.multimediaFile !== null}
                >
                  <input
                    ref={multimediaInputRef}
                    type="file"
                    accept={ACCEPTED_MULTIMEDIA_EXTENSIONS}
                    onChange={handleMultimediaSelect}
                    className="hidden"
                  />
                  {form.multimediaFile && multimediaPreviewUrl ? (
                    <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                      <MultimediaPreview category={form.multimediaCategory} previewUrl={multimediaPreviewUrl} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{form.multimediaFile.name}</p>
                          <MultimediaCategoryBadge category={form.multimediaCategory} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {(form.multimediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={handleMultimediaClear}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => multimediaInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Film className="h-8 w-8" />
                        <span>Add Multimedia</span>
                        <span className="text-xs">Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)</span>
                      </div>
                    </Button>
                  )}
                </UpdateFormField>

                <div
                  className={cn(
                    "pt-4 border-t",
                    isFieldDirty("royaltiesPercent") && "ring-2 ring-primary/20 rounded-lg p-4 -m-4"
                  )}
                >
                  {isFieldDirty("royaltiesPercent") && (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
                      <Pencil className="h-3 w-3" />
                      Modified
                    </div>
                  )}
                  <RoyaltiesCreatorsSection
                    royaltiesPercent={form.royaltiesPercent}
                    creators={form.creators}
                    errors={errors}
                    onRoyaltiesChange={handleRoyaltiesChange}
                    onCreatorChange={handleCreatorChange}
                    onAddCreator={handleAddCreator}
                    onRemoveCreator={handleRemoveCreator}
                    onBlur={validateCreatorsOnBlur}
                  />
                </div>

                <div
                  className={cn(
                    "pt-4 border-t",
                    isFieldDirty("attributes") && "ring-2 ring-primary/20 rounded-lg p-4 -m-4"
                  )}
                >
                  {isFieldDirty("attributes") && (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
                      <Pencil className="h-3 w-3" />
                      Modified
                    </div>
                  )}
                  <AttributesSection
                    attributes={form.attributes}
                    onAttributeChange={handleAttributeChange}
                    onAddAttribute={handleAddAttribute}
                    onRemoveAttribute={handleRemoveAttribute}
                  />
                </div>

                <UpdateFormField
                  label="Collection"
                  error={errors.collectionAddress}
                  isDirty={isFieldDirty("collectionAddress")}
                >
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={form.collectionAddress}
                        onChange={handleCollectionAddressChange}
                        onBlur={handleCollectionAddressBlur}
                        placeholder="Collection address (optional)"
                        error={!!errors.collectionAddress}
                      />
                    </div>
                    <Button type="button" variant="outline" className="shrink-0" disabled>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Choose
                    </Button>
                  </div>
                </UpdateFormField>

                <div className="pt-6 border-t flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={!isFormDirty || updateStep !== "idle"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!isFormDirty || updateStep !== "idle"}
                    onClick={handleUpdateSubmit}
                  >
                    {updateStep !== "idle" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {updateStep === "uploading-image" && "Uploading image..."}
                        {updateStep === "uploading-multimedia" && "Uploading multimedia..."}
                        {updateStep === "uploading-metadata" && "Uploading metadata..."}
                        {updateStep === "updating" && "Updating NFT..."}
                        {updateStep === "complete" && "Done!"}
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Update NFT
                      </>
                    )}
                  </Button>
                </div>

                {isFormDirty && updateStep === "idle" && (
                  <p className="text-xs text-center text-muted-foreground">
                    You have unsaved changes. Click Update NFT to apply them.
                  </p>
                )}
              </div>
            )}

            {!canUpdate && !authorityError && (
              <p className="text-sm text-muted-foreground">Connect your wallet to check update authority.</p>
            )}
          </div>
        )}

        {!loadedNft && !isLoading && (
          <div className="rounded-lg border border-dashed p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Pencil className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Update Existing NFT</p>
              <p className="text-sm mt-1">Enter a token address above to load an NFT</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              NFT Updated Successfully!
            </DialogTitle>
            <DialogDescription>
              Your {loadedNft ? ASSET_STANDARDS.find((s) => s.value === loadedNft.standard)?.label : "NFT"} has been
              updated on-chain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Token Address</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono truncate">
                  {loadedNft?.mintAddress}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    if (loadedNft) {
                      navigator.clipboard.writeText(loadedNft.mintAddress)
                      toast.success("Copied to clipboard")
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {updateSignature && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Transaction Signature</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono truncate">
                    {updateSignature}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      if (updateSignature) {
                        navigator.clipboard.writeText(updateSignature)
                        toast.success("Copied to clipboard")
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <a
              href={`https://solscan.io/token/${loadedNft?.mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on Solscan
            </a>
            <Button type="button" onClick={() => setShowSuccessDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface UpdateFormFieldProps {
  label: string
  required?: boolean
  error?: string
  counter?: { current: number; max: number }
  isDirty?: boolean
  children: React.ReactNode
}

function UpdateFormField({ label, required, error, counter, isDirty, children }: UpdateFormFieldProps) {
  return (
    <div className={cn("space-y-2", isDirty && "ring-2 ring-primary/20 rounded-lg p-3 -m-1")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {isDirty && (
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
              <Pencil className="h-3 w-3" />
              Modified
            </span>
          )}
        </div>
        {counter && (
          <span className={cn("text-xs", counter.current > counter.max ? "text-destructive" : "text-muted-foreground")}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

const BATCH_LOOKUP_MODES: Array<{
  value: BatchLookupMode
  label: string
  description: string
  icon: typeof FolderOpen
}> = [
  {
    value: "collection",
    label: "By Collection",
    description: "Look up all NFTs in a collection",
    icon: FolderOpen,
  },
  {
    value: "creator",
    label: "By First Verified Creator",
    description: "Look up NFTs by their first verified creator",
    icon: Users,
  },
  {
    value: "hashlist",
    label: "By Hashlist",
    description: "Provide a JSON array of mint addresses",
    icon: FileCode,
  },
]

const BatchNftCard = memo(function BatchNftCard({ nft }: { nft: BatchNft }) {
  const truncatedMint = `${nft.mint.slice(0, 4)}...${nft.mint.slice(-4)}`

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden transition-colors hover:border-primary/50">
      <div className="aspect-square relative bg-muted">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-2 space-y-0.5">
        <p className="text-sm font-medium truncate" title={nft.name}>
          {nft.name || "Unnamed"}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{truncatedMint}</p>
      </div>
    </div>
  )
})

function BatchNftGridCell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<BatchNftGridCellData>) {
  const { nfts, columnCount } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  return (
    <div style={style} className="p-1.5">
      <BatchNftCard nft={nft} />
    </div>
  )
}

function getGridColumnCount(width: number): number {
  if (width >= 1024) return 6
  if (width >= 768) return 5
  if (width >= 640) return 4
  if (width >= 480) return 3
  return 2
}

interface BatchNftGridProps {
  nfts: BatchNft[]
}

function BatchNftGrid({ nfts }: BatchNftGridProps) {
  if (nfts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">No NFTs match filters</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filter criteria</p>
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getGridColumnCount(width)
          const columnWidth = width / columnCount
          const rowHeight = columnWidth * 1.3
          const rowCount = Math.ceil(nfts.length / columnCount)

          return (
            <FixedSizeGrid<BatchNftGridCellData>
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              itemData={{ nfts, columnCount }}
              className="scrollbar-hide"
            >
              {BatchNftGridCell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}

interface BatchOperationProgress {
  completed: number
  total: number
  failed: number
}

interface CollectionAssignmentSectionProps {
  nfts: BatchNft[]
  account: string | null
  onComplete: () => void
}

function CollectionAssignmentSection({ nfts, account, onComplete }: CollectionAssignmentSectionProps) {
  const { signer, capabilities } = useTransactionSigner()
  const [isExpanded, setIsExpanded] = useState(false)
  const [collectionAddress, setCollectionAddress] = useState("")
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchOperationProgress | null>(null)

  const nftsNotInCollection = useMemo(() => {
    if (!collectionAddress.trim() || !isValidSolanaAddress(collectionAddress.trim())) {
      return []
    }
    return nfts.filter((nft) => nft.collectionId !== collectionAddress.trim())
  }, [nfts, collectionAddress])

  const nftsUserCanUpdate = useMemo(() => {
    if (!account) return []
    return nftsNotInCollection.filter((nft) => nft.updateAuthority === account)
  }, [nftsNotInCollection, account])

  const validateCollectionAddress = useCallback((value: string) => {
    if (!value.trim()) {
      setCollectionError(null)
      return
    }
    if (!isValidSolanaAddress(value.trim())) {
      setCollectionError("Invalid Solana address")
    } else {
      setCollectionError(null)
    }
  }, [])

  const handleCollectionAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCollectionAddress(value)
      validateCollectionAddress(value)
    },
    [validateCollectionAddress]
  )

  const handleBatchAddToCollection = useCallback(async () => {
    if (!account || !signer || !capabilities?.canSignMessage) {
      toast.error("Please connect your wallet")
      return
    }

    if (nftsUserCanUpdate.length === 0) {
      toast.error("No NFTs to update")
      return
    }

    setIsProcessing(true)
    setProgress({ completed: 0, total: nftsUserCanUpdate.length, failed: 0 })

    const toastId = toast.loading(`Adding ${nftsUserCanUpdate.length} NFTs to collection...`)

    try {
      const feePayer = signer as unknown as TransactionSigner
      const collectionAddr = collectionAddress.trim() as Address

      const instructionGroups: InstructionGroup<BatchNft>[] = nftsUserCanUpdate.map((nft) => {
        const updateInstruction = mplCore.getUpdateV1Instruction({
          asset: nft.mint as Address,
          payer: feePayer,
          authority: feePayer,
          collection: collectionAddr,
          newName: null,
          newUri: null,
          newUpdateAuthority: null,
        })
        return { item: nft, instructions: [updateInstruction] }
      })

      const batches = await batchInstructionsBySize(instructionGroups, feePayer)

      let completed = 0
      let failed = 0

      for (const batch of batches) {
        try {
          const { blockhash, lastValidBlockHeight } = await getBlockhash()
          const signedTx = await prepareSignedTransaction({
            instructions: batch.instructions,
            feePayer,
            blockhash,
            lastValidBlockHeight,
          })
          const signature = await sendTransaction(signedTx)
          await confirmTransactionViaWebSocket(signature)
          completed += batch.items.length
        } catch (error) {
          console.error("Batch failed:", error)
          failed += batch.items.length
        }

        setProgress({ completed, total: nftsUserCanUpdate.length, failed })
        toast.loading(`Adding to collection: ${completed}/${nftsUserCanUpdate.length}`, { id: toastId })
      }

      if (failed === 0) {
        toast.success(`Successfully added ${completed} NFTs to collection`, { id: toastId })
      } else {
        toast.warning(`Added ${completed} NFTs, ${failed} failed`, { id: toastId })
      }

      onComplete()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add to collection"
      toast.error(message, { id: toastId })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [account, signer, capabilities, nftsUserCanUpdate, collectionAddress, onComplete])

  const canExecute =
    account && collectionAddress.trim() && !collectionError && nftsUserCanUpdate.length > 0 && !isProcessing

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Add to Collection</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-collection-address">Collection Address</Label>
            <Input
              id="batch-collection-address"
              type="text"
              placeholder="Enter collection mint address"
              value={collectionAddress}
              onChange={handleCollectionAddressChange}
              disabled={isProcessing}
              className={cn(collectionError && "border-destructive")}
            />
            {collectionError && <p className="text-sm text-destructive">{collectionError}</p>}
          </div>

          {collectionAddress.trim() && !collectionError && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">NFTs not in this collection:</span>
                <span className="font-medium">{nftsNotInCollection.length}</span>
              </div>
              {account && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">NFTs you can update:</span>
                  <span className="font-medium text-primary">{nftsUserCanUpdate.length}</span>
                </div>
              )}
              {nftsNotInCollection.length > 0 && nftsUserCanUpdate.length === 0 && account && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  You are not the update authority of any NFTs not already in this collection.
                </p>
              )}
            </div>
          )}

          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-mono">
                  {progress.completed}/{progress.total}
                  {progress.failed > 0 && <span className="text-destructive ml-2">({progress.failed} failed)</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <Button onClick={handleBatchAddToCollection} disabled={!canExecute} className="w-full gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                Add {nftsUserCanUpdate.length > 0 ? nftsUserCanUpdate.length : ""} NFT
                {nftsUserCanUpdate.length !== 1 ? "s" : ""} to Collection
              </>
            )}
          </Button>

          {!account && (
            <p className="text-xs text-muted-foreground text-center">Connect your wallet to add NFTs to a collection</p>
          )}
        </div>
      )}
    </div>
  )
}

function BatchTabContent() {
  const { account } = useWallet()
  const [lookupMode, setLookupMode] = useState<BatchLookupMode>("collection")
  const [addressInput, setAddressInput] = useState("")
  const [hashlistInput, setHashlistInput] = useState("")
  const [hashlistError, setHashlistError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedNfts, setLoadedNfts] = useState<BatchNft[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<BatchNftFilters>({
    creator: null,
    royalties: null,
    updateAuthority: null,
  })

  const uniqueCreators = useMemo(() => {
    const creatorsSet = new Set<string>()
    loadedNfts.forEach((nft) => {
      nft.creators.forEach((creator) => {
        creatorsSet.add(creator.address)
      })
    })
    return Array.from(creatorsSet).sort()
  }, [loadedNfts])

  const uniqueRoyalties = useMemo(() => {
    const royaltiesSet = new Set<number>()
    loadedNfts.forEach((nft) => {
      royaltiesSet.add(nft.royaltiesPercent)
    })
    return Array.from(royaltiesSet).sort((a, b) => a - b)
  }, [loadedNfts])

  const uniqueUpdateAuthorities = useMemo(() => {
    const authSet = new Set<string>()
    loadedNfts.forEach((nft) => {
      if (nft.updateAuthority) {
        authSet.add(nft.updateAuthority)
      }
    })
    return Array.from(authSet).sort()
  }, [loadedNfts])

  const filteredNfts = useMemo(() => {
    return loadedNfts.filter((nft) => {
      if (filters.creator) {
        const hasCreator = nft.creators.some((c) => c.address === filters.creator)
        if (!hasCreator) return false
      }
      if (filters.royalties !== null) {
        if (nft.royaltiesPercent !== parseFloat(filters.royalties)) return false
      }
      if (filters.updateAuthority) {
        if (nft.updateAuthority !== filters.updateAuthority) return false
      }
      return true
    })
  }, [loadedNfts, filters])

  const hasActiveFilters = filters.creator || filters.royalties !== null || filters.updateAuthority

  const clearFilters = useCallback(() => {
    setFilters({ creator: null, royalties: null, updateAuthority: null })
  }, [])

  const handleLookupModeChange = (mode: BatchLookupMode) => {
    setLookupMode(mode)
    setLoadError(null)
  }

  const validateHashlist = useCallback((input: string): string[] | null => {
    if (!input.trim()) {
      setHashlistError("Hashlist is required")
      return null
    }

    try {
      const parsed = JSON.parse(input)
      if (!Array.isArray(parsed)) {
        setHashlistError("Hashlist must be a JSON array")
        return null
      }

      const invalidAddresses: number[] = []
      for (let i = 0; i < parsed.length; i++) {
        if (typeof parsed[i] !== "string" || !isValidSolanaAddress(parsed[i])) {
          invalidAddresses.push(i + 1)
        }
      }

      if (invalidAddresses.length > 0) {
        if (invalidAddresses.length <= 3) {
          setHashlistError(`Invalid addresses at positions: ${invalidAddresses.join(", ")}`)
        } else {
          setHashlistError(`${invalidAddresses.length} invalid addresses found`)
        }
        return null
      }

      if (parsed.length === 0) {
        setHashlistError("Hashlist is empty")
        return null
      }

      setHashlistError(null)
      return parsed as string[]
    } catch {
      setHashlistError("Invalid JSON format")
      return null
    }
  }, [])

  const handleLookup = useCallback(async () => {
    setLoadError(null)
    setLoadedNfts([])

    if (lookupMode === "collection" || lookupMode === "creator") {
      if (!addressInput.trim()) {
        setLoadError("Address is required")
        return
      }
      if (!isValidSolanaAddress(addressInput.trim())) {
        setLoadError("Invalid Solana address")
        return
      }
    }

    if (lookupMode === "hashlist") {
      const addresses = validateHashlist(hashlistInput)
      if (!addresses) {
        return
      }
    }

    setIsLoading(true)

    try {
      let nfts: BatchNft[] = []

      switch (lookupMode) {
        case "collection":
          nfts = await lookupNftsByCollection(addressInput.trim())
          break
        case "creator":
          nfts = await lookupNftsByCreator(addressInput.trim())
          break
        case "hashlist": {
          const addresses = JSON.parse(hashlistInput) as string[]
          nfts = await lookupNftsByHashlist(addresses)
          break
        }
      }

      setLoadedNfts(nfts)

      if (nfts.length === 0) {
        setLoadError("No NFTs found")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load NFTs"
      setLoadError(message)
      toast.error("Failed to load NFTs", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [lookupMode, addressInput, hashlistInput, validateHashlist])

  const handleClear = () => {
    setAddressInput("")
    setHashlistInput("")
    setHashlistError(null)
    setLoadedNfts([])
    setLoadError(null)
    clearFilters()
  }

  const handleBatchOperationComplete = useCallback(() => {
    handleLookup()
  }, [handleLookup])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Lookup Mode</Label>
          <div className="grid gap-3">
            {BATCH_LOOKUP_MODES.map(({ value, label, description, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  lookupMode === value ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                )}
              >
                <input
                  type="radio"
                  name="lookupMode"
                  value={value}
                  checked={lookupMode === value}
                  onChange={() => handleLookupModeChange(value)}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {(lookupMode === "collection" || lookupMode === "creator") && (
          <div className="space-y-2">
            <Label htmlFor="batch-address">
              {lookupMode === "collection" ? "Collection Address" : "Creator Address"}
            </Label>
            <Input
              id="batch-address"
              type="text"
              placeholder={`Enter ${lookupMode === "collection" ? "collection" : "creator"} address`}
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value)
                setLoadError(null)
              }}
              className={cn(loadError && "border-destructive")}
            />
          </div>
        )}

        {lookupMode === "hashlist" && (
          <div className="space-y-2">
            <Label htmlFor="batch-hashlist">Mint Addresses (JSON Array)</Label>
            <Textarea
              id="batch-hashlist"
              placeholder='["mintAddress1", "mintAddress2", ...]'
              value={hashlistInput}
              onChange={(e) => {
                setHashlistInput(e.target.value)
                setHashlistError(null)
                setLoadError(null)
              }}
              className={cn("font-mono text-sm min-h-[120px]", hashlistError && "border-destructive")}
            />
            {hashlistError && <p className="text-sm text-destructive">{hashlistError}</p>}
          </div>
        )}

        {loadError && lookupMode !== "hashlist" && <p className="text-sm text-destructive">{loadError}</p>}

        <div className="flex gap-3">
          <Button onClick={handleLookup} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lookup NFTs
              </>
            )}
          </Button>
          {(addressInput || hashlistInput || loadedNfts.length > 0) && (
            <Button variant="outline" onClick={handleClear} disabled={isLoading}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {loadedNfts.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">NFTs Loaded</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{filteredNfts.length.toLocaleString()}</span>
                {hasActiveFilters && (
                  <span className="text-sm text-muted-foreground ml-1">/ {loadedNfts.length.toLocaleString()}</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${filteredNfts.length.toLocaleString()} of ${loadedNfts.length.toLocaleString()} NFT${loadedNfts.length !== 1 ? "s" : ""}.`
                : `Found ${loadedNfts.length.toLocaleString()} NFT${loadedNfts.length !== 1 ? "s" : ""}.`}
              {!account && " Connect your wallet to perform batch operations."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Filters</Label>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="filter-creator" className="text-xs text-muted-foreground">
                  Creator
                </Label>
                <Select
                  value={filters.creator ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, creator: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-creator" className="h-9">
                    <SelectValue placeholder="All creators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All creators</SelectItem>
                    {uniqueCreators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        <span className="font-mono text-xs">{`${creator.slice(0, 4)}...${creator.slice(-4)}`}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-royalties" className="text-xs text-muted-foreground">
                  Royalties
                </Label>
                <Select
                  value={filters.royalties ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, royalties: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-royalties" className="h-9">
                    <SelectValue placeholder="All royalties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All royalties</SelectItem>
                    {uniqueRoyalties.map((royalty) => (
                      <SelectItem key={royalty} value={royalty.toString()}>
                        {royalty}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-authority" className="text-xs text-muted-foreground">
                  Update Authority
                </Label>
                <Select
                  value={filters.updateAuthority ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, updateAuthority: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-authority" className="h-9">
                    <SelectValue placeholder="All authorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All authorities</SelectItem>
                    {uniqueUpdateAuthorities.map((auth) => (
                      <SelectItem key={auth} value={auth}>
                        <span className="font-mono text-xs">{`${auth.slice(0, 4)}...${auth.slice(-4)}`}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <CollectionAssignmentSection
            nfts={filteredNfts}
            account={account ?? null}
            onComplete={handleBatchOperationComplete}
          />

          <BatchNftGrid nfts={filteredNfts} />
        </div>
      )}
    </div>
  )
}

interface NftPreviewCardProps {
  data: NftPreviewData
}

function NftPreviewCard({ data }: NftPreviewCardProps) {
  const { name, symbol, description, imagePreviewUrl, attributes } = data
  const hasContent = name || symbol || description || imagePreviewUrl || attributes.length > 0

  return (
    <div className="rounded-lg border bg-card overflow-hidden sticky top-6 shadow-sm">
      <div className="aspect-square relative bg-muted">
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt={name || "NFT Preview"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No image selected</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {hasContent ? (
          <>
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-lg leading-tight truncate">
                  {name || <span className="text-muted-foreground italic">Untitled</span>}
                </h3>
                {symbol && (
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {symbol}
                  </span>
                )}
              </div>
              {description && <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>}
            </div>

            {attributes.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attributes</p>
                <div className="flex flex-wrap gap-1.5">
                  {attributes.map((attr, index) => (
                    <div key={index} className="inline-flex flex-col rounded-md border bg-muted/50 px-2 py-1 text-xs">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {attr.traitType}
                      </span>
                      <span className="font-medium">{attr.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p className="font-medium">NFT Preview</p>
            <p className="text-sm mt-1">Fill out the form to see a live preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
