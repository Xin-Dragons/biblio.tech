import { useRouter } from "next/router"
import { createContext, FC, useContext, useEffect, useState } from "react"
import { useNfts } from "./nfts"
import { noop } from "lodash"

type SelectionContextProps = {
  selected: string[]
  setSelected: Function
  select: Function
}

const SelectionContext = createContext<SelectionContextProps>({ selected: [], setSelected: noop, select: noop })

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

  const select = (nftMint: string) => {
    setSelected((selected: string[]) => {
      if (selected.includes(nftMint)) {
        return selected.filter((s) => nftMint !== s)
      }
      return [...selected, nftMint]
    })
  }

  return <SelectionContext.Provider value={{ selected, setSelected, select }}>{children}</SelectionContext.Provider>
}

export const useSelection = () => {
  return useContext(SelectionContext)
}
