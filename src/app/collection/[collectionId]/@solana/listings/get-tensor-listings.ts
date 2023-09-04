"use server"

import client from "@/helpers/apollo"
import { fetchAllDigitalAssetsByIds, getDigitalAsset } from "@/helpers/digital-assets"
import { gql } from "@apollo/client"

export async function getTensorListings(slug: string) {
  try {
    const result = await client.query({
      query: gql`
        query ActiveListingsV2(
          $slug: String!
          $sortBy: ActiveListingsSortBy!
          $filters: ActiveListingsFilters
          $limit: Int
          $cursor: ActiveListingsCursorInputV2
        ) {
          activeListingsV2(slug: $slug, sortBy: $sortBy, filters: $filters, limit: $limit, cursor: $cursor) {
            page {
              endCursor {
                str
              }
              hasMore
            }
            txs {
              mint {
                onchainId
              }
              tx {
                sellerId
                grossAmount
                grossAmountUnit
              }
            }
          }
        }
      `,
      variables: {
        slug,
        sortBy: "PriceAsc",
      },
    })
    const listings = result.data.activeListingsV2.txs.map((t) => {
      return {
        id: t.mint.onchainId,
        seller: t.tx.seller_id,
        price: t.tx.grossAmount,
      }
    })
    const digitalAssets = await fetchAllDigitalAssetsByIds(listings.map((l) => l.id))
    return listings.map((l) => {
      const da = digitalAssets.find((da) => da.id === l.id)
      return {
        ...da,
        ...l,
      }
    })
  } catch (err) {
    console.log(err)
  }
}
