"use client"
import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Tabs() {
  const path = usePathname()
  let activeTab = path.split("/").pop()

  const basePath = path.replace("/all", "").replace("/listings", "")

  if (!["all", "listings"].includes(activeTab as string)) {
    activeTab = "listings"
  }

  return (
    <MuiTabs value={activeTab}>
      <Tab LinkComponent={Link} label="Listings" value="listings" href={`${basePath}/listings`} />
      <Tab LinkComponent={Link} label="All" value="all" href={`${basePath}/all`} />
    </MuiTabs>
  )
}
