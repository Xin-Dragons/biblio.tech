import { Typography } from "@mui/material"
import axios from "axios"
import { FC, ReactNode, createContext, useContext, useEffect, useState } from "react"
import { toast } from "react-hot-toast"

export type CurrencyItem = {
  code: Currency
  symbol: CurrencySymbol
}

export type CurrencySymbol = "$" | "£" | "€" | "A$"

export const CURRENCIES = [
  {
    code: "usd",
    symbol: "$",
  },
  {
    code: "gbp",
    symbol: "£",
  },
  {
    code: "eur",
    symbol: "€",
  },
  {
    code: "aud",
    symbol: "$",
  },
]

export type Currency = "usd" | "gbp" | "eur" | "aud"

type CoinCurrencies = {
  usd: number
  gbp: number
  eur: number
}

export type Brice = {
  [key: string]: CoinCurrencies
}

export const BriceContext = createContext({
  ethereum: {
    usd: 0,
    gbp: 0,
    eur: 0,
  },
  solana: {
    usd: 0,
    gbp: 0,
    eur: 0,
  },
})
const BRICE_API = `https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=${CURRENCIES.map(
  (c) => c.code
).join(",")}`

export const BriceProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [brice, setBrice] = useState({
    solana: {
      usd: 0,
      gbp: 0,
      eur: 0,
    },
    ethereum: {
      usd: 0,
      gbp: 0,
      eur: 0,
    },
  })

  async function getBrice() {
    try {
      const { data } = await axios.get(BRICE_API)
      setBrice(data)
    } catch (err: any) {
      console.log(err)
      toast("Error looking up coin prices")
    }
  }

  useEffect(() => {
    getBrice()
    const interval = setInterval(getBrice, 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return <BriceContext.Provider value={brice}>{children}</BriceContext.Provider>
}

export const useBrice = () => {
  return useContext(BriceContext)
}
