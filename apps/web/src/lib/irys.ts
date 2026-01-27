/**
 * Irys Upload Service
 *
 * Provides utilities for uploading files and JSON metadata to Arweave via Irys.
 * This module creates an adapter between @solana/connector (used by this app)
 * and the wallet adapter interface expected by the Irys SDK.
 *
 * Note: The Irys SDK (@irys/web-upload-solana) internally depends on @solana/web3.js
 * for the wallet adapter interface. This is unavoidable as it's a core dependency
 * of the SDK. We only import the necessary types to create the adapter.
 */

import { WebUploader } from "@irys/web-upload"
import { WebSolana } from "@irys/web-upload-solana"
import { PublicKey, type Transaction, type Connection, type SendOptions } from "@solana/web3.js"
import type { MessageSignerWalletAdapter } from "@solana/wallet-adapter-base"

/** Gateway URL for accessing uploaded content */
const IRYS_GATEWAY = "https://gateway.irys.xyz"

/** Arweave gateway URL (alternative) */
const ARWEAVE_GATEWAY = "https://arweave.net"

/** RPC URL for Irys to use when checking balances and sending transactions */
const RPC_URL = `${window.location.origin}/api/rpc`

/**
 * Signer interface matching what @solana/connector provides via useTransactionSigner
 */
export interface ConnectorSigner {
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
}

/**
 * Upload options for customizing the upload behavior
 */
export interface UploadOptions {
  tags?: Array<{ name: string; value: string }>
}

/**
 * Result of an Irys upload operation
 */
export interface UploadResult {
  /** The transaction ID on Arweave */
  id: string
  /** Full URI to access the content via Irys gateway */
  uri: string
  /** Alternative URI via Arweave gateway */
  arweaveUri: string
}

/**
 * Creates a wallet adapter compatible with the Irys SDK from @solana/connector signer
 *
 * The Irys SDK expects a MessageSignerWalletAdapter interface from @solana/wallet-adapter-base.
 * This function creates an adapter that bridges the @solana/connector signer to that interface.
 */
function createWalletAdapter(address: string, signer: ConnectorSigner): MessageSignerWalletAdapter {
  const publicKey = new PublicKey(address)

  return {
    publicKey,
    signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
      if (!signer.signMessage) {
        throw new Error("Wallet does not support message signing")
      }
      return signer.signMessage(message)
    },
    // sendTransaction is used by Irys for funding operations
    // We throw an error here - funding should be handled separately if needed
    sendTransaction: async (
      _transaction: Transaction,
      _connection: Connection,
      _options?: SendOptions
    ): Promise<string> => {
      throw new Error("sendTransaction not implemented - fund your Irys balance separately at https://irys.xyz")
    },
    // Required by interface but not used for uploads
    signTransaction: undefined,
    signAllTransactions: undefined,
    connecting: false,
    connected: true,
    disconnect: async () => {},
    connect: async () => {},
    on: () => () => {},
    off: () => {},
  } as unknown as MessageSignerWalletAdapter
}

/**
 * Creates an Irys uploader instance configured for Solana
 *
 * @param address - The wallet address (base58 string)
 * @param signer - The signer from useTransactionSigner()
 * @returns Configured Irys uploader instance
 */
async function getIrysUploader(address: string, signer: ConnectorSigner) {
  const walletAdapter = createWalletAdapter(address, signer)

  const irysUploader = await WebUploader(WebSolana).withProvider(walletAdapter).withRpc(RPC_URL)

  return irysUploader
}

/**
 * Uploads a file to Arweave via Irys
 *
 * @param file - The File object to upload
 * @param address - Wallet address for signing
 * @param signer - Signer from useTransactionSigner()
 * @param options - Optional upload options (tags)
 * @returns Upload result with transaction ID and URIs
 * @throws Error if upload fails or wallet doesn't support signing
 *
 * @example
 * ```ts
 * const { account } = useWallet()
 * const { signer } = useTransactionSigner()
 *
 * const result = await uploadToIrys(imageFile, account!, signer)
 * console.log(result.uri) // https://gateway.irys.xyz/abc123...
 * ```
 */
export async function uploadToIrys(
  file: File,
  address: string,
  signer: ConnectorSigner,
  options?: UploadOptions
): Promise<UploadResult> {
  if (!address) {
    throw new Error("Wallet address is required")
  }
  if (!signer?.signMessage) {
    throw new Error("Wallet does not support message signing")
  }

  const irys = await getIrysUploader(address, signer)

  // Check if user has sufficient balance - if not, the upload will fail
  // with a clear error from Irys about insufficient funds
  const tags = options?.tags ?? []

  // Add content type tag if not present
  const hasContentType = tags.some(({ name }) => name.toLowerCase() === "content-type")
  if (!hasContentType && file.type) {
    tags.push({ name: "Content-Type", value: file.type })
  }

  const response = await irys.uploadFile(file, { tags })

  return {
    id: response.id,
    uri: `${IRYS_GATEWAY}/${response.id}`,
    arweaveUri: `${ARWEAVE_GATEWAY}/${response.id}`,
  }
}

/**
 * Uploads raw data (Uint8Array or Buffer) to Arweave via Irys
 *
 * @param data - The data to upload
 * @param address - Wallet address for signing
 * @param signer - Signer from useTransactionSigner()
 * @param options - Optional upload options (tags)
 * @returns Upload result with transaction ID and URIs
 */
export async function uploadDataToIrys(
  data: Uint8Array,
  address: string,
  signer: ConnectorSigner,
  options?: UploadOptions
): Promise<UploadResult> {
  if (!address) {
    throw new Error("Wallet address is required")
  }
  if (!signer?.signMessage) {
    throw new Error("Wallet does not support message signing")
  }

  const irys = await getIrysUploader(address, signer)
  const response = await irys.uploader.uploadData(Buffer.from(data), { tags: options?.tags })

  return {
    id: response.id,
    uri: `${IRYS_GATEWAY}/${response.id}`,
    arweaveUri: `${ARWEAVE_GATEWAY}/${response.id}`,
  }
}

/**
 * Gets the price to upload data of a given size
 *
 * @param size - Size in bytes
 * @param address - Wallet address
 * @param signer - Signer from useTransactionSigner()
 * @returns Price in lamports as a bigint
 */
export async function getIrysPrice(size: number, address: string, signer: ConnectorSigner): Promise<bigint> {
  const irys = await getIrysUploader(address, signer)
  const price = await irys.getPrice(size)
  return BigInt(price.toString())
}

/**
 * Gets the current Irys balance for the connected wallet
 *
 * @param address - Wallet address
 * @param signer - Signer from useTransactionSigner()
 * @returns Balance in lamports as a bigint
 */
export async function getIrysBalance(address: string, signer: ConnectorSigner): Promise<bigint> {
  const irys = await getIrysUploader(address, signer)
  const balance = await irys.getBalance(address)
  return BigInt(balance.toString())
}

/**
 * NFT attribute (trait) following the Metaplex standard
 */
export interface NftAttribute {
  trait_type: string
  value: string | number
}

/**
 * File reference for the properties.files array
 */
export interface NftFileReference {
  uri: string
  type: string
}

/**
 * Multimedia category for NFT content
 */
export type MultimediaCategory = "video" | "audio" | "vr" | "image"

/**
 * Input for creating NFT metadata JSON
 */
export interface NftMetadataInput {
  /** NFT name (required) */
  name: string
  /** NFT symbol (required) */
  symbol: string
  /** NFT description (required) */
  description: string
  /** Image URI (from Irys upload) */
  image: string
  /** Image MIME type */
  imageType?: string
  /** Animation/multimedia URI (optional) */
  animationUrl?: string
  /** Animation/multimedia MIME type */
  animationType?: string
  /** Multimedia category */
  multimediaCategory?: MultimediaCategory
  /** External website URL (optional) */
  externalUrl?: string
  /** NFT attributes/traits */
  attributes?: NftAttribute[]
  /** Seller fee basis points (0-10000, where 10000 = 100%) */
  sellerFeeBasisPoints?: number
  /** Creator addresses and shares */
  creators?: Array<{
    address: string
    share: number
    verified?: boolean
  }>
}

/**
 * NFT metadata JSON structure following Metaplex standard
 * @see https://developers.metaplex.com/token-metadata/token-standard
 */
export interface NftMetadataJson {
  name: string
  symbol: string
  description: string
  image: string
  animation_url?: string
  external_url?: string
  attributes: NftAttribute[]
  properties: {
    category: MultimediaCategory
    files: NftFileReference[]
    creators?: Array<{
      address: string
      share: number
      verified?: boolean
    }>
  }
  seller_fee_basis_points?: number
}

/**
 * Constructs and uploads NFT metadata JSON to Arweave via Irys
 *
 * This function creates a properly structured metadata JSON following the
 * Metaplex NFT standard and uploads it to Arweave.
 *
 * @param metadata - The metadata input object
 * @param address - Wallet address for signing
 * @param signer - Signer from useTransactionSigner()
 * @returns Upload result with the metadata URI
 *
 * @example
 * ```ts
 * // First upload the image
 * const imageResult = await uploadToIrys(imageFile, account, signer)
 *
 * // Then upload the metadata
 * const metadataResult = await uploadJsonMetadata({
 *   name: "My NFT",
 *   symbol: "NFT",
 *   description: "An awesome NFT",
 *   image: imageResult.uri,
 *   imageType: "image/png",
 *   attributes: [{ trait_type: "Rarity", value: "Legendary" }]
 * }, account, signer)
 *
 * console.log(metadataResult.uri) // Use this URI for minting
 * ```
 */
export async function uploadJsonMetadata(
  metadata: NftMetadataInput,
  address: string,
  signer: ConnectorSigner
): Promise<UploadResult> {
  if (!address) {
    throw new Error("Wallet address is required")
  }
  if (!signer?.signMessage) {
    throw new Error("Wallet does not support message signing")
  }

  // Build the files array for properties
  const files: NftFileReference[] = []

  // Add image to files
  if (metadata.image) {
    files.push({
      uri: metadata.image,
      type: metadata.imageType || "image/png",
    })
  }

  // Add animation/multimedia to files if present
  if (metadata.animationUrl) {
    files.push({
      uri: metadata.animationUrl,
      type: metadata.animationType || "application/octet-stream",
    })
  }

  // Determine category based on multimedia or default to image
  const category: MultimediaCategory = metadata.multimediaCategory || "image"

  // Filter out empty attributes
  const attributes: NftAttribute[] = (metadata.attributes || []).filter(
    (attr) => attr.trait_type && attr.value !== undefined && attr.value !== ""
  )

  // Construct the metadata JSON following Metaplex standard
  const metadataJson: NftMetadataJson = {
    name: metadata.name,
    symbol: metadata.symbol,
    description: metadata.description,
    image: metadata.image,
    attributes,
    properties: {
      category,
      files,
    },
  }

  // Add optional fields if present
  if (metadata.animationUrl) {
    metadataJson.animation_url = metadata.animationUrl
  }

  if (metadata.externalUrl) {
    metadataJson.external_url = metadata.externalUrl
  }

  if (metadata.sellerFeeBasisPoints !== undefined) {
    metadataJson.seller_fee_basis_points = metadata.sellerFeeBasisPoints
  }

  if (metadata.creators && metadata.creators.length > 0) {
    metadataJson.properties.creators = metadata.creators
  }

  // Upload the JSON
  const irys = await getIrysUploader(address, signer)
  const jsonString = JSON.stringify(metadataJson)
  const jsonBuffer = Buffer.from(jsonString, "utf-8")

  const response = await irys.uploader.uploadData(jsonBuffer, {
    tags: [{ name: "Content-Type", value: "application/json" }],
  })

  return {
    id: response.id,
    uri: `${IRYS_GATEWAY}/${response.id}`,
    arweaveUri: `${ARWEAVE_GATEWAY}/${response.id}`,
  }
}
