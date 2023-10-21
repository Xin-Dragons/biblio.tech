"use server"
import { gql } from "@apollo/client"
import client from "./apollo"
import { omit, upperFirst } from "lodash"
import { PageCursor } from "@/types/tensor"

export async function getTensorStats(collectionId: string) {
  try {
    const collectionInfo = await client.query({
      query: gql`
        query CollectionStats($slug: String!) {
          instrumentTV2(slug: $slug) {
            tensorVerified
            traits {
              traitActive
            }
            statsV2 {
              buyNowPrice
              buyNowPriceNetFees
              floor24h
              volume24h
              volumeAll
              numListed
              numMints
            }
          }
        }
      `,
      variables: {
        slug: collectionId,
      },
    })
    const data = collectionInfo.data.instrumentTV2
    return {
      tensorVerified: data.statsV2.tensorVerified,
      floorPrice: data.statsV2.buyNowPrice,
      volumeAll: data.statsV2.volumeAll,
      floor24h: data.statsV2.floor24h,
      numListed: data.statsV2.numListed,
      numMints: data.statsV2.numMints,
      volume24h: data.statsV2.volume24h,
      traits: data.traits?.traitActive,
    }
  } catch (err: any) {
    console.log(err.networkError.result)
  }
}

export async function getTensorListings(
  slug: string,
  sortBy = "price.asc",
  filters = {},
  cursor?: { str: any } | null
): Promise<{ results: any[]; page: PageCursor } | undefined> {
  console.log({ sortBy, filters })
  function mapResults(t: any) {
    return {
      id: t.tx.txId,
      nftId: t.mint.onchainId,
      blocktime: t.tx.txAt,
      price: Number(t.tx.grossAmount),
      currency: "SOL",
      seller: t.tx.sellerId,
      marketplace: t.tx.source,
      digitalAsset: {
        id: t.mint.onchainId,
        attributes: t.mint.attributes,
        image: t.mint.imageUri,
        name: t.mint.name,
        rarity: {
          howRare: t.mint.rarityRankHR,
          moonRank: t.mint.rarityRankStat,
          tt: t.mint.rarityRankTT,
        },
        lastSale: t.mint.lastSale,
        chain: "SOL",
        owner: t.tx.sellerId,
        isNonFungible: [
          "NON_FUNGIBLE",
          "NON_FUNGIBLE_EDITION",
          "PROGRAMMABLE_NON_FUNGIBLE",
          "PROGRAMMABLE_NON_FUNGIBLE_EDITION",
        ].includes(t.mint.tokenStandard),
      },
    }
  }
  try {
    const resp = await client.query({
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
                attributes
                imageUri
                name
                rarityRankHR
                rarityRankStat
                rarityRankTN
                rarityRankTT
                tokenStandard
                lastSale {
                  price
                  txAt
                }
              }
              tx {
                sellerId
                grossAmount
                grossAmountUnit
                txId
                txAt
                source
              }
            }
          }
        }
      `,
      variables: {
        slug,
        sortBy: sortBy
          .split(".")
          .map((part) => upperFirst(part))
          .join(""),
        limit: 250,
        filters,
        cursor: cursor ? omit(cursor, "__typename") : null,
      },
    })

    return {
      results: resp.data.activeListingsV2.txs.map(mapResults),
      page: resp.data.activeListingsV2.page,
    }
  } catch (err: any) {
    console.log(err.networkError.result)
    // await sleep(2_000)

    // return getTensorListings(slug, cursor)
  }
}

export async function getTensorListingsForUser(wallet: string) {
  try {
    const resp = await client.query({
      query: gql`
        query UserActiveListingsV2(
          $wallets: [String!]!
          $sortBy: ActiveListingsSortBy!
          $cursor: ActiveListingsCursorInputV2
          $limit: Int
          $slug: String
        ) {
          userActiveListingsV2(wallets: $wallets, cursor: $cursor, limit: $limit, sortBy: $sortBy, slug: $slug) {
            page {
              endCursor {
                str
              }
              hasMore
            }
            txs {
              tx {
                txId
                txAt
                source
                mintOnchainId
                grossAmount
                sellerId
              }
              mint {
                onchainId
                attributes
                imageUri
                name
                rarityRankHR
              }
            }
          }
        }
      `,
      variables: {
        wallets: [wallet],
        sortBy: "ListedDesc",
      },
    })
    return resp.data.userActiveListingsV2.txs.map((t: any) => {
      return {
        id: t.tx.txId,
        nftId: t.mint.onchainId,
        blocktime: t.tx.txAt,
        price: t.tx.grossAmount,
        currency: "SOL",
        seller: t.tx.sellerId,
        marketplace: t.tx.source,
      }
    })
  } catch (err: any) {
    console.error(err.networkError.result)
  }
}

export async function getTensorPools(slug: string) {
  const resp = await client.query({
    query: gql`
      query TensorSwapActiveOrders($slug: String!) {
        tswapOrders(slug: $slug) {
          address
          createdUnix
          curveType
          delta
          mmCompoundFees
          mmFeeBps
          nftsForSale {
            onchainId
            attributes
            imageUri
            name
            rarityRankHR
            compressed
            tokenStandard
          }
          nftsHeld
          ownerAddress
          poolType
          solBalance
          startingPrice
          buyNowPrice
          sellNowPrice
          statsAccumulatedMmProfit
          statsTakerBuyCount
          statsTakerSellCount
          takerBuyCount
          takerSellCount
          updatedAt
        }
      }
    `,
    variables: {
      slug,
    },
  })

  return resp.data.tswapOrders
}

export async function getTensorCollections(sortBy = "volume24h", order = "desc", page = 1) {
  const resp = await client.query({
    query: gql`
      query CollectionsStats(
        $slugs: [String!]
        $slugsMe: [String!]
        $slugsDisplay: [String!]
        $ids: [String!]
        $sortBy: String
        $page: Int
        $limit: Int
      ) {
        allCollections(
          slugs: $slugs
          slugsMe: $slugsMe
          slugsDisplay: $slugsDisplay
          ids: $ids
          sortBy: $sortBy
          page: $page
          limit: $limit
        ) {
          total
          collections {
            id
            slug
            slugMe
            slugDisplay
            imageUri
            statsV2 {
              currency
              buyNowPrice
              buyNowPriceNetFees
              sellNowPrice
              sellNowPriceNetFees
              numListed
              numMints
              floor1h
              floor24h
              floor7d
              sales1h
              sales24h
              sales7d
              salesAll
              volume1h
              volume24h
              volume7d
              volumeAll
            }
            firstListDate
            name
          }
        }
      }
    `,
    variables: {
      slugs: null,
      sortBy: `statsV2.${sortBy}:${order}`,
      limit: 100,
      page,
    },
  })

  console.log(resp.data.allCollections.total)

  return resp.data.allCollections.collections
}

export async function getRecentTransactions(slug: string, traits?: { traitType: string; values: any[] }[]) {
  const filters = {
    txTypes: ["SALE_ACCEPT_BID", "SALE_BUY_NOW", "SWAP_BUY_NFT", "SWAP_BUY_SINGLE_LISTING", "SWAP_SELL_NFT"],
  } as any

  if (traits) {
    filters.traits = traits
  }
  try {
    const resp = await client.query({
      query: gql`
        query Query($slug: String!, $filters: TransactionsFilters) {
          recentTransactions(slug: $slug, filters: $filters) {
            txs {
              tx {
                grossAmount
                mintOnchainId
                txAt
                txId
                txType
                buyerId
                sellerId
                source
              }
              mint {
                onchainId
                attributes
                imageUri
                name
                rarityRankHR
                rarityRankStat
                rarityRankTN
                rarityRankTT
                tokenStandard
                lastSale {
                  price
                  txAt
                }
              }
            }
          }
        }
      `,
      variables: {
        slug,
        filters,
      },
    })

    console.log(resp.data.recentTransactions.txs)

    return resp.data.recentTransactions.txs
  } catch (err) {
    console.log(err)
  }
}

export async function getSingleMint(slug: string) {
  try {
    const resp = await client.query({
      query: gql`
        query MintList($slug: String!, $limit: Int, $after: String) {
          mintList(slug: $slug, limit: $limit, after: $after)
        }
      `,
      variables: {
        slug,
        limit: 1,
      },
    })

    return resp.data.mintList[0]
  } catch (err) {
    console.log(err)
  }
}

export async function getMintList(slug: string): Promise<string[]> {
  try {
    const resp = await client.query({
      query: gql`
        query MintList($slug: String!) {
          mintList(slug: $slug)
        }
      `,
      variables: {
        slug,
      },
    })

    return resp.data.mintList
  } catch (err) {
    console.log(err)
    return []
  }
}

export async function getTensorMint(mint: string) {
  try {
    const resp = await client.query({
      query: gql`
        query Mint($mint: String!) {
          mint(mint: $mint) {
            collection {
              tensorVerified
              slugDisplay
              name
              slug
              id
              traits {
                traitActive
              }
            }
            lastSale {
              txAt
              price
            }
            activeListings {
              tx {
                grossAmount
                sellerId
                source
                txAt
              }
            }
          }
        }
      `,
      variables: {
        mint,
      },
    })

    console.log(resp)

    return resp.data.mint
  } catch (err) {
    console.log(err.networkError.result)
  }
}

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
              attributes
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
                attributes
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
  } catch (err) {
    console.log(err)
  }
}
