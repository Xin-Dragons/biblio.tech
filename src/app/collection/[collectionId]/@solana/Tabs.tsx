"use client"
import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export function Tabs() {
  const { collectionId } = useParams()
  const path = usePathname()
  let activeTab = path.split("/").pop()

  const basePath = `/collection/${collectionId}`

  if (!["all", "listings", "activity"].includes(activeTab as string)) {
    activeTab = "listings"
  }

  return (
    <MuiTabs value={activeTab}>
      <Tab LinkComponent={Link} label="Listings" value="listings" href={`${basePath}/listings`} />
      <Tab LinkComponent={Link} label="Collection" value="all" href={`${basePath}/all`} />
      <Tab LinkComponent={Link} label="Activity" value="activity" href={`${basePath}/activity`} />
    </MuiTabs>
  )
}
