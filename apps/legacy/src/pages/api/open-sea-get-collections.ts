import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {

    const { address } = req.query;
  
    const { data } = await axios.get(`https://api.opensea.io/api/v1/collections?asset_owner=${address}&limit=${300}`, {
      headers: {
        "X-API-KEY": process.env.OPEN_SEA_API_KEY
      }
    })
  
    res.status(200).json(data)
  } catch (err: any) {
    console.log(err.response.data)
  }
}