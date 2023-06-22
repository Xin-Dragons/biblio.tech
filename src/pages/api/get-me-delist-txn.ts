import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "confirmed" });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seller, tokenMint } = req.body;
  try {
    const headers = {
      Authorization: `Bearer ${process.env.ME_API_KEY}`
    }
    const result = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${tokenMint}/listings`);
    const { auctionHouse, tokenAddress, sellerReferral, price } = result.data[0]

    const params = {
      seller,
      auctionHouseAddress: auctionHouse,
      tokenMint,
      tokenAccount: (await connection.getTokenLargestAccounts(new PublicKey(tokenMint))).value[0].address.toBase58(),
      price,
      sellerReferral,
    }


    const { data } = await axios.get("https://api-mainnet.magiceden.dev/v2/instructions/sell_cancel", {
      params,
      headers
    })

    res.status(200).json(data)
  } catch (err: any) {
    console.log(err)
    return res.status(500).send(err?.response.data || err.message || "Something went wrong")
  }
}