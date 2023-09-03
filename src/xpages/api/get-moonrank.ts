import axios from "axios"
import { flatten, groupBy, map, sample } from "lodash"
import { NextApiRequest, NextApiResponse } from "next"

async function getRarity(mints: string[]) {
  try {
    const mint = sample(mints)
    const response = await axios.get(`https://moonrank.app/${mint}`)
    const collectionName = response.request.path.replace("/collection/", "").replace(`/${mint}`, "")
    const { data } = await axios.get(`https://moonrank.app/mints/${collectionName}`)
    const ranks = data.mints
      .filter((item: any) => mints.includes(item.mint))
      .map((item: any) => {
        return {
          nftMint: item.mint,
          moonRank: item.rank,
          moonRankTier: getTier(item.rank, data.mints.length),
        }
      }, {})
    return ranks
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body

  try {
    const groups = groupBy(mints, (item) => item.collectionIdentifier)

    const all = flatten(await Promise.all(map(groups, (group) => getRarity(group.map((g) => g.nftMint))))).filter(
      Boolean
    )

    res.status(200).json(all)
  } catch (err: any) {
    console.log(err)
    res.status(500).send(err.response?.data)
  }
}
