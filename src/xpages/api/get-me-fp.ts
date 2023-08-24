import axios from "axios";
import { groupBy, keyBy } from "lodash";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mints } = req.body;
  try {

    const grouped = groupBy(mints, item => item.collectionId);

    const results = await Promise.all(Object.keys(grouped).map(async collectionId => {
      const mint = grouped[collectionId][0].mint

      const { data } = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${mint}`)

      const collectionData = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${data.collection}/stats`)

      return {
        ...collectionData.data,
        collectionId
      }
    }))
  
    res.status(200).json(keyBy(results, item => item.collectionId))

  } catch (err: any) {
    res.status(500).send(err?.response.data || err.message || "Something went wrong")
  }
}