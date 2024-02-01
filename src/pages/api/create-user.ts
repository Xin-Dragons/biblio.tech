import axios from "axios"
import { NextApiRequest, NextApiResponse } from "next"
import { createUser } from "../../helpers/supabase"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import base58 from "bs58"
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters"
import { Connection } from "@solana/web3.js"
import { SigninMessage } from "../../utils/SigninMessge"

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!)
const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { publicKey, usingLedger, rawTransaction, message, signature } = req.body

  async function validate() {
    if (usingLedger) {
      const txn = umi.transactions.deserialize(base58.decode(rawTransaction))
      const web3txn = toWeb3JsTransaction(txn)
      const confirm = await connection.simulateTransaction(web3txn)

      if (confirm.value.err) {
        throw new Error("Error signing in")
      }

      return true
    } else {
      const signinMessage = new SigninMessage(JSON.parse(message || "{}"))
      const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!)
      if (signinMessage.domain !== nextAuthUrl.host) {
        return null
      }

      const nonce = req.cookies.nonce

      console.log(signinMessage.nonce, nonce)
      if (signinMessage.nonce !== nonce) {
        return null
      }

      const validationResult = await signinMessage.validate(signature || "")

      if (!validationResult) throw new Error("Could not validate the signed message")

      return true
    }
  }

  try {
    const valid = await validate()
    if (valid) {
      const user = await createUser(publicKey)
      res.status(200).send(user)
    } else {
      throw new Error("Invalid")
    }
  } catch (err: any) {
    console.log(err)
    const message = err?.response?.data
    res.status(500).send({ message })
  }
}
