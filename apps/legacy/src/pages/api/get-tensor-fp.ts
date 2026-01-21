import { NextApiRequest, NextApiResponse } from "next";
import client from "../../helpers/apollo";
import { gql } from "@apollo/client";
import { flatten, groupBy, keyBy, orderBy, size } from "lodash";
import { BN } from "bn.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body;
  const grouped = groupBy(mints, item => item.collectionId)

  try {
    const resp = await client.query({
      query: gql`
        query Mints($tokenMints: [String!]!) {
          mints(tokenMints: $tokenMints) {
            slug,
            onchainId
          }
        }
      `,
      variables: {
        tokenMints: Object.values(grouped).map(items => items[0].mint)
      }
    })

    const slugs = resp.data.mints.map((item: any) => item.slug);

    const [collectionInfo, poolInfo] = await Promise.all([
      client.query({
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
          slugs
        }
      }),
      Promise.all(slugs.map((slug: string) => {
        return client.query({
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
            slug
          }
        })
      }))
    ])

    const pools = (poolInfo || []).map((p, index) => {
      const collectionPools = orderBy(p.data.tswapOrders.filter((pool: any) => pool.sellNowPrice), item => BigInt(item.sellNowPrice), "desc")
        .slice(0, 20);

      return {
        pools: collectionPools.map((pool: any) => {
          return {
            ...pool,
            address: pool.address,
            price: pool.sellNowPrice,
            type: pool.poolType?.toLowerCase(),
            slug: slugs[index]
          }
        }),
        slug: slugs[index]
      }
    })

    res.status(200).json({
      pools: keyBy(pools, poolInfo => {
        const slugMint = resp.data.mints.find((item: any) => item.slug === poolInfo.slug)
        const mintItem = mints.find((item: any) => item.mint === slugMint.onchainId)
        return mintItem.collectionId;
      }),
      floorPrices: keyBy(collectionInfo.data.allCollections.collections.map((c: any) => {
        const slugMint = resp.data.mints.find((item: any) => item.slug === c.slug)
        if (!slugMint) {
          return;
        }
        const mintItem = mints.find((item: any) => item.mint === slugMint.onchainId)
  
        return {
          id: c.id,
          collectionId: mintItem.collectionId,
          // fix stupid tensor decimal in lamports bug kek
          floorPrice: c.statsOverall.floorPrice.split(".")[0],
          name: c.name
        }
      }).filter(Boolean), 
      item => {
        return item.collectionId
      })
    })
  } catch (err: any) {
    if (err.networkError) {
      if (err.networkError.result?.errors?.[0]?.message?.includes("API rate limit hit")) {
        console.error("Rate limit hit")
        res.status(500).send("Tensor rate limit hit. Please wait a little while then try again")
        return
      }

      if (err.networkError.result) {
        console.error(err);
        res.status(500).send(err)
        return
      }
    }
    console.log(err)
    res.status(500).send(err)
  }
}