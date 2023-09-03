"use client"
import { ActivityLog } from "@/components/ActivityLog"
import { NftSale } from "@/components/NftSale"
import { useActivity } from "@/context/activity"

function Row({ sale, ...props }: { sale: any }) {
  return <NftSale {...props} sale={sale} showItem />
}

export function Client() {
  const { filtered } = useActivity()
  return <ActivityLog activity={filtered} Row={Row} />
}
