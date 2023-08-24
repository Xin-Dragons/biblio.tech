import { Layout } from "@/components/Layout"
import { useDatabase } from "@/context/database"
import { Items } from "@/components/Items"
import { useNfts } from "@/context/nfts"
import { VaultInfo } from "@/components/VaultInfo"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export default function Vault() {
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, "vault")
  }

  return (
    <Layout nfts={nfts} filtered={filtered} showUntagged title={<VaultInfo />}>
      <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
    </Layout>
  )
}
