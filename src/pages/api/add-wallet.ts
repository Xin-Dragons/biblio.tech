import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import base58 from "bs58";
import { NextRequest, NextResponse } from "next/server";
import { SigninMessage } from "../../utils/SigninMessge";
import { getCsrfToken } from "next-auth/react";
import { NextApiRequest, NextApiResponse } from "next";
import { Connection } from "@solana/web3.js";
import axios, { AxiosError } from "axios";

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!)

const umi = createUmi(process.env.NEXT_PUBLIC_RPC_HOST!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { basePublicKey, publicKey, signature, message, usingLedger, statement, nonce, rawTransaction } = req.body;

  async function validate() {
    if (usingLedger) {
      const txn = umi.transactions.deserialize(base58.decode(rawTransaction));
      const web3txn = toWeb3JsTransaction(txn);
      const confirm = await connection.simulateTransaction(web3txn);

      if (confirm.value.err) {
        throw new Error("Error signing in")
      }

      return true
    } else {
      const signinMessage = new SigninMessage(
        JSON.parse(message || "{}")
      );
      const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!);
      console.log(signinMessage.domain, nextAuthUrl.host)
      if (signinMessage.domain !== nextAuthUrl.host) {
        return null;
      }

      console.log(req.cookies["next-auth.csrf-token"]?.split("|")[0])
      // const csrfToken = req.cookies["next-auth.csrf-token"]?.split("|")[0]
      const csrfToken = await getCsrfToken({ req: { ...req, body: null } });
      console.log(csrfToken)
      console.log(signinMessage.nonce)
      if (signinMessage.nonce !== csrfToken) {
        return null;
      }

      const validationResult = await signinMessage.validate(signature || "");

      if (!validationResult)
        throw new Error("Could not validate the signed message");

      return true
    }
  }

  try {
    const valid = await validate()
    if (valid) {
      const headers = {
        authorization: `Bearer ${process.env.API_SECRET_KEY}`
      }
      const { data } = await axios.post(`${process.env.API_URL}/biblio/${basePublicKey}/add-wallet/${publicKey}`, { publicKey }, { headers })
      res.status(200).json({ok: true})
    } else {
      throw new Error("Unauthorised");
    }

  } catch (err: any) {
    if (err instanceof AxiosError) {
      console.log(err?.response?.data)
      return res.status(500).send(err?.response?.data)
    }
    res.status(500).send(err.message || "Something went wrong")
  }

  
}