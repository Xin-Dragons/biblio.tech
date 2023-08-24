"use client"
import { DigitalAsset } from "@/components/DigitalAsset"
import { Items } from "@/components/Items"
import { useDigitalAssets } from "@/context/digital-assets"

export default function Listings() {
  const { filtered } = useDigitalAssets()
  return <Items items={filtered} Component={DigitalAsset} />
}
