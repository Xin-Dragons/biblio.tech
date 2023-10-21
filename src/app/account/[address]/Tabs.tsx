"use client"

import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export function Tabs({ hasParsed = true }: { hasParsed?: boolean }) {
  const params = useParams()
  const pathname = usePathname()
  const path = `/account/${params.address}`

  let tab = pathname.replace(path, "").replace("/", "")
  if (!tab) {
    tab = "txs"
  }

  return (
    <MuiTabs value={tab}>
      <Tab value="txs" label="Transactions" LinkComponent={Link} href={`${path}/txs`} />
      {hasParsed && <Tab value="info" label="Account info" LinkComponent={Link} href={`${path}/info`} />}

      <Tab value="raw" label="Raw account data" LinkComponent={Link} href={`${path}/raw`} />
    </MuiTabs>
  )
}
