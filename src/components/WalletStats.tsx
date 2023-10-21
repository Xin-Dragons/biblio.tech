"use client"
import { Chip, Stack, Tooltip, Typography } from "@mui/material"
import { StatsBar } from "./StatsBar"
import { useEffect, useState } from "react"
import { umi } from "@/app/helpers/umi"
import { publicKey } from "@metaplex-foundation/umi"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import { bigNumberFormatter, shorten } from "@/helpers/utils"
import { CHAIN_ICONS } from "./CollectionStats"
import { useOwnedAssets } from "@/context/owned-assets"
import { useFiltered } from "@/context/filtered"
import { useBrice } from "@/context/brice"
import { getAllDomains, reverseLookup } from "@bonfida/spl-name-service"
import { useConnection } from "@solana/wallet-adapter-react"
import { More, MoreHoriz } from "@mui/icons-material"

export function WalletStats({ address }: { address: string }) {
  const { digitalAssets } = useOwnedAssets()
  const { solana } = useBrice()
  const { filter } = useFiltered()
  const [balance, setBalance] = useState(0)
  const { connection } = useConnection()
  const [domainNames, setDomainNames] = useState<string[]>([])
  async function getBalance() {
    const balance = await umi.rpc.getBalance(publicKey(address))
    setBalance(Number(balance.basisPoints) / LAMPORTS_PER_SOL)
  }
  useEffect(() => {
    getBalance()
    const interval = setInterval(getBalance, 5000)
    return () => {
      clearInterval(interval)
    }
  }, [address])

  const filtered = filter(digitalAssets)

  const estimatedValue = filtered.reduce((sum, item) => {
    return sum + Number(item.estimatedValue || 0) / LAMPORTS_PER_SOL
  }, 0)

  const floorValue = filtered.reduce((sum, item) => {
    return sum + Number(item.floor || 0) / LAMPORTS_PER_SOL
  }, 0)

  const value = solana.usd * (balance + estimatedValue)

  useEffect(() => {
    ;(async () => {
      const domains = await getAllDomains(connection, new PublicKey(address))
      const domainNames = await Promise.all(domains.map((pk) => reverseLookup(connection, pk)))
      setDomainNames(domainNames)
    })()
  }, [address])

  return (
    <StatsBar
      title={
        <Stack overflow="hidden" spacing={0.2}>
          <Typography variant="h4" sx={{ flexGrow: 1, width: "max-content" }}>
            {shorten(address)}
          </Typography>
          {!!domainNames.length && (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 1, overflowX: "auto" }}>
              <Chip label={`${domainNames[0]}.sol`} size="small" color="secondary" sx={{ fontWeight: "bold" }} />
              {domainNames.length > 1 && (
                <Tooltip
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: "transparent",
                      },
                    },
                  }}
                  title={
                    <Stack spacing={0.5}>
                      {domainNames.map((name) => (
                        <Chip label={`${name}.sol`} size="small" color="secondary" sx={{ fontWeight: "bold" }} />
                      ))}
                    </Stack>
                  }
                >
                  <MoreHoriz sx={{ cursor: "info" }} />
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>
      }
      items={[
        {
          title: "In view",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography color="primary" variant="h5">
                ${bigNumberFormatter.format(value)}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Balance",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {balance < 1
                  ? balance.toLocaleString(undefined, {
                      maximumSignificantDigits: 3,
                    })
                  : balance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Est value",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {bigNumberFormatter.format(estimatedValue)}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Floor value",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {bigNumberFormatter.format(floorValue)}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "# Assets",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography color="primary" variant="h5">
                {bigNumberFormatter.format(filtered.length)}
              </Typography>
            </Stack>
          ),
        },
      ]}
    />
  )
}
