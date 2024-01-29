import { Connection } from "@solana/web3.js"
import * as helius from "helius-sdk"
import { flatten } from "lodash"

const client = new helius.RpcClient(
  new Connection(process.env.NEXT_PUBLIC_RPC_HOST!),
  process.env.NEXT_PUBLIC_HELIUS_API_KEY
)

async function getDandiesForWallet(ownerAddress: string) {
  const dandies = await client.searchAssets({
    ownerAddress,
    grouping: ["collection", process.env.NEXT_PUBLIC_COLLECTION_ID!],
    page: 1,
    limit: 1000,
  })
  return dandies
}

export async function getDandies(wallets: string[]) {
  const dandies = flatten(await Promise.all(wallets.map((wallet) => getDandiesForWallet(wallet))))
  return dandies
}
