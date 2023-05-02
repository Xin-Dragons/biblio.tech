import { createContext, useContext, useState } from "react";

export const SortingContext = createContext();

export const SortingProvider = ({ children }) => {
  const [sorting, setSorting] = useState(false);

  return (
    <SortingContext.Provider value={{ sorting, setSorting }}>
      { children}
    </SortingContext.Provider>
  )
}

export const useSorting = () => {
  return useContext(SortingContext);
}