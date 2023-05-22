import { DigitalAsset, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import Dexie, { Table } from "dexie";

export interface NftMetadata {
  name?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
}

export interface EditionDetails {
  edition: bigint | "unknown",
  supply: bigint | "unknown"
}

export interface Nft extends DigitalAsset {
  nftMint: string;
  helloMoonCollectionId: string;
  loan?: Loan | null;
  owner?: string | null;
  collectionId?: string | null;
  json?: JsonMetadata;
  jsonLoaded?: boolean;
  status?: string | null;
  supply?: number;
  balance?: number;
  editionDetails?: EditionDetails
  firstVerifiedCreator?: string
  collectionIdentifier?: string
}

export interface Collection {
  id: string;
  helloMoonCollectionId?: string;
  collectionId?: string;
  collectionName: string;
  image?: string;
  floorPrice: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string
}

export interface TaggedNft {
  id?: number;
  nftId: string;
  tagId: string;
}

export interface Loan {
  collateralMint?: string;
  defaults: number;
  started: number;
  amountToRepay: number;
  apy: number;
  extendBlocktime: number | null;
  helloMoonCollectionId: string;
  lender: string;
  liquidateBlocktime: number | null;
  loanDurationSeconds: number | null;
  loanId: string;
  market: string;
  newLoanId: string;
  offerBlocktime: number;
  principalAmount: number;
  protocolCollectionId: string;
  repayAmount: number;
  repayBlocktime: number | null;
  status: string;
}

export interface Order {
  nftMint: string;
}

export interface Rarity {
  nftMint: string,
  moonRank?: number;
  moonRankTier: RarityTier;
  howRare?: number;
  howRareTier?: RarityTier;
  lastParsed?: number;
}

export type RarityTier = "mythic" | "epic" | "legendary" | "rare" | "uncommon" | "common"

export interface Preferences {
  page: string;
  layoutSize: 'small' | 'medium' | 'large' | 'collage';
  showInfo: boolean;
  darkMode?: boolean
}

export class DB extends Dexie {
  nfts!: Table<Nft>;
  collections!: Table<Collection>;
  rarity!: Table<Rarity>;
  tags!: Table<Tag>;
  taggedNfts!: Table<TaggedNft>;
  order!: Table<Order>;
  preferences!: Table<Preferences>;

  constructor() {
    super('biblio.tech');
    this.version(1).stores({
      nfts: "nftMint,collectionId,owner",
      collections: "id,helloMoonCollectionId,collectionId,name",
      rarity: "nftMint,howRare,moonRank",
      tags: "id,name,color",
      taggedNfts: '[nftId+tagId],nftId,tagId,sortedIndex',
      order: "nftMint",
      preferences: 'page'
    })
  }
}