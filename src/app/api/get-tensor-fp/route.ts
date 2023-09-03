import client from "@/helpers/apollo"
import { gql } from "@apollo/client"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { mints } = await req.json()
    const resp = await client.query({
      query: gql`
        query Mints($tokenMints: [String!]!) {
          mints(tokenMints: $tokenMints) {
            slug
            onchainId
          }
        }
      `,
      variables: {
        tokenMints: mints,
      },
    })

    const slugs = resp.data.mints.map((item: any) => item.slug)

    const result = await client.query({
      query: gql`
        query CollectionsStats($slugs: [String!]) {
          allCollections(slugs: $slugs) {
            collections {
              id
              slug
              slugMe
              slugDisplay
              name
              statsOverall {
                floorPrice
              }
              statsSwap {
                sellNowPrice
              }
            }
          }
        }
      `,
      variables: {
        slugs,
      },
    })

    const collections = result.data.allCollections.collections.map((collection: any) => {
      return {
        ...collection,
        mint: resp.data.mints.find((m: any) => m.slug === collection.slug).onchainId,
      }
    })

    return NextResponse.json(collections)
  } catch (err) {
    console.log(Object.keys(err))
    console.log(err.networkError.result)
  }
}
