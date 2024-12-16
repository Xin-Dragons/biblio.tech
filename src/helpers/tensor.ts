import { gql } from "@apollo/client"

export async function getTensorInventory(owner: string) {
  try {
    const { data } = await client.query({
      query: gql`
        query CollectionStats(
          $owner: String!
          $includeUnverified: Boolean
          $includeFrozen: Boolean
          $includeCompressed: Boolean
          $wallets: [String!]!
          $sortBy: ActiveListingsSortBy!
        ) {
          inventoryBySlug(
            owner: $owner
            includeUnverified: $includeUnverified
            includeFrozen: $includeFrozen
            includeCompressed: $includeCompressed
          ) {
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
              attributes {
                trait_type
                value
              }
              name
              imageUri
              rarityRankHR
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
            traits {
              traitActive
            }
          }
          userActiveListingsV2(sortBy: $sortBy, wallets: $wallets) {
            txs {
              mint {
                onchainId
                attributes {
                  trait_type
                  value
                }
                name
                imageUri
                rarityRankHR
                rarityRankStat
                lastSale {
                  txAt
                  price
                }
                collection {
                  slugDisplay
                  slug
                  imageUri
                  name
                  tensorVerified
                  compressed
                  twitter
                  website
                  discord
                  traits {
                    traitActive
                  }
                  statsV2 {
                    buyNowPrice
                    numMints
                  }
                }
              }
              tx {
                grossAmount
                source
                txAt
                txId
                sellerId
              }
            }
          }
        }
      `,
      variables: {
        owner,
        wallets: [owner],
        includeFrozen: true,
        includeUnverified: true,
        includeCompressed: true,
        sortBy: "ListedDesc",
      },
    })

    return data
  } catch (err: any) {
    console.error(err.networkError.result)
  }
}
