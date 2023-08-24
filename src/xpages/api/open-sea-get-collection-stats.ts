import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  minTime: 500
})

async function getStats(slug: string) {
  const { data } = await axios.get(`https://api.opensea.io/api/v1/collection/${slug}/stats`, {
    headers: {
      "X-API-KEY": process.env.OPEN_SEA_API_KEY
    }
  })

  return {
    slug,
    ...data.stats
  }
}

const wrapped = limiter.wrap(getStats)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {

    const { slugs } = req.body;

    const result = await Promise.all(slugs.map(wrapped))

    res.status(200).json(result)
  } catch (err: any) {
    console.log("ERR",err.response?.data)
    res.status(500).send(err.response?.data)
  }
}