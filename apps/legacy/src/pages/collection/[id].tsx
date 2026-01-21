import { useRouter } from "next/router"
import { Layout } from "../../components/Layout"
import { useDatabase } from "../../context/database"
import { useNfts } from "../../context/nfts"
import { Items } from "../../components/Items"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

const Collection = () => {
  const router = useRouter()
  const { id } = router.query
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

export default Collection
