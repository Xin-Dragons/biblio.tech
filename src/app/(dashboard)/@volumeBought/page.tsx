import { getWallets } from "@/helpers/hyperspace"
import { Client } from "./Client"

// 5 mins
export const revalidate = 60 * 5

export default async function Page() {
  const wallets = await getWallets()

  return <Client wallets={wallets} />
}
