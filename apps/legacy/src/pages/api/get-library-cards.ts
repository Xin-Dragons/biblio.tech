import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKey } = req.query;

  try {
    const options = {
      headers: {
        'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
      }
    }

    const { data } = await axios.get(`${process.env.API_URL}/biblio/${publicKey}/eligible-nfts`, options);
    res.status(200).json(data)
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data;
    res.status(500).send({ message });
  }
}