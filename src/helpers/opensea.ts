import axios from "axios"
import Bottleneck from "bottleneck"
import { orderBy, uniqBy } from "lodash"
import { sleep } from "./utils"

const limiter = new Bottleneck({
  minTime: 500,
})

const API_URI = "https://api.opensea.io/api/"
const headers = {
  "X-API-KEY": process.env.OPEN_SEA_API_KEY,
}

export async function getSingleContract(contract: string) {
  const { data } = await axios.get(`${API_URI}/v1/asset_contract/${contract}`, { headers })
  return data.collection
}

export async function getCollectionStats(slug: string) {
  const { data } = await axios.get(`${API_URI}/v1/collection/${slug}/stats`, { headers })
  return data.stats
}

export async function getCollectionStatsFromContract(contract: string) {
  const { slug } = await getSingleContract(contract)
  const stats = await getCollectionStats(slug)
  return stats
}

export type OpenSeaListing = {
  price: {
    value: string
    currency: string
    decimals?: number
  }
  orderHash: string
  blocktime: number
  seller: string
  token: {
    tokenId: string
    contractAddress: string
    tokenType: "ERC721"
  }
}

function mapListings(listings: any[]) {
  return uniqBy(
    orderBy(
      listings
        .map((listing: any) => {
          const token = listing.protocol_data.parameters.offer?.[0]
          if (!token) {
            return null
          }
          return {
            price: listing.price.current,
            blocktime: listing.protocol_data.parameters.startTime,
            orderHash: listing.order_hash,
            seller: listing.protocol_data.parameters.offerer,
            token: {
              tokenId: token.identifierOrCriteria,
              contractAddress: token.token.toLowerCase(),
              tokenType: "ERC721",
            },
          }
        })
        .filter(Boolean),
      (item) => Number(item?.blocktime),
      "desc"
    ),
    (item: any) => item.token.tokenId
  )
}

async function getListingsBatch(slug: string, next?: string, retries = 3): Promise<any[]> {
  try {
    const { data } = await axios.get(`${API_URI}/v2/listings/collection/${slug}/all`, { headers, params: { next } })
    if (data.next) {
      // @ts-ignore
      return [...data.listings, ...(await wrapped(slug, data.next))]
    }
    return data.listings
  } catch (err: any) {
    if (err.code === 429 && retries) {
      console.log("RETRY")
      await sleep(1000)
      return getListingsBatch(slug, next, retries - 1)
    }
    throw err
  }
}

const wrapped = limiter.wrap(getListingsBatch)

export async function getListings(slug: string): Promise<any[]> {
  const listings = await wrapped(slug)
  return mapListings(listings)
}

export async function getListingsFromContract(contract: string) {
  const { slug } = await getSingleContract(contract)
  const listings = await getListings(slug)
  return listings
}

export async function getListing(contractId: string, tokenId: string) {
  try {
    const { data } = await axios.get(`${API_URI}/v2/orders/ethereum/seaport/listings`, {
      params: {
        asset_contract_address: contractId,
        token_ids: tokenId,
      },
      headers,
    })

    return data.orders[0]
  } catch (err) {
    console.log(err)
  }
}

export async function getNft(contractId: string, tokenId: string) {
  try {
    const { data } = await axios.get(`${API_URI}/v2/chain/ethereum/contract/${contractId}/nfts/${tokenId}`, {
      headers,
    })

    return data.nft
  } catch (err) {
    console.log(err)
  }
}
