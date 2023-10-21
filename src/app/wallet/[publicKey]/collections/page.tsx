"use client"
import { Collection } from "@/components/Collection"
import { Items } from "@/components/Items"
import { useFiltered } from "@/context/filtered"
import { useOwnedAssets } from "@/context/owned-assets"
import { useSort } from "@/context/sort"

export default function Collections({ edit }: { edit: boolean }) {
  const { collections } = useOwnedAssets()
  const { filter } = useFiltered()
  const { doSort } = useSort()

  const filtered = doSort(filter(collections))

  return <Items items={filtered} Component={(props) => <Collection {...props} edit={edit} />} />
}
