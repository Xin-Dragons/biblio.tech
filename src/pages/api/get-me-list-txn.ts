import { PublicKey } from "@metaplex-foundation/js"
import { Connection } from "@solana/web3.js"
import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

const AUCTION_HOUSE = "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seller, tokenMint, price } = req.body
  try {
    const headers = {
      Authorization: `Bearer ${process.env.ME_API_KEY}`,
    }
    const params = {
      seller,
      auctionHouseAddress: AUCTION_HOUSE,
      tokenMint,
      tokenAccount: (await connection.getTokenLargestAccounts(new PublicKey(tokenMint))).value[0].address.toBase58(),
      price: Number(price),
    }
    const { data } = await axios.get(`https://api-mainnet.magiceden.dev/v2/instructions/sell`, {
      params,
      headers,
    })

    res.status(200).json(data)
  } catch (err: any) {
    console.log(err)

    return res.status(500).send(err?.response?.data || err.message || "Something went wrong")
  }
}
