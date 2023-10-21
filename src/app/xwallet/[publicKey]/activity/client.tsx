"use client"
import { ActivityLog } from "@/components/ActivityLog"
import { NftSale } from "@/components/NftSale"

function Row({ sale, ...props }: { sale: any }) {
  return <NftSale {...props} sale={sale} showType showItem />
}

export function Client() {
  const filtered: any[] = []
  return <ActivityLog activity={filtered} Row={Row} />
}
