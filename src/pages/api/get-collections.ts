import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKeys } = req.body;

  try {
    const headers = {
      'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
    }

    const { data } = await axios.post(`${process.env.API_URL}/info/lookup-collections`, { publicKeys }, { headers })
    res.status(200).json(data)
  } catch (err: any) {
    res.status(500).send(err.message);
  }

}