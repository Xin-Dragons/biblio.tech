import { MARKETPLACES } from "@/constants"
import { OpenSeaListing } from "@/helpers/opensea"
import { NftListingStatus } from "@hellomoon/api"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { findKey } from "lodash"
import { DigitalAsset } from "./DigitalAsset"

export function findMarketplace(mkt: string) {
  return findKey(MARKETPLACES, (mkts) => mkts.includes(mkt))
}

export class Listing {
  public id: string
  public nftId: string
  public price: number
  public currency: string
  public blocktime: number
  public seller: string
  public marketplace: string
  public digitalAsset?: DigitalAsset

  constructor({ id, nftId, price, currency, blocktime, seller, marketplace, digitalAsset }: Listing) {
    this.id = id
    this.nftId = nftId
    this.price = price
    this.currency = currency
    this.blocktime = blocktime
    this.seller = seller
    this.marketplace = findMarketplace(marketplace) as string
    this.digitalAsset = digitalAsset
  }

  static fromHelloMoon(hmListing: NftListingStatus & { mint?: string; marketName?: string }) {
    const listing = new Listing({
      id: hmListing.transactionId,
      nftId: hmListing.nftMint || (hmListing.mint as string),
      blocktime: hmListing.blockTime,
      price: hmListing.price,
      currency: "SOL",
      seller: hmListing.seller,
      marketplace: findMarketplace((hmListing.marketplace || hmListing.marketName) as string) as string,
    })

    return listing
  }

  static fromOpenSea(openSeaListing: OpenSeaListing) {
    const listing = new Listing({
      id: openSeaListing.orderHash,
      nftId: `${openSeaListing.token.contractAddress}.${openSeaListing.token.tokenId}`,
      price: Number(openSeaListing.price.value) / Math.pow(10, openSeaListing.price.decimals || 18),
      currency: openSeaListing.price.currency,
      blocktime: openSeaListing.blocktime,
      seller: openSeaListing.seller,
      marketplace: "OpenSea",
    })

    return listing
  }
}
