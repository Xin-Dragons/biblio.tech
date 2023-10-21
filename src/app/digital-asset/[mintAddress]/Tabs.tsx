"use client"
import { Tabs as MuiTabs, Tab } from "@mui/material"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

export function Tabs({ isCompressed }: { isCompressed?: boolean }) {
  const path = usePathname()
  const { mintAddress } = useParams()
  let tab = path.replace(`/digital-asset/${mintAddress}`, "") || "overview"
  tab = tab.replace("/", "")

  return (
    <MuiTabs value={tab}>
      <Tab value="overview" label="Overview" href={`/digital-asset/${mintAddress}/overview`} LinkComponent={Link} />
      {isCompressed ? (
        <Tab
          value="compression"
          label="Compression details"
          href={`/digital-asset/${mintAddress}/details`}
          LinkComponent={Link}
        />
      ) : (
        <Tab value="details" label="Onchain data" href={`/digital-asset/${mintAddress}/details`} LinkComponent={Link} />
      )}
      <Tab value="media" label="Media" href={`/digital-asset/${mintAddress}/media`} LinkComponent={Link} />
      <Tab value="das" label="DAS" href={`/digital-asset/${mintAddress}/das`} LinkComponent={Link} />

      <Tab value="json" label="JSON metadata" href={`/digital-asset/${mintAddress}/json`} LinkComponent={Link} />
      {!isCompressed && [
        <Tab value="sales" label="Sales" href={`/digital-asset/${mintAddress}/sales`} LinkComponent={Link} key={0} />,
        <Tab
          key={1}
          value="royalties"
          label="Royalties"
          href={`/digital-asset/${mintAddress}/royalties`}
          LinkComponent={Link}
        />,
      ]}
    </MuiTabs>
  )
}
