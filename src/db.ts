import Dexie, { Table } from "dexie";

export interface NftMetadata {
  name?: string;
  image?: string;
  animation_url?: string;
  external_url?: string;
}

export interface Nft {
  nftMint: string;
  helloMoonCollectionId: string;
  json: NftMetadata;
  nftCollectionMint?: string;
  starred?: boolean;
  tokenStandard?: number;
  name?: string;
  symbol?: string;
  jsonLoaded?: boolean;
  moonRank?: number;
  moonRankTier: string;
  howRare?: number;
  howRareTier?: string;
  sortedIndex?: number;
}

export interface Collection {
  helloMoonCollectionId: string | string[];
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

export class DB extends Dexie {
  nfts!: Table<Nft>;
  collections!: Table<Collection>;
  tags!: Table<Tag>;
  taggedNfts!: Table<TaggedNft>;

  constructor(publicKey: string) {
    super(`biblio.tech.${publicKey}`);
    this.version(3).stores({
      nfts: "nftMint,helloMoonCollectionId,moonRank,howRare,sortedIndex",
      collections: "helloMoonCollectionId,name",
      tags: "id,name,color",
      taggedNfts: '[nftId+tagId],nftId,tagId,sortedIndex'
    })
  }
}