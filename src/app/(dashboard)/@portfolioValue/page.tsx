import { getWallets } from "@/helpers/hyperspace"
import { Client } from "./Client"

// 1hr
export const revalidate = 60 * 60

export default async function BiggestChads() {
  const wallets = await getWallets("portfolio_value", "ALL")
  return <Client wallets={wallets} />
}
