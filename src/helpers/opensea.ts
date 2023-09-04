import axios from "axios"

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
  console.log(data)
  return data.stats
}

export async function getCollectionStatsFromContract(contract: string) {
  const { slug } = await getSingleContract(contract)
  const stats = await getCollectionStats(slug)
  return stats
}

export async function getListings(slug: string) {
  const { data } = await axios.get(`${API_URI}/v2/listings/collection/${slug}/all`)
  return data.listings
}

export async function getListingsFromContract(contract: string) {
  const { slug } = await getSingleContract(contract)
  const listings = await getListings(slug)
  return listings
}
