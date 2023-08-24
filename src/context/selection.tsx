"use client"
import { createContext, FC, ReactNode, useContext, useEffect, useState } from "react"
import { useNfts } from "./nfts"
import { uniq } from "lodash"
import { useWallet } from "@solana/wallet-adapter-react"
import { Nft } from "@/db"

type SelectionContextProps = {
  selected: string[]
  setSelected: Function
  select: Function
  statusesSelected: boolean
  selectedItems: Nft[]
  nonOwnedSelected: boolean
  frozenSelected: boolean
  onlyNftsSelected: boolean
  allSelected: boolean
  selectAll: Function
  deselectAll: Function
}

const SelectionContext = createContext<SelectionContextProps | undefined>(undefined)

type SelectionProviderProps = {
  children: ReactNode
}

export const SelectionProvider: FC<SelectionProviderProps> = ({ children }) => {
  const [selected, setSelected] = useState<string[]>([])
  const { filtered } = useNfts()
  const wallet = useWallet()

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

  const selectedItems = selected
    .map((nftMint) => (filtered as any).find((f: any) => f.nftMint === nftMint))
    .filter(Boolean)

  const statusesSelected = selectedItems.some((item) => item.status)

  const nonOwnedSelected = selectedItems.some((item) => {
    return item.owner !== wallet.publicKey?.toBase58() && item.delegate !== wallet.publicKey?.toBase58()
  })

  const frozenSelected = selectedItems.some((item: any) => ["frozen", "inVault", "staked"].includes(item.status))

  const allSelected = selected.length >= filtered.length

  const onlyNftsSelected = selectedItems.every((item: any) => {
    return [0, 3, 4].includes(item.metadata.tokenStandard)
  })

  function selectAll() {
    setSelected((prevState: string[]) => {
      return uniq([...prevState, ...filtered.map((f) => f.nftMint)])
    })
  }

  function deselectAll() {
    setSelected([])
  }

  return (
    <SelectionContext.Provider
      value={{
        selected,
        setSelected,
        select,
        selectedItems,
        statusesSelected,
        nonOwnedSelected,
        frozenSelected,
        allSelected,
        onlyNftsSelected,
        selectAll,
        deselectAll,
      }}
    >
      {children}
    </SelectionContext.Provider>
  )
}

export const useSelection = () => {
  const context = useContext(SelectionContext)

  if (context === undefined) {
    throw new Error("useSelection must be used in a SelectionProvider")
  }

  return context
}
