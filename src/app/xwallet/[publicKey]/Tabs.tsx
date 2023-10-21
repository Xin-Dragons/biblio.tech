"use client"
import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export function Tabs() {
  const params = useParams()
  const path = usePathname()
  let activeTab
  if (path.includes("/assets")) {
    activeTab = "assets"
  } else if (path.includes("/collections")) {
    activeTab = "collections"
  } else if (path.includes("activity")) {
    activeTab = "activity"
  }

  const basePath = `/wallet/${params.publicKey}`

  return (
    <MuiTabs value={activeTab}>
      <Tab LinkComponent={Link} label="Assets" value="assets" href={`${basePath}/assets`} />
      <Tab LinkComponent={Link} label="Collections" value="collections" href={`${basePath}/collections`} />
      <Tab LinkComponent={Link} label="Activity" value="activity" href={`${basePath}/activity`} />
    </MuiTabs>
  )
}
