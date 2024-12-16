import { gql } from "@apollo/client"
import client from "./apollo"

export async function getTensorInventory(owner: string) {
  try {
    const { data } = await client.query({
      query: gql`
        query CollectionStats(
          $owner: String!
          $includeUnverified: Boolean
          $includeFrozen: Boolean
          $includeCompressed: Boolean
        ) {
          inventoryBySlug(
            owner: $owner
            includeUnverified: $includeUnverified
            includeFrozen: $includeFrozen
            includeCompressed: $includeCompressed
          ) {
            id
            slugDisplay
            slug
            imageUri
            name
            tensorVerified
            compressed
            twitter
            website
            discord
            mints {
              onchainId
              collection {
                id
              }
              activeListings {
                tx {
                  grossAmount
                  source
                  txAt
                }
              }
              rarityRankHrtt
              rarityRankStat
              lastSale {
                txAt
                price
              }
            }
            statsV2 {
              buyNowPrice
              numMints
            }
            # traits {
            # traitActive
            # }
          }
        }
      `,
      variables: {
        owner,
        includeFrozen: true,
        includeUnverified: true,
        includeCompressed: true,
      },
    })

    return data
  } catch (err: any) {
    console.error(err.networkError.result)
  }
}
