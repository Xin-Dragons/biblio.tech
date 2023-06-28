import { useLocalStorage, useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/router"
import { createContext, FC, useCallback, useContext, useEffect, useState } from "react"
import { useNfts } from "./nfts"
import { toast } from "react-hot-toast"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { noop } from "lodash"
import type { Currency } from "./brice"

export type LayoutSize = "small" | "medium" | "large" | "collage"
export type LoanType = "lent" | "borrowed"

type UiSettingsContextProps = {
  layoutSize: LayoutSize
  setLayoutSize: Function
  showInfo: boolean
  setShowInfo: Function
  sort: string
  setSort: Function
  profileModalShowing: boolean
  setProfileModalShowing: Function
  payRoyalties: boolean
  setPayRoyalties: Function
  showAllWallets: boolean
  setShowAllWallets: Function
  lightMode: boolean
  setLightMode: Function
  preferredCurrency: Currency
  setPreferredCurrency: Function
  setLoanType: Function
  loanType: LoanType
}

const initialProps: UiSettingsContextProps = {
  layoutSize: "medium" as LayoutSize,
  setLayoutSize: noop,
  showInfo: false,
  setShowInfo: noop,
  sort: "",
  setSort: noop,
  profileModalShowing: false,
  setProfileModalShowing: noop,
  payRoyalties: true,
  setPayRoyalties: noop,
  showAllWallets: true,
  setShowAllWallets: noop,
  lightMode: false,
  setLightMode: noop,
  preferredCurrency: "usd",
  setPreferredCurrency: noop,
  setLoanType: noop,
  loanType: "borrowed",
}

export const UiSettingsContext = createContext<UiSettingsContextProps>(initialProps)

type UiSettingsProviderProps = {
  children: JSX.Element
}

export const UiSettingsProvider: FC<UiSettingsProviderProps> = ({ children }) => {
  const [profileModalShowing, setProfileModalShowing] = useState(false)
  const { nfts } = useNfts()
  const router = useRouter()

  const { db } = useDatabase()

  const uiSettings = useLiveQuery(
    () => {
      const page = router.query.filter || router.query.collectionId || router.query.tag
      if (page) {
        return db.preferences.get(page)
      } else {
        return {}
      }
    },
    [router.query],
    {}
  )

  const defaults = useLiveQuery(() => db.preferences.get("defaults"), [])

  async function updatePreferences(key: string, value: any, isDefault = false) {
    let page: string
    let { tag, collectionId, filter } = router.query
    if (isDefault || (!tag && !collectionId && !filter)) {
      page = "defaults"
    } else {
      page = (filter as string) || (tag as string) || (collectionId as string)
    }

    await db.transaction("rw", db.preferences, async () => {
      const item = await db.preferences.get(page)
      if (item) {
        await db.preferences.update(isDefault ? "defaults" : page, { [key]: value })
      } else {
        await db.preferences.add({ page: isDefault ? "defaults" : page, [key]: value } as any)
      }
    })
  }

  const preferences = [defaults, uiSettings].reduce(
    (all, item) => {
      return {
        ...all,
        ...item,
      }
    },
    {
      showInfo: true,
      layoutSize: "medium",
      sort: "custom",
      showStarred: false,
      setShowUntagged: false,
      payRoyalties: true,
      setShowAllWallets: true,
      lightMode: false,
      preferredCurrency: "usd",
      loanType: "borrowed",
    }
  ) as {
    showInfo: boolean
    layoutSize: LayoutSize
    sort: string
    showStarred: boolean
    showUntagged: boolean
    payRoyalties: boolean
    showAllWallets: boolean
    lightMode: boolean
    preferredCurrency: Currency
    loanType: LoanType
  }

  async function setSort(sort: string) {
    await updatePreferences("sort", sort)
  }

  async function setLayoutSize(size: LayoutSize) {
    await updatePreferences("layoutSize", size)
  }

  async function setShowInfo(show: boolean) {
    await updatePreferences("showInfo", show)
  }

  async function setPayRoyalties(pay: boolean) {
    await updatePreferences("payRoyalties", pay, true)
  }

  async function setShowAllWallets(show: boolean) {
    await updatePreferences("showAllWallets", show, true)
  }

  async function setLightMode(lightMode: boolean) {
    await updatePreferences("lightMode", lightMode, true)
  }

  async function setPreferredCurrency(preferredCurrency: boolean) {
    await updatePreferences("preferredCurrency", preferredCurrency, true)
  }

  async function setLoanType(loanType: LoanType) {
    await updatePreferences("loanType", loanType, true)
  }

  return (
    <UiSettingsContext.Provider
      value={{
        layoutSize: preferences.layoutSize,
        setLayoutSize,
        showInfo: preferences.showInfo,
        setShowInfo,
        sort: preferences.sort,
        setSort,
        profileModalShowing,
        setProfileModalShowing,
        payRoyalties: Boolean(defaults?.payRoyalties),
        setPayRoyalties,
        showAllWallets: Boolean(defaults?.showAllWallets),
        setShowAllWallets,
        lightMode: Boolean(defaults?.lightMode),
        setLightMode,
        preferredCurrency: defaults?.preferredCurrency || "usd",
        loanType: defaults?.loanType || "borrowed",
        setLoanType,
        setPreferredCurrency,
      }}
    >
      {children}
    </UiSettingsContext.Provider>
  )
}

export const useUiSettings = () => {
  return useContext(UiSettingsContext)
}
