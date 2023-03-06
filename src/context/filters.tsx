import { createContext, useContext, useEffect, useState } from "react";
import { useDatabase } from "./database";
import { useLiveQuery } from "dexie-react-hooks";
import { isArray, mergeWith, uniq } from "lodash";
import { usePrevious } from "../hooks/use-previous";

export const FiltersContext = createContext();

export const FiltersProvider = ({ children, collectionId }) => {
  const [selectedFilters, setSelectedFilters] = useState({});

  useEffect(() => {
    setSelectedFilters({})
  }, [collectionId])
  
  return (
    <FiltersContext.Provider value={{ selectedFilters, setSelectedFilters }}>
      { children }
    </FiltersContext.Provider>
  )
}

export const useFilters = () => {
  return useContext(FiltersContext);
}