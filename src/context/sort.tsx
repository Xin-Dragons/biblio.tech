import { useRouter } from "next/router"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useAccess } from "./access"
import { useNfts } from "./nfts"
import { useUiSettings } from "./ui-settings"

export const SortContext = createContext<{ sortOptions: Sort[] }>({ sortOptions: [] })

type Sort = {
  label: string
  value: SortType
}

type Type = "loans" | "fungible" | "editions" | "collections" | "nonFungible"
type SortType =
  | "expiring"
  | "outstanding"
  | "name"
  | "custom"
  | "howRare"
  | "moonRank"
  | "balance"
  | "value"
  | "holdings"
  | "price"

const sortOptionsConfig = {
  loans: ["expiring", "outstanding", "name"],
  nonFungible: ["custom", "name", "howRare", "howRareDesc", "moonRank", "moonRankDesc", "background"],
  fungible: ["value", "custom", "balance", "name"],
  editions: ["custom", "name", "creator"],
  collections: ["value", "name", "holdings"],
}

const allOptions = {
  expiring: {
    label: "Expiring",
    value: "expiring",
  },
  outstanding: {
    label: "Outstanding amount",
    value: "ourstanding",
  },
  background: {
    label: "Background",
    value: "background",
  },
  custom: {
    label: "Custom",
    value: "custom",
  },
  name: {
    label: "Name",
    value: "name",
  },
  howRare: {
    label: "How Rare [rare to common]",
    value: "howRare",
  },
  howRareDesc: {
    label: "How Rare [common to rare]",
    value: "howRareDesc",
  },
  moonRank: {
    label: "Moon Rank [rare to common]",
    value: "moonRank",
  },
  moonRankDesc: {
    label: "Moon Rank [common to rare]",
    value: "moonRankDesc",
  },
  balance: {
    label: "Balance",
    value: "balance",
  },
  value: {
    label: "Value",
    value: "value",
  },
  creator: {
    label: "Creator",
    value: "creator",
  },
  holdings: {
    label: "Holdings",
    value: "holdings",
  },
}

export const SortProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [sortOptions, setSortOptions] = useState<Sort[]>([])
  const { sort, setSort } = useUiSettings()
  const router = useRouter()
  const { isAdmin } = useAccess()
  const { filtered } = useNfts()

  useEffect(() => {
    let type: Type
    const filter = router.query.filter as string
    const isCollectionsIndex = !router.query.filter && !router.query.tag && !router.query.collectionId
    if (filter === "loans") {
      type = "loans"
    } else if (["sfts", "spl"].includes(filter)) {
      type = "fungible"
    } else if (filter === "editions") {
      type = "editions"
    } else if (isCollectionsIndex) {
      type = "collections"
    } else {
      type = "nonFungible"
    }
    let options = sortOptionsConfig[type]

    if (!isAdmin) {
      options = options.filter((opt) => opt !== "custom")
    }

    if (!filtered.some((n) => n.chain === "solana")) {
      options = options.filter((opt) => !["howRare", "howRareDesc", "moonRank", "moonRankDesc"].includes(opt))
    }
    setSortOptions(options.map((opt) => allOptions[opt as keyof object]))
  }, [router.query, isAdmin, filtered])

  useEffect(() => {
    if (!sortOptions.length) return
    if (!sortOptions.find((s) => s.value === sort)) {
      setSort(sortOptions[0].value)
    }
  }, [sortOptions, sort])
  return <SortContext.Provider value={{ sortOptions }}>{children}</SortContext.Provider>
}

export const useSort = () => {
  return useContext(SortContext)
}
