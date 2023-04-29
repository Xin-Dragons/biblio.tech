import axios from "axios";
import { flatten, sample } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";

export function getTier(rank: number, total: number) {
  const percent = Math.ceil(rank / total * 100)
  if (percent === 1) {
    return 'Mythic';
  }

  if (percent <= 5) {
    return 'Legendary'
  }

  if (percent <= 15) {
    return 'Epic'
  }

  if (percent <= 35) {
    return 'Rare';
  }

  if (percent <= 60) {
    return 'Uncommon'
  }

  return 'Common'

}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body;

  try {
    const mint = sample(mints)
    const response = await axios.get(`https://moonrank.app/${mint}`);
    const collectionName = response.request.path.replace('/collection/', '').replace(`/${mint}`, '')
    const { data } = await axios.get(`https://moonrank.app/mints/${collectionName}`)
    const ranks = data.mints.filter(item => mints.includes(item.mint)).map((item) => {
      return {
        nftMint: item.mint,
        moonRank: item.rank,
        moonRankTier: getTier(item.rank, data.mints.length)
      }
    }, {})

    res.status(200).json(ranks)
  } catch (err: any) {
    console.log(err)
    res.status(500).send(err.response?.data)
  }
}