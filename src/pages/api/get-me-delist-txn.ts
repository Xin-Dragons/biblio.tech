import { NextApiRequest, NextApiResponse } from "next";
import client from "../../helpers/apollo";
import { gql } from "@apollo/client";
import { orderBy } from "lodash";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mint, priceLamports, seller } = req.body;
  try {
    const resp = await client.query({
      query: gql`
        query MeDelistNftTx($mint: String!, $priceLamports: Decimal!, $seller: String!) {
          meDelistNftTx(mint: $mint, priceLamports: $priceLamports, seller: $seller) {
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
        priceLamports,  
        mint,
      }
    })
    
    res.status(200).json(resp.data.meDelistNftTx)
  } catch (err: any) {
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