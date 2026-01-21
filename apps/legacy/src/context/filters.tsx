import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { isArray, mergeWith, noop, uniq } from "lodash"
import { usePrevious } from "../hooks/use-previous"
import { useRouter } from "next/router"
import { useUiSettings } from "./ui-settings"
import { useAccess } from "./access"
import { useNfts } from "./nfts"

type FiltersContextProps = {
  selectedFilters: any
  setSelectedFilters: Function
  search?: string
  setSearch: Function
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

type FiltersProviderProps = {
  children: ReactNode
}

export const FiltersProvider: FC<FiltersProviderProps> = ({ children }) => {
  const [selectedFilters, setSelectedFilters] = useState({})
  const [search, setSearch] = useState("")

  const [showLoans, setShowLoans] = useState<boolean>(false)
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showUntagged, setShowUntagged] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { filtered } = useNfts()
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

  return (
    <FiltersContext.Provider
      value={{
        selectedFilters,
        setSelectedFilters,
        search,
        setSearch,
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
