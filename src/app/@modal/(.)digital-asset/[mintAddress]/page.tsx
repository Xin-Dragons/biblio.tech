import { DigitalAssetView } from "@/app/digital-asset/[mintAddress]/DigitalAsset"
import { Client } from "./client"

export default function Page({ params }: { params: Record<string, string> }) {
  return (
    <Client>
      <DigitalAssetView mintAddress={params.mintAddress} />
    </Client>
  )
}
