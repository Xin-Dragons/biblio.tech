"use client"
import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export function Tabs() {
  const { publicKey } = useParams()
  const path = usePathname()
  let activeTab = path.split("/").pop()

  let basePath = "/wallet"

  if (publicKey) {
    basePath = `${basePath}/${publicKey}`
  }

  if (!["all", "collections", "activity"].includes(activeTab as string)) {
    activeTab = "all"
  }

  return (
    <MuiTabs value={activeTab}>
      <Tab LinkComponent={Link} label="All" value="all" href={`${basePath}`} />
      <Tab LinkComponent={Link} label="Collections" value="collections" href={`${basePath}/collections`} />
      <Tab LinkComponent={Link} label="Activity" value="activity" href={`${basePath}/activity`} />
    </MuiTabs>
  )
}
