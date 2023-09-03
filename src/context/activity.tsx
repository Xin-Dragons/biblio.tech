"use client"
import { getHelloMoonCollectionId, getHmDigitalAsset } from "@/helpers/hello-moon"
import axios from "axios"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"
import { useDigitalAssets } from "./digital-assets"
import { useFilters } from "./filters"
import { filter, orderBy, size } from "lodash"
import { useSort } from "./sort"
import { fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"

const Context = createContext<{ activity: any[]; filtered: any[] } | undefined>(undefined)

export function ActivityProvider({
  collectionId,
  wallet,
  children,
}: {
  collectionId?: string
  wallet?: string
  children: ReactNode
}) {
  const { digitalAssets } = useDigitalAssets()
  const { selectedFilters, search } = useFilters()
  const [activity, setActivity] = useState([])
  const { type, direction } = useSort()

  useEffect(() => {
    async function getCollectionActivity() {
      try {
        const helloMoonCollectionId = await getHelloMoonCollectionId(collectionId)
        const { data } = await axios.post(
          "https://rest-api.hellomoon.io/v0/nft/sales/secondary/latest",
          {
            helloMoonCollectionId,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
            },
          }
        )

        const mapped = data.latestMintPrices.map((item) => {
          const digitalAsset = digitalAssets.find((d) => d.id === item.mint)
          return {
            ...item,
            digitalAsset,
            blocktime: item.blocktime || item.blockTime,
          }
        })

        setActivity(mapped)
      } catch {
        setActivity([])
      }
    }

    async function getWalletActivity() {
      const url = "https://rest-api.hellomoon.io/v0/nft/sales/secondary"
      const [sales, purchases] = await Promise.all([
        axios.post(
          url,
          {
            seller: wallet,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
            },
          }
        ),
        axios.post(
          url,
          {
            buyer: wallet,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`,
            },
          }
        ),
      ])

      const activity = [...sales.data.data, ...purchases.data.data]
      const mints = activity.map((item) => item.nftMint)
      const loadedMints = digitalAssets.map((da) => da.id)
      const toFetch = mints.filter((mint) => !loadedMints.includes(mint))

      const newDas = await fetchAllDigitalAssetsByIds(toFetch)
      const allDas = [...digitalAssets, ...newDas.items]

      const mapped = await Promise.all(
        activity.map(async (item) => {
          let digitalAsset = allDas.find((d) => d.id === item.nftMint)
          if (!digitalAsset) {
            digitalAsset = await getHmDigitalAsset(item.nftMint)
          }
          return {
            ...item,
            digitalAsset,
            blocktime: item.blocktime || item.blockTime,
          }
        })
      )

      setActivity(mapped)
    }

    if (collectionId) {
      getCollectionActivity()
    } else if (wallet) {
      getWalletActivity()
    }
  }, [collectionId])

  let filtered = activity.filter((item) => {
    return (
      !size(selectedFilters) ||
      Object.keys(selectedFilters).every((key) => {
        const vals = selectedFilters[key]
        return (
          !vals.length ||
          vals.includes(
            (item.digitalAsset.content.metadata.attributes || []).filter(Boolean).find((att) => att.trait_type === key)
              ?.value
          )
        )
      })
    )
  })

  if (search) {
    const s = search.toLowerCase()

    filtered = filtered.filter((item) => {
      const nft = item.digitalAsset
      if (!nft) {
        return false
      }
      let name = nft.content.metadata.name || ""
      if (typeof name !== "string") {
        name = `${name}`
      }
      const symbol = nft.content.metadata.symbol || ""
      const description = nft.content.metadata.description || ""
      const attributes = (nft.content.metadata.attributes || []).filter(Boolean)

      if (s.includes("traits:")) {
        const num = parseInt(s.split(":")[1])
        if (num) {
          return (
            attributes
              .filter(Boolean)
              .filter((att) => att.value !== "none" && att.value !== "None" && att.value !== "NONE").length === num
          )
        }
      }

      if (s.includes(":")) {
        const [trait_type, value] = s.split(":").map((item) => item.trim().toLocaleLowerCase())
        if (trait_type && value) {
          return (
            attributes
              .filter(Boolean)
              .find((att) => att.trait_type?.toLowerCase() === trait_type)
              ?.value?.toLowerCase() === value
          )
        }
      }

      const values = (attributes || []).filter(Boolean).map((att: any) => `${att.value || ""}`.toLowerCase())
      return (
        nft.id === search ||
        name.toLowerCase().includes(s) ||
        description.toLowerCase().includes(s) ||
        symbol.toLowerCase().includes(s) ||
        values.some((val: any) => val.includes(s))
      )
    })
  }

  if (type === "blocktime") {
    filtered = orderBy(filtered, ["blocktime"], [direction])
  }

  if (type === "price") {
    filtered = orderBy(filtered, ["price", "blocktime"], [direction, "desc"])
  }

  console.log({ filtered })

  return <Context.Provider value={{ activity, filtered }}>{children}</Context.Provider>
}

export const useActivity = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useActivity must be used in an ActivityProvider")
  }

  return context
}
