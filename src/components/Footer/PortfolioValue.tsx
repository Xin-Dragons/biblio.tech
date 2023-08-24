"use client"
import { CURRENCIES, CurrencyItem, useBrice } from "@/context/brice"
import { useDatabase } from "@/context/database"
import { useNfts } from "@/context/nfts"
import { useUiSettings } from "@/context/ui-settings"
import { Nft } from "@/db"
import { Tooltip, Typography, useMediaQuery } from "@mui/material"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useEffect, useState } from "react"

export function PortfolioValue() {
  const { preferredCurrency } = useUiSettings()
  const brice = useBrice()
  const { nfts } = useNfts()
  const { collections } = useDatabase()
  const [portfolioValue, setPortfolioValue] = useState(0)

  useEffect(() => {
    const value = nfts
      .map((n: Nft) => {
        const price = brice[(n.chain === "eth" ? "ethereum" : "solana") as keyof object][preferredCurrency] as number
        // if (isLoanPage) {
        //   const solPrice = (n.loan?.amountToRepay || 0) / LAMPORTS_PER_SOL
        //   return {
        //     ...n,
        //     value: solPrice * price,
        //     solPrice: solPrice,
        //   }
        // } else {
        const collection = collections.find((c) => c.id === n.collectionId)
        if (!collection) {
          return n
        }

        const value = n.chain === "eth" ? collection.floorPrice : collection.floorPrice / LAMPORTS_PER_SOL
        return {
          ...n,
          value: price * value,
        }
        // }
      })
      .reduce((sum, nft) => {
        if (nft.value) {
          return sum + nft.value
        }
        return sum
      }, 0)

    setPortfolioValue(value)
  }, [nfts])

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  const isTiny = useMediaQuery("(max-width:620px)")

  return (
    <Tooltip
      title={
        <Typography variant="body2">
          {/* {isLoanPage
            ? "This is the total amount owing"
            : "This is an estimated value of the current view based on floor prices only"} */}
          This is an estimated value of the current view based on floor prices only
        </Typography>
      }
    >
      <Typography variant="body2" fontWeight="bold" color="grey" sx={{ fontSize: "12px !important" }}>
        {currency.symbol}
        {portfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
        {!isTiny && currency.code.toUpperCase()}
      </Typography>
    </Tooltip>
  )
}
