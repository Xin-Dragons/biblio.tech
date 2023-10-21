import DigitalAssetLayout from "@/app/digital-asset/[mintAddress]/layout"
import DigitalAsset from "@/app/digital-asset/[mintAddress]/page"
import { Client } from "./client"
import { Card } from "@mui/material"

export default function Layout({ params }: { params: Record<string, string> }) {
  return (
    <Client>
      <Card>
        <DigitalAssetLayout params={params} noNavigation>
          <DigitalAsset params={params} />
        </DigitalAssetLayout>
      </Card>
    </Client>
  )
}
