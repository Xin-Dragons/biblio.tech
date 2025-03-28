import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { collection, creator, raw } = req.body

  try {
    const headers = {
      Authorization: `Bearer ${process.env.API_SECRET_KEY}`,
    }
    const { data } = await axios.post(
      `${process.env.API_URL}/info/lookup-collection`,
      { collection, creator, raw },
      { headers }
    )
    res.status(200).json(data)
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data
    res.status(500).json({ message })
  }
}
