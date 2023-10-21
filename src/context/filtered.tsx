"use client"
import { PropsWithChildren, createContext, useContext, useEffect } from "react"
import { useFilters } from "./filters"
import { size } from "lodash"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { Listing } from "@/app/models/Listing"
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { useUiSettings } from "./ui-settings"
import { useSearchParams } from "next/navigation"

const Context = createContext<{ filter: Function } | undefined>(undefined)

export function FilteredProvider({ children, listing }: PropsWithChildren & { listing?: boolean }) {
  const { selectedFilters, search, tokenStandards, status, selectedCollections } = useFilters()
  const { includeUnverified } = useUiSettings()

  function filter(items: DigitalAsset[]) {
    let filtered = items.filter((item) => {
      return (
        !size(selectedFilters) ||
        Object.keys(selectedFilters).every((key) => {
          const vals = selectedFilters[key]
          return (
            !vals.length ||
            vals.includes((item.attributes || []).filter(Boolean).find((att) => att.trait_type === key)?.value)
          )
        })
      )
    })

    if (tokenStandards.length) {
      filtered = filtered.filter((item) => tokenStandards.includes(item.tokenStandard || 0))
    }

    if (status.length) {
      filtered = filtered.filter((item) => status.includes(item.status || ""))
    }

    if (selectedCollections.length) {
      filtered = filtered.filter((item) => selectedCollections.includes(item.collectionId || ""))
    }

    if (!includeUnverified) {
      filtered = filtered.filter((item) => item.verified || item.tensorVerified)
    }

    if (search) {
      const s = search.toLowerCase()

      filtered = filtered.filter((nft) => {
        let name = nft.name || ""
        if (typeof name !== "string") {
          name = `${name}`
        }
        const symbol = nft.symbol || ""
        const attributes = (nft.attributes || []).filter(Boolean)

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
          symbol.toLowerCase().includes(s) ||
          values.some((val: any) => val.includes(s))
        )
      })
    }

    return filtered
  }

  return <Context.Provider value={{ filter }}>{children}</Context.Provider>
}

export const useFiltered = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useFiltered must be used in a FilteredProvider")
  }

  return context
}
