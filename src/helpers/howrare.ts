"use server"

import axios from "axios"

export async function getHowrareFromMint(mint: string) {
  try {
    const response = await axios.get(`https://api.howrare.is/v0.1/find_collection_from_mint/${mint}`)
    const { data } = await axios.get(
      `https://api.howrare.is/v0.1/collections${response.data.result.data.url}/only_rarity`
    )

    return data.result.data.items.map((item: any) => {
      return {
        mint: item.mint,
        rank: item.rank,
      }
    })
  } catch {
    return []
  }
}
