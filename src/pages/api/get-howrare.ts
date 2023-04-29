import axios from "axios";
import { flatten, sample } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";
import { getTier } from "./get-moonrank";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body;

  try {
    const mint = sample(mints)
    const response = await axios.get(`https://api.howrare.is/v0.1/find_collection_from_mint/${mint}`)
    const { data } = await axios.get(`https://api.howrare.is/v0.1/collections${response.data.result.data.url}`)

    const ranks = data.result.data.items.filter(item => mints.includes(item.mint)).map(item => {
      return {
        nftMint: item.mint,
        howRare: item.rank,
        howRareTier: getTier(item.rank, data.result.data.items.length)
      }
    })
    res.status(200).send(ranks)
  } catch (err: any) {
    console.log(err)
    res.status(500).send(err.response?.data)
  }
}