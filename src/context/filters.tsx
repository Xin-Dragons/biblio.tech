"use client"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { noop, uniq } from "lodash"
import { usePathname } from "next/navigation"

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
  const path = usePathname()
  const [selectedFilters, setSelectedFilters] = useState({})
  const [search, setSearch] = useState("")

  const [showLoans, setShowLoans] = useState<boolean>(false)
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showUntagged, setShowUntagged] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

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
  }, [path])

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
  const context = useContext(FiltersContext)

  if (context === undefined) {
    throw new Error("useFilters must be used in a FiltersProvider")
  }

  return context
}
