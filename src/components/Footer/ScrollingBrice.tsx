"use client"
import { useBrice, CURRENCIES, CurrencyItem } from "@/context/brice"
import { useUiSettings } from "@/context/ui-settings"
import { Stack, Typography, Tooltip } from "@mui/material"
import { upperFirst } from "lodash"
import { FC, useState } from "react"

export const ScrollingBrice: FC = () => {
  const brice = useBrice()
  const { preferredCurrency } = useUiSettings()
  const [coin, setCoin] = useState("solana")

  const currency = CURRENCIES.find((c) => c.code === preferredCurrency) as CurrencyItem

  const CurrencyTooltip = (
    <Stack>
      {Object.keys(brice).map((key) => (
        <Stack key={key} direction="row" justifyContent="space-between">
          <Typography variant="body2" sx={{ marginRight: 2 }}>
            {upperFirst(key)}
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {currency.symbol}
            {(brice[key as keyof object][preferredCurrency] as number).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{" "}
            {currency.code.toUpperCase()}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )

  return (
    <Tooltip title={CurrencyTooltip}>
      <Typography variant="body2" fontWeight="bold">
        {currency.symbol}
        {(brice[coin as keyof object][currency.code] as number).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Tooltip>
  )
}
