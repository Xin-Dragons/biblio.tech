"use client"
import { PublicKey } from "@solana/web3.js"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import toast from "react-hot-toast"

const initial = {
  hashlist: "",
  setHashlist: (string: string) => {},
  clearHash: () => {},
  parsed: [],
  hashlistError: null,
}

const HashlistContext = createContext<{
  hashlist: string
  setHashlist: Function
  clearHash: Function
  parsed: any[]
  hashlistError: string | null
}>(initial)

export const HashlistProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [hashlist, setHashlist] = useState<string>("")
  const [parsed, setParsed] = useState([])
  const [hashlistError, setHashlistError] = useState<string | null>(null)

  useEffect(() => {
    if (hashlist) {
      try {
        const p = JSON.parse(hashlist.trim())
        setParsed(p)
        setHashlistError(null)
      } catch {
        setHashlistError("Invalid JSON")
        setParsed([])
      }
    } else {
      setParsed([])
      setHashlistError(null)
    }
  }, [hashlist])

  function clearHash() {
    setHashlist("")
  }

  useEffect(() => {
    if (parsed.length) {
      try {
        parsed.forEach((item) => {
          const pk = new PublicKey(item)
        })
        setHashlistError(null)
      } catch {
        setHashlistError("Invalid hashlist")
      }
    }
  }, [parsed])

  return (
    <HashlistContext.Provider value={{ hashlist, clearHash, setHashlist, parsed, hashlistError }}>
      {children}
    </HashlistContext.Provider>
  )
}

export const useHashlist = () => {
  const context = useContext(HashlistContext)

  if (context === undefined) {
    throw new Error("useHashlist must be used in a HashlistProvider")
  }

  return context
}
