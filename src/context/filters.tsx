import { createContext, useContext, useEffect, useState } from "react";
import { useDatabase } from "./database";
import { useLiveQuery } from "dexie-react-hooks";
import { isArray, mergeWith, uniq } from "lodash";
import { usePrevious } from "../hooks/use-previous";
import { useRouter } from "next/router";
import { useSorting } from "./sorting";

export const FiltersContext = createContext();

export const FiltersProvider = ({ children }) => {
  const [selectedFilters, setSelectedFilters] = useState({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('sortedIndex')
  const router = useRouter();
  const { setSorting } = useSorting()

  useEffect(() => {
    setSelectedFilters({})
    setSearch('')
    setSort('sortedIndex')
  }, [router.asPath])

  useEffect(() => {
    setSorting(true)
    setTimeout(() => {
      setSorting(false)
    }, 1000)
  }, [sort])
  
  return (
    <FiltersContext.Provider value={{ selectedFilters, setSelectedFilters, search, setSearch, sort, setSort }}>
      { children }
    </FiltersContext.Provider>
  )
}

export const useFilters = () => {
  return useContext(FiltersContext);
}