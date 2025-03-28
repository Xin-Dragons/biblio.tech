import { Connection, PublicKey } from "@solana/web3.js"
import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seller, tokenMint, buyer, royalties } = req.body
  try {
    const headers = {
      Authorization: `Bearer ${process.env.ME_API_KEY}`,
    }
    const result = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${tokenMint}/listings`)
    const { auctionHouse, price, expiry, sellerReferral } = result.data[0]

    const params = {
      buyer,
      seller,
      auctionHouseAddress: auctionHouse,
      tokenMint,
      tokenATA: (await connection.getTokenLargestAccounts(new PublicKey(tokenMint))).value[0].address.toBase58(),
      price,
      buyerCreatorRoyaltyPercent: royalties ? 100 : 0,
      buyerReferral: null,
      sellerReferral: sellerReferral,
      buyerExpiry: -1,
      sellerExpiry: expiry,
    }

    const { data } = await axios.get("https://api-mainnet.magiceden.dev/v2/instructions/buy_now", {
      params,
      headers,
    })

    res.status(200).json(data)
  } catch (err: any) {
    console.log(err)
    return res.status(500).send(err?.response.data || err.message || "Something went wrong")
  }
}
