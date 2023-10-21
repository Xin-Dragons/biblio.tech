import { Sale } from "@/app/models/Sale"
import { Alchemy, Network, NftSale } from "alchemy-sdk"
import axios from "axios"

const API_URI = `https://eth-mainnet.g.alchemy.com/nft/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`

export const ethAlchemy = new Alchemy({
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,
})

export const maticAlchemy = new Alchemy({
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.MATIC_MAINNET,
})

export async function getSalesForNft(contractAddress: string, tokenId: string) {
  const { data } = await axios.get(`${API_URI}/getNFTSales`, {
    params: {
      contractAddress,
      tokenId,
      order: "desc",
    },
  })

  return data.nftSales as NftSale[]
}
