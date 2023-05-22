import axios from "axios";
import { flatten, groupBy, map, sample, size } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";
import { getTier } from "./get-moonrank";

async function getRarity(mints: string[]) {
  try {
    const mint = sample(mints)
    const response = await axios.get(`https://api.howrare.is/v0.1/find_collection_from_mint/${mint}`)
    const { data } = await axios.get(`https://api.howrare.is/v0.1/collections${response.data.result.data.url}/only_rarity`)
  
    const ranks = data.result.data.items.filter((item: any) => mints.includes(item.mint)).map((item: any) => {
      return {
        nftMint: item.mint,
        howRare: item.rank,
        howRareTier: getTier(item.rank, data.result.data.items.length)
      }
    })
    return ranks;
  } catch (err) {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body;

  try {
    const groups = groupBy(mints, 'collectionIdentifier');
    
    const all = flatten(
      await Promise.all(
        map(
          groups, 
          item => getRarity(
            item.map(i => i.nftMint)
          )
        )
      )
    ).filter(Boolean)
    
    res.status(200).send(all)
  } catch (err: any) {
    console.log(err)
    res.status(500).send(err.response?.data)
  }
}