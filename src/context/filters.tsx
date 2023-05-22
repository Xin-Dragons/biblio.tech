import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { isArray, mergeWith, noop, uniq } from "lodash"
import { usePrevious } from "../hooks/use-previous"
import { useRouter } from "next/router"
import { useUiSettings } from "./ui-settings"

type Sort = {
  label: string
  value: SortType
}

type FiltersContextProps = {
  selectedFilters: any
  setSelectedFilters: Function
  search?: string
  setSearch: Function
  sortOptions: Sort[]
}

const initial = {
  selectedFilters: [],
  setSelectedFilters: noop,
  search: "",
  setSearch: noop,
  sortOptions: [],
}

export const FiltersContext = createContext<FiltersContextProps>(initial)

const allOptions = {
  expiring: {
    label: "Expiring",
    value: "expiring",
  },
  outstanding: {
    label: "Outstanding amount",
    value: "ourstanding",
  },
  custom: {
    label: "Custom",
    value: "custom",
  },
  name: {
    label: "Name",
    value: "name",
  },
  howRare: {
    label: "How Rare",
    value: "howRare",
  },
  moonRank: {
    label: "Moon Rank",
    value: "moonRank",
  },
  balance: {
    label: "Balance",
    value: "balance",
  },
  value: {
    label: "Value",
    value: "value",
  },
  creator: {
    label: "Creator",
    value: "creator",
  },
  holdings: {
    label: "Holdings",
    value: "holdings",
  },
}

const sortOptionsConfig = {
  loans: ["expiring", "outstanding", "name"],
  nonFungible: ["custom", "name", "howRare", "moonRank"],
  fungible: ["custom", "balance", "name"],
  editions: ["custom", "name", "creator"],
  collections: ["value", "name", "holdings"],
}

type FiltersProviderProps = {
  children: ReactNode
}

type Type = "loans" | "fungible" | "editions" | "collections" | "nonFungible"
type SortType =
  | "expiring"
  | "outstanding"
  | "name"
  | "custom"
  | "howRare"
  | "moonRank"
  | "balance"
  | "value"
  | "holdings"

export const FiltersProvider: FC<FiltersProviderProps> = ({ children }) => {
  const [selectedFilters, setSelectedFilters] = useState({})
  const [search, setSearch] = useState("")
  const [sortOptions, setSortOptions] = useState<Sort[]>([])
  const { sort, setSort } = useUiSettings()
  const router = useRouter()

  useEffect(() => {
    let type: Type
    const filter = router.query.filter as string
    const isCollectionsIndex = !router.query.filter && !router.query.tag && !router.query.collectionId
    if (filter === "loans") {
      type = "loans"
    } else if (["sft", "spl"].includes(filter)) {
      type = "fungible"
    } else if (filter === "editions") {
      type = "editions"
    } else if (isCollectionsIndex) {
      type = "collections"
    } else {
      type = "nonFungible"
    }
    const options = sortOptionsConfig[type]
    setSortOptions(options.map((opt) => allOptions[opt as keyof object]))
  }, [router.query])

  useEffect(() => {
    if (!sortOptions.length) return
    if (!sortOptions.find((s) => s.value === sort)) {
      setSort(sortOptions[0].value)
    }
  }, [sortOptions, sort])

  return (
    <FiltersContext.Provider value={{ selectedFilters, setSelectedFilters, search, setSearch, sortOptions }}>
      {children}
    </FiltersContext.Provider>
  )
}

export const useFilters = () => {
  return useContext(FiltersContext)
}
