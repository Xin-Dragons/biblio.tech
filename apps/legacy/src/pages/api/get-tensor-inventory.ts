import { NextApiRequest, NextApiResponse } from "next"
import { getTensorInventory } from "../../helpers/tensor"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { publicKey } = req.body

    const tensorInventory = await getTensorInventory(publicKey)
    console.log({ tensorInventory })

    res.status(200).json({
      tensorInventory,
    })
  } catch (err: any) {
    console.log(err)
    res.status(500).send(err)
  }
}
