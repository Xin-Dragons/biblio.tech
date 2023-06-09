import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seller, tokenMint } = req.body;
  try {
    const headers = {
      Authorization: `Bearer ${process.env.ME_API_KEY}`
    }
    const result = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${tokenMint}/listings`);
    const { auctionHouse, tokenAddress, sellerReferral, price } = result.data[0];

    const params = {
      seller,
      auctionHouseAddress: auctionHouse,
      tokenMint,
      tokenAccount: tokenAddress,
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
    if (err.graphQLErrors && err.graphQLErrors.length) {
      console.error(err.graphQLErrors[0].message);
      return res.status(500).send(err.graphQLErrors[0].message)
    }
    if (err.networkError) {
      console.error(err.networkError.result)
      return res.status(500).send(err.networkError.result)
    }

    return res.status(500).send(err)
  }
}