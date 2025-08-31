import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"
import { getUser } from "../../helpers/supabase"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKey } = req.body

  try {
    // const user = await getUser(publicKey as string)

    res.status(200).send({})
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data
    res.status(500).send({ message })
  }
}
