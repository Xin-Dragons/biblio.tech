"use client"
import { useDatabase } from "@/context/database"
import { Items } from "@/components/Items"
import { useNfts } from "@/context/nfts"
import { ActionBar } from "@/components/ActionBar"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

export default function Filter({ params }: { params: Record<string, string> }) {
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, params.filter)
  }

  return <Items items={filtered} updateOrder={handleUpdateOrder} sortable />
}
