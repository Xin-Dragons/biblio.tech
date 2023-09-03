"use client"
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useEffect, useState } from "react"

const Context = createContext<
  { sort: string; setSort: Dispatch<SetStateAction<string>>; type: string; direction: Direction } | undefined
>(undefined)

type Direction = "asc" | "desc"

export function SortProvider({ children, defaultSort = "name.asc" }: { children: ReactNode; defaultSort?: string }) {
  const [sort, setSort] = useState(defaultSort)
  const [type, setType] = useState<string>("")
  const [direction, setDirection] = useState<Direction>("asc")

  useEffect(() => {
    const [type, direction] = sort.split(".")
    setType(type)
    setDirection(direction as Direction)
  }, [sort])

  return <Context.Provider value={{ sort, setSort, type, direction }}>{children}</Context.Provider>
}

export const useSort = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useSort must be used in a SortProvider")
  }

  return context
}
