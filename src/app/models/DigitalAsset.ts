import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { Nft, NftTokenType } from "alchemy-sdk"
import { DAS } from "helius-sdk"
import { Sale } from "./Sale"
import { Listing } from "./Listing"
import { STAKING_AUTHS } from "@/constants"
import { Collection } from "./Collection"
import db from "@/db"

export type Chain = "ETH" | "SOL" | "MATIC"

export type Status = "FROZEN" | "LISTED" | "COLLATERALIZED" | "STAKED" | "DELEGATED" | "SECURED" | "NONE"
export type Trait = { trait_type: string; value: any; floor?: number }
export type LastSale = {
  price: number
  txAt: number
}

export type ValuationMethod = "topTrait" | "userValuation" | "lastSale" | "floor"

export class DigitalAsset {
  public id: string
  public name: string
  public image?: string
  public collection?: Collection
  public contractAddress?: string
  public collectionId?: string
  public jsonUri?: string
  public tokenId?: string
  public mintAddress?: string
  public symbol?: string
  public listing?: Listing | null
  public owner?: string
  public verified?: boolean
  public collectionName?: string
  public tokenType?: NftTokenType
  public chain: Chain
  public contractDeployer?: string
  public attributes: Trait[]
  public tokenStandard?: number
  public isNonFungible: boolean
  public sales?: Sale
  public updateAuthority?: string
  public mutable?: boolean
  public burned?: boolean
  public helloMoonCollectionId?: string
  public isMasterEdition?: boolean
  public isEdition?: boolean
  public isCompressed?: boolean
  public sellerFeeBasisPoints?: number
  public verifiedCollection?: string
  public compression?: DAS.Compression
  public creators?: DAS.Creators[]
  public sold?: boolean
  public isNew?: boolean
  public prevPrice?: number
  public rarity?: {
    howRare: number | null
    moonRank: number | null
    tt: number | null
  }
  public numMints?: number
  public lastSale?: LastSale
  public slug?: string
  public status?: Status
  public topTrait?: string
  public floor?: number
  public userValuation?: number
  public valuationMethod?: ValuationMethod
  public deleted?: boolean
  public ownership?: DAS.GetAssetResponse["ownership"]

  constructor({
    id,
    contractAddress,
    collectionId,
    tokenId,
    name,
    jsonUri,
    image,
    symbol,
    verified,
    collectionName,
    tokenType,
    chain,
    contractDeployer,
    attributes,
    tokenStandard,
    isNonFungible,
    listing,
    sales,
    owner,
    updateAuthority,
    mutable,
    helloMoonCollectionId,
    isMasterEdition,
    isEdition,
    isCompressed,
    sellerFeeBasisPoints,
    verifiedCollection,
    compression,
    creators,
    sold,
    isNew,
    prevPrice,
    rarity,
    slug,
    lastSale,
    status,
    topTrait,
    floor,
    collection,
    numMints,
    userValuation,
    valuationMethod,
    deleted,
    ownership,
  }: Omit<DigitalAsset, "estimatedValue" | "setUserValuation" | "updateValuationMethod" | "setTopTrait">) {
    let atts = attributes || []
    if (!Array.isArray(atts) && typeof atts === "object") {
      atts = [atts]
    }
    this.id = id
    this.contractAddress = contractAddress
    this.listing = listing
    this.collectionId = collectionId
    this.jsonUri = jsonUri
    this.tokenId = tokenId
    this.name = name
    this.image = image
    this.symbol = symbol
    this.verified = verified
    this.collectionName = collectionName
    this.tokenType = tokenType
    this.chain = chain
    this.contractDeployer = contractDeployer
    this.attributes = atts
    this.tokenStandard = tokenStandard
    this.isNonFungible = isNonFungible
    this.sales = sales
    this.owner = owner
    this.updateAuthority = updateAuthority
    this.mutable = mutable
    this.helloMoonCollectionId = helloMoonCollectionId
    this.isMasterEdition = isMasterEdition
    this.isEdition = isEdition
    this.isCompressed = isCompressed
    this.sellerFeeBasisPoints = sellerFeeBasisPoints
    this.verifiedCollection = verifiedCollection
    this.compression = compression
    this.creators = creators
    this.sold = sold
    this.isNew = isNew
    this.prevPrice = prevPrice
    this.rarity = rarity
    this.slug = slug
    this.lastSale = lastSale
    this.status = status
    this.topTrait = topTrait
    this.floor = floor
    this.collection = collection
    this.numMints = numMints
    this.userValuation = userValuation
    this.valuationMethod = valuationMethod
    this.deleted = deleted
    this.ownership = ownership
  }

  static ethereum(nft: Nft) {
    const digitalAsset = new DigitalAsset({
      id: `${nft.contract.address}.${nft.tokenId}`,
      contractAddress: nft.contract.address,
      collectionId: nft.contract.address,
      tokenId: nft.tokenId,
      jsonUri: nft.tokenUri?.gateway,
      name: nft.title || `${nft.contract.name} #${nft.tokenId}`,
      image: nft.media[0].gateway,
      symbol: nft.contract.symbol,
      verified: !!(nft.contract.openSea && nft.contract.openSea.safelistRequestStatus),
      collectionName: nft.contract.openSea?.collectionName || nft.contract.name,
      tokenType: nft.contract.tokenType,
      chain: "ETH",
      contractDeployer: nft.contract.contractDeployer,
      isNonFungible: nft.tokenType === "ERC721",
      attributes: (nft.rawMetadata?.attributes as Trait[]) || [],
    })

    return digitalAsset
  }

  static solana(
    nft: DAS.GetAssetResponse & {
      content?: DAS.Content & {
        metadata: DAS.Metadata & {
          token_standard: TokenStandard
        }
      }
    } & {
      verified?: boolean
      collectionId?: string
      listing?: Listing
      image?: string
      helloMoonCollectionId?: string
      isMasterEdition?: boolean
      slug?: string
      howRare?: number
      tt?: number
      moonRank?: number
      rarityRankHR?: number
      rarityRankStat?: number
      loan?: any
      secured?: boolean
      status?: Status
      topTrait?: number
      floor?: number
      collection?: Collection
      lastSale?: LastSale
      numMints?: number
      deleted?: boolean
    }
  ) {
    let attributes = nft.content?.metadata.attributes || []

    if (!Array.isArray(attributes) && typeof attributes === "object") {
      attributes = [attributes]
    }

    const traitValues = nft.collection?.traits?.traitActive
    if (traitValues) {
      if (traitValues["<name>"]) {
        nft.floor = traitValues["<name>"]?.[nft.content?.metadata.name || ""]?.p || nft.floor || 0
      } else {
        attributes = attributes.map((att) => {
          let floor = traitValues[att.trait_type]?.[att.value]?.p || 0
          if (!floor && att.trait_type.toLowerCase() === "legendary") {
            const values = Object.values(traitValues[att.trait_type] || {}).map((v) => v.p || 0)
            floor = Math.min(...(values.length ? values : [0]))
          }
          return {
            ...att,
            floor,
          }
        })
      }
    }

    const verifiedCollection = nft.grouping?.find(
      (g: { group_key: string; group_value: string }) => g.group_key === "collection"
    )?.group_value

    let tokenStandard = nft.content ? ((TokenStandard[nft.content.metadata.token_standard] || 0) as number) : 0
    if (nft.compression?.compressed) {
      tokenStandard = -1
    }

    let valuationMethod: ValuationMethod | undefined = undefined

    const digitalAsset = new DigitalAsset({
      id: nft.id,
      name: nft.content?.metadata.name || "Unnamed item",
      collectionId: nft.collectionId,
      verifiedCollection,
      jsonUri: nft.content?.json_uri,
      image: nft.image || nft.content?.links?.image,
      verified: nft.verified,
      tokenStandard,
      chain: "SOL",
      isNonFungible: [
        TokenStandard.NonFungible,
        TokenStandard.NonFungibleEdition,
        TokenStandard.ProgrammableNonFungible,
        TokenStandard.ProgrammableNonFungibleEdition,
      ].includes(tokenStandard),
      attributes,
      owner: nft.listing ? nft.listing.seller : nft.ownership?.owner,
      updateAuthority: nft.authorities?.find((auth: any) => auth.scopes.includes("full"))?.address,
      mutable: nft.mutable,
      helloMoonCollectionId: nft.helloMoonCollectionId,
      isMasterEdition: nft.isMasterEdition,
      isEdition: [TokenStandard.NonFungibleEdition, TokenStandard.ProgrammableNonFungibleEdition].includes(
        tokenStandard
      ),
      listing: nft.listing,
      isCompressed: nft.compression?.compressed,
      compression: nft.compression,
      sellerFeeBasisPoints: nft.royalty?.basis_points,
      creators: nft.creators,
      slug: nft.slug,
      rarity: {
        howRare: nft.howRare || nft.rarityRankHR || null,
        moonRank: nft.moonRank || nft.rarityRankStat || null,
        tt: nft.tt || null,
      },
      status: nft.status,
      floor: nft.floor && Number(nft.floor),
      collection: nft.collection,
      lastSale: nft.lastSale,
      numMints: nft.numMints,
      valuationMethod,
      deleted: nft.deleted,
      ownership: nft.ownership,
    })

    return digitalAsset
  }

  public get estimatedValue() {
    const valuationMethod =
      this.valuationMethod || ((this.attributes || []).find((a) => a.floor) ? "topTrait" : "floor")
    if (valuationMethod === "floor") {
      return this.floor
    }
    if (valuationMethod === "lastSale") {
      return this.lastSale?.price
    }
    if (valuationMethod === "topTrait") {
      if (this.topTrait) {
        return this.attributes.find((att) => att.trait_type === this.topTrait)?.floor || 0
      }
      const val =
        this.attributes.find(
          (att) =>
            (att.floor || 0) >= (this.attributes.length ? Math.max(...this.attributes.map((att) => att.floor || 0)) : 0)
        )?.floor || 0

      return val
    }
    if (valuationMethod === "userValuation") {
      return this.userValuation
    }
  }

  public get variance() {
    return this.estimatedValue / this.floor
  }

  public async updateValuationMethod(valuationMethod: ValuationMethod) {
    await db.digitalAssets.update(this.id, {
      valuationMethod,
    })
  }

  public async setUserValuation(userValuation?: number) {
    await db.digitalAssets.update(this.id, {
      userValuation,
    })
  }

  public async setTopTrait(topTrait: string) {
    await db.digitalAssets.update(this.id, {
      topTrait,
    })
  }

  public async removeStatus() {
    await db.digitalAssets.update(this.id, {
      status: "NONE",
    })
  }

  public async delist() {
    await db.digitalAssets.update(this.id, {
      status: "NONE",
      listing: null,
    })
  }

  public async burn() {
    await db.digitalAssets.delete(this.id)
  }

  public async updateOwner(owner: string) {
    await db.digitalAssets.update(this.id, { owner })
  }

  public async recovered(owner: string) {
    await db.digitalAssets.update(this.id, { owner, status: "NONE" })
  }

  public async unsecured() {
    await db.digitalAssets.update(this.id, { status: "NONE" })
  }

  public async secured() {
    await db.digitalAssets.update(this.id, { status: "SECURED" })
  }

  // public async toggleIgnoreTopTrait() {
  //   await db.digitalAssets.update(this.id, {
  //     ignoreTopTrait: !this.ignoreTopTrait,
  //   })
  // }

  // static async fromAlchemy(contractAddress: string, tokenId: string) {
  //   const nft = await ethAlchemy.nft.getNftMetadata(contractAddress, tokenId, {
  //     refreshCache: true,
  //   })

  //   const digitalAsset = new DigitalAsset(nft)

  //   if (digitalAsset.isNonFungible) {
  //     const [owners, listing] = await Promise.all([
  //       ethAlchemy.nft.getOwnersForNft(contractAddress, tokenId),
  //       getListing(contractAddress, tokenId),
  //     ])

  //     digitalAsset.owner = owners.owners[0]
  //     digitalAsset.listing = listing
  //   }

  //   return digitalAsset
  // }

  // static async fromHelius() {
  // item.grouping.find((g) => g.group_value === params.collectionId)
  //   try {
  //
  //     this.image = image
  //   } catch (err) {
  //     try {
  //       const da = await fetchDigitalAsset(umi, publicKey(item.id))
  //       const image = (await fetchJsonMetadata(umi, da.metadata.uri)).image
  //       setImage(image)
  //     } catch {}
  //   }
  // }
}
