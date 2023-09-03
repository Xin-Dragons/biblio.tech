import { DigitalAssetsProvider } from "@/context/digital-assets"
import { FilteredProvider } from "@/context/filtered"
import { FiltersProvider } from "@/context/filters"
import { ListingsProvider } from "@/context/listings"
import { RarityProvider } from "@/context/rarity"
import { SortProvider } from "@/context/sort"
import { PropsWithChildren } from "react"

export function DigitalAssetsProviders({
  children,
  defaultSort,
  listing,
}: PropsWithChildren & { collectionId?: string; defaultSort?: string; listing?: boolean }) {
  return (
    <SortProvider defaultSort={defaultSort}>
      <RarityProvider>
        <FilteredProvider listing={listing}>{children}</FilteredProvider>
      </RarityProvider>
    </SortProvider>
  )
}
