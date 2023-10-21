"use client"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { noop, set, uniq } from "lodash"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import useQueryParams from "@/hooks/use-query-params"

type FiltersContextProps = {
  tokenStandards: number[]
  selectedCollections: string[]
  setSelectedCollections: Function
  status: string[]
  setStatus: Function
  setTokenStandards: Function
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

export const FiltersContext = createContext<FiltersContextProps | undefined>(undefined)

type FiltersProviderProps = {
  children: ReactNode
}

export const FiltersProvider: FC<FiltersProviderProps> = ({ children }) => {
  const path = usePathname()
  const { queryParams, setQueryParams } = useQueryParams()
  const initialCollections = queryParams.get("collection")
  const initialStatus = queryParams.get("status")
  const initialTokenStandards = queryParams.get("tokenStandard")
  const [selectedCollections, setSelectedCollections] = useState(
    initialCollections ? initialCollections.split(",") : []
  )
  const [status, setStatus] = useState<string[]>(initialStatus ? initialStatus.split(",") : [])
  const [tokenStandards, setTokenStandards] = useState<number[]>(
    initialTokenStandards ? initialTokenStandards.split(",").map(parseInt) : []
  )
  const [selectedFilters, setSelectedFilters] = useState({})

  const [search, setSearch] = useState("")

  const [showLoans, setShowLoans] = useState<boolean>(false)
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showUntagged, setShowUntagged] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  useEffect(() => {
    setSelectedCollections(initialCollections ? initialCollections.split(",") : [])
    setStatus(initialStatus ? initialStatus.split(",") : [])
    setTokenStandards(initialTokenStandards ? initialTokenStandards.split(",").map(parseInt) : [])
  }, [initialCollections, initialStatus, initialTokenStandards])

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
    setSelectedFilters({})
  }, [path])

  useEffect(() => {
    if (selectedCollections.length) {
      setQueryParams({ collection: selectedCollections })
    } else {
      setQueryParams({ collection: undefined })
    }
  }, [selectedCollections])

  useEffect(() => {
    if (status.length) {
      setQueryParams({ status })
    } else {
      setQueryParams({ status: undefined })
    }
  }, [status])

  useEffect(() => {
    if (tokenStandards.length) {
      setQueryParams({ tokenStandard: tokenStandards })
    } else {
      setQueryParams({ tokenStandard: undefined })
    }
  }, [tokenStandards])

  return (
    <FiltersContext.Provider
      value={{
        selectedCollections,
        setSelectedCollections,
        status,
        setStatus,
        tokenStandards,
        setTokenStandards,
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
