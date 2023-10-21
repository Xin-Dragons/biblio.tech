import { Chain, DigitalAsset } from "./DigitalAsset"
import { NftRoyalty } from "@hellomoon/api"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { findMarketplace } from "./Listing"

export class Sale {
  id: string
  nftId?: string
  buyer: string
  seller: string
  price: number
  blocktime?: number
  blockNumber?: number
  marketplace?: string
  chain: Chain
  digitalAsset?: DigitalAsset
  royalty?: number
  currency?: string
  symbol?: string
  type?: string

  public constructor({
    id,
    nftId,
    buyer,
    seller,
    price,
    blocktime,
    blockNumber,
    marketplace,
    chain,
    digitalAsset,
    royalty,
    currency,
    symbol,
    type,
  }: Sale) {
    this.id = id
    this.nftId = nftId
    this.buyer = buyer
    this.seller = seller
    this.price = price
    this.blocktime = blocktime
    this.blockNumber = blockNumber
    this.marketplace = findMarketplace(marketplace!)
    this.chain = chain
    this.digitalAsset = digitalAsset
    this.royalty = royalty
    this.currency = currency
    this.symbol = symbol
    this.type = type
  }

  // static fromAlchemy(alchemySale: NftSale) {
  //   return new Sale({
  //     id: alchemySale.transactionHash,
  //     chain: "ETH",
  //     buyer: alchemySale.buyerAddress,
  //     seller: alchemySale.sellerAddress,
  //     digitalAssetId: `${alchemySale.contractAddress}.${alchemySale.tokenId}`,
  //     price:
  //       (Number(alchemySale.sellerFee.amount) +
  //         Number(alchemySale.protocolFee?.amount || 0) +
  //         Number(alchemySale.royaltyFee?.amount || 0)) /
  //       Math.pow(10, alchemySale.sellerFee.decimals || 18),
  //     marketplace: alchemySale.marketplace,
  //     tokenId: alchemySale.tokenId,
  //     blockNumber: alchemySale.blockNumber,
  //   })
  // }
  static fromHelloMoon(hmSale: {
    transactionId: string
    buyer: string
    seller: string
    digitalAsset?: DigitalAsset
    price: number
    blocktime?: number
    blockTime?: number
    marketplace?: string
    market?: string
    nftMint: string
    currency?: string
  }) {
    let marketplace = hmSale.marketplace || hmSale.market
    if (marketplace === "ME_V2") {
      marketplace = "ME"
    } else if (marketplace === "TensorSwap") {
      marketplace = "Tensor"
    } else if (marketplace === "Coral Cube AMM") {
      marketplace = "CoralCube"
    }

    return new Sale({
      id: hmSale.transactionId,
      buyer: hmSale.buyer,
      seller: hmSale.seller,
      digitalAsset: hmSale.digitalAsset,
      nftId: hmSale.nftMint,
      price: hmSale.price,
      chain: "SOL",
      blocktime: ((hmSale.blocktime || hmSale.blockTime) as number) * 1000,
      marketplace: marketplace as string,
      symbol: hmSale.currency ? undefined : "◎",
      currency: hmSale.currency ? hmSale.currency.toUpperCase() : undefined,
    })
  }

  static fromHelloMoonRoyalty(hmSale: NftRoyalty & { digitalAsset?: DigitalAsset }) {
    const amountPaid = hmSale.oldSourceBalance - hmSale.newSourceBalance
    const royaltiesReceived = hmSale.royaltyAmountPaid || 0
    const expected = amountPaid / Number(hmSale.sellerFeeBasisPoints) || 0
    const percentPaid = amountPaid / expected
    console.log({ percentPaid, amountPaid, expected, royaltiesReceived })
    return new Sale({
      id: hmSale.transactionId,
      seller: hmSale.sourceOwner,
      buyer: hmSale.destinationOwner,
      digitalAsset: hmSale.digitalAsset,
      nftId: hmSale.mint as string,
      price: amountPaid ? amountPaid / LAMPORTS_PER_SOL : 0,
      royalty: royaltiesReceived ? royaltiesReceived / LAMPORTS_PER_SOL : 0,
      chain: "SOL",
      blocktime: (hmSale.blockTime as any as number) * 1000,
      marketplace: hmSale.market as string,
    })
  }
}
