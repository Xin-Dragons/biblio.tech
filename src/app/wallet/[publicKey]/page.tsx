"use client"
import { Items } from "@/components/Items"
import { useDigitalAssets } from "@/context/digital-assets"
import { DigitalAsset } from "@/components/DigitalAsset"

export default function wallet({ params }: { params: Record<string, string> }) {
  const { filtered } = useDigitalAssets()
  return (
    <Items
      items={filtered.sort((a, b) => a.content.metadata.name.localeCompare(b.content.metadata.name))}
      Component={DigitalAsset}
    />
  )
}
