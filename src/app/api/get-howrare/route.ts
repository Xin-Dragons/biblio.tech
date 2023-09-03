import { getTier } from "@/helpers/rarity"
import axios from "axios"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { mint } = await req.json()
    const response = await axios.get(`https://api.howrare.is/v0.1/find_collection_from_mint/${mint}`)
    const { data } = await axios.get(
      `https://api.howrare.is/v0.1/collections${response.data.result.data.url}/only_rarity`
    )

    const ranks = data.result.data.items.map((item: any) => {
      return {
        mint: item.mint,
        rank: item.rank,
        tier: getTier(item.rank, data.result.data.items.length),
      }
    })

    return NextResponse.json(ranks)
  } catch (err) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    })
  }
}
