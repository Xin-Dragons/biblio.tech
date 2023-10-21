"use client"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import useQueryParams from "@/hooks/use-query-params"
import { orderBy } from "lodash"
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useState } from "react"

const Context = createContext<
  | { sort: string; setSort: Dispatch<SetStateAction<string>>; type: string; direction: Direction; doSort: Function }
  | undefined
>(undefined)

type Direction = "asc" | "desc"

export function SortProvider({ children, defaultSort = "name.asc" }: { children: ReactNode; defaultSort?: string }) {
  const { queryParams, setQueryParams } = useQueryParams()
  const initialSort = queryParams.get("sort") || defaultSort
  const [sort, setSort] = useState(initialSort)
  const [type, setType] = useState<string>("")
  const [direction, setDirection] = useState<Direction>("asc")

  useEffect(() => {
    if (sort === defaultSort) {
      setQueryParams({ sort: undefined })
    } else {
      setQueryParams({ sort })
    }
  }, [sort])

  useEffect(() => {
    const [type, direction] = sort.split(".")
    setType(type)
    setDirection(direction as Direction)
  }, [sort])

  function doSort(input: DigitalAsset[]) {
    let sorted = [...input]
    if (type === "name") {
      sorted = orderBy(
        sorted,
        [
          (item) => (item.name || "").toLowerCase(),
          // (item) => {
          //   const name = (item.name || "").toLowerCase()
          //   return /\d/.test(name) ? Number(name.replace(/^\D+/g, "")) : name
          // },
        ],
        [direction]
      )
    } else if (type === "rankHrtt") {
      sorted = orderBy(
        sorted,
        (item) => {
          return 1 - (item.numMints || Infinity) / (item.rarity?.howRare || item.rarity?.moonRank || Infinity)
        },
        direction
      )
    }

    if (type === "price") {
      sorted = orderBy(sorted, (item) => item.listing?.price, direction)
    } else if (["blocktime", "listed"].includes(type)) {
      sorted = orderBy(sorted, (item) => item.listing?.blocktime, direction)
    } else if (type === "lastSale") {
      sorted = orderBy(sorted, (item) => Number(item.lastSale?.price) || 0, direction)
    } else if (type === "value") {
      sorted = orderBy(sorted, (item) => item.estimatedValue || 0, direction)
    } else if (type === "floor") {
      sorted = orderBy(sorted, (item) => item.floor || 0, direction)
    }

    return sorted
  }

  return <Context.Provider value={{ sort, setSort, type, direction, doSort }}>{children}</Context.Provider>
}

export const useSort = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useSort must be used in a SortProvider")
  }

  return context
}
