/**
 * Token Service
 * Uses Helius RPC with @solana/kit for fetching SPL tokens
 */

import { getRpc, type SolanaClient } from "../lib/solana-client"
import type { Env } from "../types"

function getClient(env: Env): SolanaClient {
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`
  return getRpc(rpcUrl)
}

export type TokenInfo = {
  mint: string
  name: string
  symbol: string
  image: string
  balance: string
  decimals: number
  uiBalance: number
}

export async function getTokensByOwner(env: Env, wallet: string): Promise<TokenInfo[]> {
  const rpc = getClient(env)
  const allTokens: TokenInfo[] = []

  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await rpc
      .getAssetsByOwner({
        ownerAddress: wallet,
        page,
        limit: 1000,
        displayOptions: {
          showCollectionMetadata: false,
          showFungible: true,
          showNativeBalance: false,
        },
      })
      .send()

    for (const item of response.items) {
      if (item.interface !== "FungibleToken" && item.interface !== "FungibleAsset") {
        continue
      }

      const balance = String(item.token_info?.balance ?? "0")
      const decimals = item.token_info?.decimals ?? 0
      const uiBalance = Number(balance) / Math.pow(10, decimals)

      if (uiBalance === 0) continue

      const token: TokenInfo = {
        mint: item.id,
        name: item.content?.metadata?.name ?? "",
        symbol: item.token_info?.symbol ?? item.content?.metadata?.symbol ?? "",
        image: item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? "",
        balance,
        decimals,
        uiBalance,
      }

      allTokens.push(token)
    }

    hasMore = response.items.length === 1000
    page++

    if (page > 5) break
  }

  return allTokens.sort((a, b) => b.uiBalance - a.uiBalance)
}
