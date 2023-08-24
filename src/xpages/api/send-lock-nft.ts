import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKey, mint, rawTransaction } = req.body;

  try {
    const headers = {
      'Authorization': `Bearer ${process.env.API_SECRET_KEY}`
    }

    const params = {
      mint,
      rawTransaction
    }

    const response = await axios.post(`${process.env.API_URL}/biblio/${publicKey}/send-lock`, params, { headers });
    res.status(200).send(response.data)
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data;
    res.status(500).send({ message });
  }
}