import { Connection } from "@solana/web3.js"
import * as helius from "helius-sdk"
import { flatten } from "lodash"

const client = new helius.RpcClient(
  new Connection(process.env.NEXT_PUBLIC_RPC_HOST!),
  process.env.NEXT_PUBLIC_HELIUS_API_KEY
)
