import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters"
import base58 from "bs58"
import { NextRequest, NextResponse } from "next/server"
import { SigninMessage } from "../../utils/SigninMessge"
import { NextApiRequest, NextApiResponse } from "next"
import { Connection } from "@solana/web3.js"
import axios, { AxiosError } from "axios"
import { addWalletToUser } from "../../helpers/supabase"

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, publicKey, signature, message, usingLedger, statement, nonce, rawTransaction } = req.body

  console.log(req.body)

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
      await addWalletToUser(id, publicKey, "solana")
      res.status(200).json({ ok: true })
    } else {
      throw new Error("Unauthorised")
    }
  } catch (err: any) {
    if (err instanceof AxiosError) {
      return res.status(500).send(err?.response?.data)
    }
    res.status(500).send(err.message || "Something went wrong")
  }
}
