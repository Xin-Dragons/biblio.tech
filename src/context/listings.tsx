"use client"
import { useParams } from "next/navigation"
import { ReactNode, createContext, useContext, useEffect, useState } from "react"

const Context = createContext<{ listings: any[]; fetchListings: Function } | undefined>(undefined)

export function ListingsProvider({
  children,
  helloMoonCollectionId,
}: {
  children: ReactNode
  helloMoonCollectionId?: string | null
}) {
  const [listings, setListings] = useState([])
  const { publicKey } = useParams()

  function fetchListings() {
    if (!helloMoonCollectionId && !publicKey) {
      console.log("LAME")
      return
    }

    const worker = new Worker(new URL("@/../public/get-listings.worker.ts", import.meta.url))

    worker.onmessage = (event) => {
      setListings(event.data.listings)
      worker.terminate()
    }

    worker.onerror = () => {
      worker.terminate()
    }

    worker.postMessage({ helloMoonCollectionId, publicKey })
  }

  useEffect(() => {
    fetchListings()
  }, [helloMoonCollectionId, publicKey])

  return <Context.Provider value={{ listings, fetchListings }}>{children}</Context.Provider>
}

export const useListings = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("listingsContext must be used in a ListingsProvider")
  }

  return context
}
