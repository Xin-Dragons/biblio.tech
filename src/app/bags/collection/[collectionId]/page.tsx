"use client"
import { Layout } from "@/components/Layout"
import { useDatabase } from "@/context/database"
import { Items } from "@/components/Items"
import { useNfts } from "@/context/nfts"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export default function Collection({ params }: { params: Record<string, string> }) {
  const { updateOrder, collections } = useDatabase()
  const { nfts, filtered } = useNfts()

  const collection = collections.find((c) => c.id === params.collectionId)

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, params.collectionId)
  }

  return <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
}
