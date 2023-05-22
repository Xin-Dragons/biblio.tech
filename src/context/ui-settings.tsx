import { useLocalStorage, useWallet } from "@solana/wallet-adapter-react"
import { useRouter } from "next/router"
import { createContext, FC, useCallback, useContext, useEffect, useState } from "react"
import { useNfts } from "./nfts"
import { toast } from "react-hot-toast"
import { useDatabase } from "./database"
import { useLiveQuery } from "dexie-react-hooks"
import { noop } from "lodash"

export type LayoutSize = "small" | "medium" | "large" | "collage"

type UiSettingsContextProps = {
  layoutSize: LayoutSize
  setLayoutSize: Function
  showStarred: boolean
  setShowStarred: Function
  showInfo: boolean
  setShowInfo: Function
  showTags: boolean
  setShowTags: Function
  sort: string
  setSort: Function
}

const initialProps = {
  layoutSize: "medium" as LayoutSize,
  setLayoutSize: noop,
  showStarred: false,
  setShowStarred: noop,
  showInfo: false,
  setShowInfo: noop,
  showTags: false,
  setShowTags: noop,
  sort: "",
  setSort: noop,
}

export const UiSettingsContext = createContext<UiSettingsContextProps>(initialProps)

type UiSettingsProviderProps = {
  children: JSX.Element
}

export const UiSettingsProvider: FC<UiSettingsProviderProps> = ({ children }) => {
  const [showStarred, setShowStarred] = useState<boolean>(false)
  const [showTags, setShowTags] = useState<boolean>(false)
  const { nfts } = useNfts()
  const router = useRouter()

  const { db } = useDatabase()

  useEffect(() => {
    if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
      setShowTags(false)
    }
  }, [router.query])

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

  const defaults = useLiveQuery(() => db.preferences.get("defaults"), [], {})

  async function updatePreferences(key: string, value: any) {
    let page: string
    let { tag, collectionId, filter } = router.query
    if (!tag && !collectionId && !filter) {
      page = "defaults"
    } else {
      page = (filter as string) || (tag as string) || (collectionId as string)
    }

    await db.transaction("rw", db.preferences, async () => {
      const item = await db.preferences.get(page)
      if (item) {
        await db.preferences.update(page, { [key]: value })
      } else {
        await db.preferences.add({ page, [key]: value } as any)
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
    }
  ) as {
    showInfo: boolean
    layoutSize: LayoutSize
    sort: string
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

  useEffect(() => {
    if (nfts.length > 500 && preferences.layoutSize === "collage") {
      setLayoutSize("large")
    }
  }, [nfts, preferences.layoutSize])

  return (
    <UiSettingsContext.Provider
      value={{
        layoutSize: preferences.layoutSize,
        setLayoutSize,
        showStarred,
        setShowStarred,
        showInfo: preferences.showInfo,
        setShowInfo,
        showTags,
        setShowTags,
        sort: preferences.sort,
        setSort,
      }}
    >
      {children}
    </UiSettingsContext.Provider>
  )
}

export const useUiSettings = () => {
  return useContext(UiSettingsContext)
}
