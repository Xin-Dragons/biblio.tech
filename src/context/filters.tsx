import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { isArray, mergeWith, noop, uniq } from "lodash"
import { usePrevious } from "../hooks/use-previous"
import { useRouter } from "next/router"
import { useUiSettings } from "./ui-settings"
import { useAccess } from "./access"

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
  showLoans: boolean
  setShowLoans: Function
  showUntagged: boolean
  setShowUntagged: Function
  showStarred: boolean
  setShowStarred: Function
  clearFilters: Function
  filtersActive: boolean
  selectTag: Function
  deselectTag: Function
  selectedTags: string[]
  clearSelectedTags: Function
}

const initial = {
  selectedFilters: [],
  setSelectedFilters: noop,
  search: "",
  setSearch: noop,
  sortOptions: [],
  showLoans: false,
  setShowLoans: noop,
  showUntagged: false,
  setShowUntagged: noop,
  showStarred: false,
  setShowStarred: noop,
  clearFilters: noop,
  filtersActive: false,
  selectTag: noop,
  deselectTag: noop,
  selectedTags: [],
  clearSelectedTags: noop,
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
    label: "How Rare [rare to common]",
    value: "howRare",
  },
  howRareDesc: {
    label: "How Rare [common to rare]",
    value: "howRareDesc",
  },
  moonRank: {
    label: "Moon Rank [rare to common]",
    value: "moonRank",
  },
  moonRankDesc: {
    label: "Moon Rank [common to rare]",
    value: "moonRankDesc",
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
  nonFungible: ["custom", "name", "howRare", "howRareDesc", "moonRank", "moonRankDesc"],
  fungible: ["value", "custom", "balance", "name"],
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
  | "price"

export const FiltersProvider: FC<FiltersProviderProps> = ({ children }) => {
  const [selectedFilters, setSelectedFilters] = useState({})
  const { isAdmin } = useAccess()
  const [search, setSearch] = useState("")
  const [sortOptions, setSortOptions] = useState<Sort[]>([])
  const { sort, setSort } = useUiSettings()
  const [showLoans, setShowLoans] = useState<boolean>(false)
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showUntagged, setShowUntagged] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const router = useRouter()

  function clearFilters() {
    setShowLoans(false)
    setShowStarred(false)
    setShowUntagged(false)
    setSelectedTags([])
  }

  function selectTag(tagId: string) {
    setSelectedTags((prevState) => {
      return uniq([...prevState, tagId])
    })
  }

  function deselectTag(tagId: string) {
    setSelectedTags((prevState) => {
      return prevState.filter((t) => t !== tagId)
    })
  }

  function clearSelectedTags() {
    setSelectedTags([])
  }

  useEffect(() => {
    setSelectedFilters([])
  }, [router.query, router.route])

  useEffect(() => {
    let type: Type
    const filter = router.query.filter as string
    const isCollectionsIndex = !router.query.filter && !router.query.tag && !router.query.collectionId
    if (filter === "loans") {
      type = "loans"
    } else if (["sfts", "spl"].includes(filter)) {
      type = "fungible"
    } else if (filter === "editions") {
      type = "editions"
    } else if (isCollectionsIndex) {
      type = "collections"
    } else {
      type = "nonFungible"
    }
    let options = sortOptionsConfig[type]

    if (!isAdmin) {
      // options = options.filter((opt) => opt !== "custom")
    }
    setSortOptions(options.map((opt) => allOptions[opt as keyof object]))
  }, [router.query, isAdmin])

  useEffect(() => {
    if (!sortOptions.length) return
    if (!sortOptions.find((s) => s.value === sort)) {
      setSort(sortOptions[0].value)
    }
  }, [sortOptions, sort])

  return (
    <FiltersContext.Provider
      value={{
        selectedFilters,
        setSelectedFilters,
        search,
        setSearch,
        sortOptions,
        showLoans,
        setShowLoans,
        showUntagged,
        setShowUntagged,
        showStarred,
        setShowStarred,
        clearFilters,
        filtersActive: Boolean(search || showLoans || showUntagged || showStarred || selectedTags.length),
        selectTag,
        deselectTag,
        selectedTags,
        clearSelectedTags,
      }}
    >
      {children}
    </FiltersContext.Provider>
  )
}

export const useFilters = () => {
  return useContext(FiltersContext)
}
