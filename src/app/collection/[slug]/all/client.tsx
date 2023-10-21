"use client"
import { DigitalAsset as DigitalAssetType } from "@/app/models/DigitalAsset"
import { DigitalAsset } from "@/components/DigitalAsset"
import { Items } from "@/components/Items"
import { useDigitalAssets } from "@/context/digital-assets"
import { useFiltered } from "@/context/filtered"
import { useSort } from "@/context/sort"
import { Collection } from "@/types/database"

export function Client({ digitalAssets, collection }: { digitalAssets: DigitalAssetType[]; collection: Collection }) {
  const { filter } = useFiltered()
  const { doSort } = useSort()

  return (
    <Items
      items={doSort(filter(digitalAssets))}
      Component={(props) => <DigitalAsset {...props} numMints={collection.num_mints} />}
    />
  )
}
