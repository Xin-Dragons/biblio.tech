"use client"
import { Items } from "@/components/Items"
import { useDigitalAssets } from "@/context/digital-assets"
import { DigitalAsset } from "@/components/DigitalAsset"

export default function wallet({ params }: { params: Record<string, string> }) {
  const { digitalAssets } = useDigitalAssets()
  return <Items items={digitalAssets} Component={DigitalAsset} />
}
