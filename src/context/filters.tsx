import { createContext, useContext, useEffect, useState } from "react";
import { useDatabase } from "./database";
import { useLiveQuery } from "dexie-react-hooks";
import { isArray, mergeWith, uniq } from "lodash";
import { usePrevious } from "../hooks/use-previous";
import { useRouter } from "next/router";

export const FiltersContext = createContext();

export const FiltersProvider = ({ children }) => {
  const [selectedFilters, setSelectedFilters] = useState({});
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('sortedIndex')
  const router = useRouter();

  useEffect(() => {
    setSelectedFilters({})
    setSearch('')
  }, [router.asPath])
  
  return (
    <FiltersContext.Provider value={{ selectedFilters, setSelectedFilters, search, setSearch, sort, setSort }}>
      { children }
    </FiltersContext.Provider>
  )
}

export const useFilters = () => {
  return useContext(FiltersContext);
}