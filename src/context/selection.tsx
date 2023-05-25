import { useRouter } from "next/router"
import { createContext, FC, useContext, useEffect, useState } from "react"
import { useNfts } from "./nfts"

type SelectionContextProps = {
  selected: string[]
  setSelected: Function
}

const SelectionContext = createContext<SelectionContextProps>({ selected: [], setSelected: () => {} })

type SelectionProviderProps = {
  children: JSX.Element
}

export const SelectionProvider: FC<SelectionProviderProps> = ({ children }) => {
  const [selected, setSelected] = useState<string[]>([])
  const { nfts, filtered } = useNfts()
  const router = useRouter()

  useEffect(() => {
    const toRemove = selected.filter((item) => !filtered.map((n) => n.nftMint).includes(item))
    if (toRemove.length) {
      setSelected((prev: string[]) => {
        return prev.filter((item: any) => !toRemove.includes(item))
      })
    }
  }, [filtered])

  return <SelectionContext.Provider value={{ selected, setSelected }}>{children}</SelectionContext.Provider>
}

export const useSelection = () => {
  return useContext(SelectionContext)
}
