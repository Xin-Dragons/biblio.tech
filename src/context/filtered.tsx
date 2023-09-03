"use client"
import { PropsWithChildren, createContext, useContext } from "react"
import { useDigitalAssets } from "./digital-assets"
import { useListings } from "./listings"
import { useRarity } from "./rarity"
import { useFilters } from "./filters"
import { useSort } from "./sort"
import { orderBy, size } from "lodash"
import { useParams } from "next/navigation"

const Context = createContext<any[] | undefined>(undefined)

export function FilteredProvider({ children, listing }: PropsWithChildren & { listing?: boolean }) {
  const params = useParams()
  const { digitalAssets } = useDigitalAssets()
  const { listings } = useListings()
  const { howRare } = useRarity()
  const { selectedFilters, search } = useFilters()
  const { type, direction } = useSort()

  let filtered = digitalAssets

  if (params.publicKey) {
    filtered = filtered.filter((item) => item.owner === params.publicKey)
  }

  if (params.collectionId) {
    filtered = filtered.filter(
      (item) =>
        params.collectionId === item.collectionId || item.grouping.find((g) => g.group_value === params.collectionId)
    )
  }

  filtered = filtered
    .map((da) => {
      const listing = listings.find((l) => l.nftMint === da.id)
      const rarity = howRare.find((h) => h.mint === da.id)
      return {
        ...da,
        listing,
        rarity,
      }
    })
    .filter((item) => !listing || item.listing)

  filtered = filtered.filter((item) => {
    return (
      !size(selectedFilters) ||
      Object.keys(selectedFilters).every((key) => {
        const vals = selectedFilters[key]
        return (
          !vals.length ||
          vals.includes(
            (item.content.metadata.attributes || []).filter(Boolean).find((att) => att.trait_type === key)?.value
          )
        )
      })
    )
  })

  if (search) {
    const s = search.toLowerCase()

    filtered = filtered.filter((nft) => {
      let name = nft.content.metadata.name || ""
      if (typeof name !== "string") {
        name = `${name}`
      }
      const symbol = nft.content.metadata.symbol || ""
      const description = nft.content.metadata.description || ""
      const attributes = (nft.content.metadata.attributes || []).filter(Boolean)

      if (s.includes("traits:")) {
        const num = parseInt(s.split(":")[1])
        if (num) {
          return (
            attributes
              .filter(Boolean)
              .filter((att) => att.value !== "none" && att.value !== "None" && att.value !== "NONE").length === num
          )
        }
      }

      if (s.includes(":")) {
        const [trait_type, value] = s.split(":").map((item) => item.trim().toLocaleLowerCase())
        if (trait_type && value) {
          return (
            attributes
              .filter(Boolean)
              .find((att) => att.trait_type?.toLowerCase() === trait_type)
              ?.value?.toLowerCase() === value
          )
        }
      }

      const values = (attributes || []).filter(Boolean).map((att: any) => `${att.value || ""}`.toLowerCase())
      return (
        nft.id === search ||
        name.toLowerCase().includes(s) ||
        description.toLowerCase().includes(s) ||
        symbol.toLowerCase().includes(s) ||
        values.some((val: any) => val.includes(s))
      )
    })
  }

  if (type === "name") {
    filtered = orderBy(
      filtered,
      [
        (item) => (item.content.metadata.name || "").toLowerCase(),
        (item) => {
          const name = (item.content.metadata.name || "").toLowerCase()
          return /\d/.test(name) ? Number(name.replace(/^\D+/g, "")) : name
        },
      ],
      [direction, direction]
    )
  }

  if (type === "rarity") {
    filtered = orderBy(filtered, (item) => howRare.find((r) => r.mint === item.id)?.rank, direction)
  }

  if (type === "price") {
    filtered = orderBy(filtered, (item) => item.listing?.price, direction)
  }

  return <Context.Provider value={filtered}>{children}</Context.Provider>
}

export const useFiltered = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useFiltered must be used in a FilteredProvider")
  }

  return context
}
