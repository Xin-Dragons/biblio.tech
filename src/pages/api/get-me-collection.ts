import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { mint } = req.query;
  try {
    const { data } = await axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${mint}`)

    res.status(200).json(data);
  } catch (err) {
    res.status(500).send("Error calling Magic Eden API")
  }
}