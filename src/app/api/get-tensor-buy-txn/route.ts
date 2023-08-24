import { gql } from "@apollo/client"
import client from "../../../helpers/apollo"
import { NextApiRequest, NextApiResponse } from "next"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { buyer, maxPrice, mint, owner, royalties } = await req.json()
  try {
    const resp = await client.query({
      query: gql`
        query TswapBuySingleListingTx(
          $buyer: String!
          $maxPrice: Decimal!
          $mint: String!
          $owner: String!
          $optionalRoyaltyPct: Int
        ) {
          tswapBuySingleListingTx(
            buyer: $buyer
            maxPrice: $maxPrice
            mint: $mint
            owner: $owner
            optionalRoyaltyPct: $optionalRoyaltyPct
          ) {
            txs {
              lastValidBlockHeight
              tx
              txV0 # If this is present, use this!
            }
          }
        }
      `,
      variables: {
        buyer,
        maxPrice,
        mint,
        owner,
        optionalRoyaltyPct: royalties ? 100 : 0,
      },
    })

    return NextResponse.json(resp.data.tswapBuySingleListingTx)
  } catch (err: any) {
    // if (err.graphQLErrors && err.graphQLErrors.length) {
    //   console.error(err.graphQLErrors[0].message)
    //   return res.status(500).send(err.graphQLErrors[0].message)
    // }
    // if (err.networkError.result?.errors?.[0]?.message?.includes("API rate limit hit")) {
    //   console.error("Rate limit hit")
    //   res.status(500).send("Tensor rate limit hit. Please wait a little while then try again")
    //   return
    // }
    // if (err.networkError) {
    //   console.error(err.networkError.result)
    //   return res.status(500).send(err.networkError.result)
    // }
    // return res.status(500).send(err)
  }
}
