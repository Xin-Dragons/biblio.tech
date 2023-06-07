import { NextApiRequest, NextApiResponse } from "next";
import client from "../../helpers/apollo";
import { gql } from "@apollo/client";
import { orderBy } from "lodash";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { seller, minPriceLamports, mint, pool, royalties } = req.body;
  try {
    const resp = await client.query({
      query: gql`
        query TswapSellNftTx(
          $minPriceLamports: Decimal!
          $mint: String!
          $pool: String!
          $seller: String!
          $optionalRoyaltyPct: Int
          $sellerTokenAccount: String
        ) {
          tswapSellNftTx(
            minPriceLamports: $minPriceLamports
            mint: $mint
            pool: $pool
            seller: $seller
            sellerTokenAccount: $sellerTokenAccount
            optionalRoyaltyPct: $optionalRoyaltyPct
          ) {
            txs {
              lastValidBlockHeight
              tx
              txV0
            }
          }
        }
      `,
      variables: {  
        seller,
        minPriceLamports,  
        mint,
        pool,
        sellerTokenAccount: null, 
        optionalRoyaltyPct: royalties ? 100 : 0
      }
    })

    res.status(200).json(resp.data.tswapSellNftTx)
  } catch (err: any) {
    if (err.graphQLErrors && err.graphQLErrors.length) {
      console.error(err.graphQLErrors[0].message);
      return res.status(500).send(err.graphQLErrors[0].message)
    }
    if (err.networkError.result?.errors?.[0]?.message?.includes("API rate limit hit")) {
      console.error("Rate limit hit")
      res.status(500).send("Tensor rate limit hit. Please wait a little while then try again")
      return
    }
    if (err.networkError) { 
      console.error(err.networkError.result)
      return res.status(500).send(err.networkError.result)
    }

    return res.status(500).send(err)
  }
}