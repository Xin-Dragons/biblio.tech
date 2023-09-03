import { DigitalAssetView } from "./DigitalAsset"

export default async function DigitalAssetPage({ params }: { params: Record<string, string> }) {
  return <DigitalAssetView mintAddress={params.mintAddress} />
}
