import { useRouter } from "next/router";
import { createContext, FC, useContext, useEffect, useState } from "react";

type SelectionContextProps = {
  selected: string[];
  setSelected: Function;
}

const SelectionContext = createContext<SelectionContextProps>({ selected: [], setSelected: () => {}})

type SelectionProviderProps = {
  children: JSX.Element;
}

export const SelectionProvider: FC<SelectionProviderProps> = ({ children }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setSelected([]);
  }, [router.pathname])

  return <SelectionContext.Provider value={{ selected, setSelected }}>
    { children }
  </SelectionContext.Provider>
}

export const useSelection = () => {
  return useContext(SelectionContext);
}