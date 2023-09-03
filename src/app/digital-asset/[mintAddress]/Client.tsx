"use client"

import { ActivityLog } from "@/components/ActivityLog"
import { NftSale } from "@/components/NftSale"

function Row({ sale, ...props }: { sale: any }) {
  return <NftSale {...props} sale={sale} />
}

export function Client({ activity }) {
  return <ActivityLog activity={activity} Row={Row} />
}
