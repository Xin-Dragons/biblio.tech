import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"
import { getUser } from "../../helpers/supabase"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKey } = req.query

  try {
    const user = await getUser(publicKey as string)
    console.log(user)
    res.status(200).send(user)
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data
    res.status(500).send({ message })
  }
}
