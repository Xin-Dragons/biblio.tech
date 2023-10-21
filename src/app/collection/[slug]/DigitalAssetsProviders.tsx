import { FilteredProvider } from "@/context/filtered"
import { SortProvider } from "@/context/sort"
import { PropsWithChildren } from "react"

export function DigitalAssetsProviders({
  children,
  defaultSort,
  listing,
}: PropsWithChildren & { defaultSort?: string; listing?: boolean }) {
  return (
    <SortProvider defaultSort={defaultSort}>
      <FilteredProvider listing={listing}>{children}</FilteredProvider>
    </SortProvider>
  )
}
