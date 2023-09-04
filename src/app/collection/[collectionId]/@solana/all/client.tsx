"use client"
import { DigitalAsset } from "@/components/DigitalAsset"
import { Items } from "@/components/Items"
import { useFiltered } from "@/context/filtered"

export function Client() {
  const filtered = useFiltered()
  console.log({ filtered })

  return <Items items={filtered} Component={DigitalAsset} />
}
