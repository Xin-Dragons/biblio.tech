import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'
import { SiweMessage } from 'siwe'
 
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req
  switch (method) {
    case 'POST':
      try {
        const { message, signature, basePublicKey } = req.body
        const siweMessage = new SiweMessage(message)
        const fields = await siweMessage.validate(signature)

        const key = process.env.NODE_ENV === "development"
        ? "next-auth.csrf-token"
        : "__Host-next-auth.csrf-token"

        const nonce = req.cookies[key]?.split("|")[0] 
 
        if (fields.nonce !== nonce) {
          return res.status(422).json({ message: 'Invalid nonce.' })
        }

        const headers = {
          authorization: `Bearer ${process.env.API_SECRET_KEY}`
        }
        const { data } = await axios.post(`${process.env.API_URL}/biblio/${basePublicKey}/add-wallet/${fields.address}`, { chain: "eth" }, { headers })
        res.status(200).json({ok: true})
 
      } catch (err: any) {
        res.status(500).send(err?.response?.data)
      }
      break
    default:
      res.setHeader('Allow', ['POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}
 
export default handler;

