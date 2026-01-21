import { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"

// Server-side only - secure RPC URL (not exposed to client)
const HELIUS_RPC_URL = process.env.HELIUS_API_KEY!

async function rpcCall<T>(method: string, params: any): Promise<T> {
  const { data } = await axios.post(HELIUS_RPC_URL, {
    jsonrpc: "2.0",
    id: "1",
    method,
    params,
  })

  if (data.error) {
    throw new Error(data.error.message || "RPC Error")
  }

  return data.result
}

const allowedMethods = [
  "getAssetsByGroup",
  "getAssetsByCreator",
  "getAssetsByOwner",
  "searchAssets",
  "getAssetBatch",
  "getAsset",
  "getAssetProof",
  "getPriorityFeeEstimate",
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { method } = req.query
  const params = req.body

  if (typeof method !== "string" || !allowedMethods.includes(method)) {
    return res.status(400).json({ error: "Invalid method" })
  }

  try {
    const result = await rpcCall(method, params)
    res.status(200).json(result)
  } catch (err: any) {
    console.error(`Helius RPC error (${method}):`, err.message)
    res.status(500).json({ error: err.message || "RPC Error" })
  }
}
