import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata"
import Dexie, { Table } from "dexie"
import { Currency } from "./context/brice"
import { LoanType } from "./context/ui-settings"

export interface NftMetadata {
  name?: string
  image?: string
  animation_url?: string
  external_url?: string
}

export interface EditionDetails {
  edition: bigint | "unknown"
  supply: bigint | "unknown"
}

export interface Nft {
  chain?: "eth" | "solana"
  nftMint: string
  helloMoonCollectionId: string
  loan?: Loan | null
  listing?: Listing | null
  owner?: string | null
  collectionId?: string | null
  json?: JsonMetadata
  jsonLoaded?: boolean
  status?: string | null
  delegate?: string | null
  metadata: any
  mint: any
  edition: any
  supply?: number
  balance?: {
    [key: string]: number
  }
  editionDetails?: EditionDetails
  firstVerifiedCreator?: string
  collectionIdentifier?: string
  price?: number
  value?: number
  tokenType?: string
}

export interface Collection {
  id: string
  chain: "eth" | "solana"
  helloMoonCollectionId?: string
  collectionId?: string
  collectionName: string
  image?: string
  floorPrice: number
  meIdentifier?: string
}

export interface Tag {
  id: string
  userId: string
  name: string
  color?: string
}

export interface TaggedNft {
  id?: number
  nftId: string
  tagId: string
}

export interface Listing {
  blockTime?: number
  helloMoonCollectionId?: string
  marketplace: string
  nftMint: string
  ownerAccount?: string
  price: number
  seller?: string
  transactionId?: string
}

export interface Loan {
  collateralMint?: string
  defaults: number
  started: number
  amountToRepay: number
  apy: number
  extendBlocktime: number | null
  helloMoonCollectionId: string
  lender: string
  borrower: string
  liquidateBlocktime: number | null
  loanDurationSeconds: number | null
  loanId: string
  market: string
  newLoanId: string
  offerBlocktime: number
  principalAmount: number
  protocolCollectionId: string
  repayAmount: number
  repayBlocktime: number | null
  status: string
}

export interface Order {
  nftMint: string
}

export interface Rarity {
  nftMint: string
  moonRank?: number
  moonRankTier: RarityTier
  howRare?: number
  howRareTier?: RarityTier
  lastParsed?: number
}

export interface Wallet {
  publicKey?: string
  isLedger?: boolean
  nickname?: string
  favourite?: boolean
  owned?: boolean
  added?: number
  autoAdded?: boolean
  chain?: string
  inputValue?: string
}

export type RarityTier = "mythic" | "epic" | "legendary" | "rare" | "uncommon" | "common"

export interface Preferences {
  page: string
  layoutSize: "small" | "medium" | "large" | "collage"
  showInfo: boolean
  darkMode?: boolean
  wallet?: string
  payRoyalties: boolean
  showAllWallets: boolean
  lightMode: boolean
  preferredCurrency: Currency
  loanType: LoanType
}

export interface SharkyOrderBooks {
  collectionId: string
  pubkey: string
  enabled: boolean
}

export interface DigitalAsset {
  id: string
  collectionId: string
  owner: string
}

export class DB extends Dexie {
  nfts!: Table<Nft>
  collections!: Table<Collection>
  rarity!: Table<Rarity>
  tags!: Table<Tag>
  taggedNfts!: Table<TaggedNft>
  order!: Table<Order>
  preferences!: Table<Preferences>
  wallets!: Table<Wallet>
  sharkyOrderBooks!: Table<SharkyOrderBooks>
  digitalAssets!: Table<DigitalAsset>

  constructor() {
    super("biblio.tech")
    this.version(4).stores({
      nfts: "nftMint,collectionId,owner",
      collections: "id,helloMoonCollectionId,collectionId,name",
      rarity: "nftMint,howRare,moonRank",
      tags: "id,name,color",
      taggedNfts: "[nftId+tagId],nftId,tagId,sortedIndex",
      order: "nftMint",
      preferences: "page",
      wallets: "publicKey",
      sharkyOrderBooks: "collectionId",
      digitalAssets: "id,collectionId,owner",
    })
  }
}

export default new DB()
