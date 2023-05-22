import { NextPage } from "next"
import { Layout } from "../components/Layout"
import { useDatabase } from "../context/database"
import { Items } from "../components/Items"
import { useNfts } from "../context/nfts"
import { useRouter } from "next/router"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export const Filter: NextPage = () => {
  const router = useRouter()
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, router.query.filter || router.query.tag || router.query.collectionId)
  }

  return (
    <Layout nfts={nfts} filtered={filtered} showUntagged>
      <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
    </Layout>
  )
}

export default Filter
