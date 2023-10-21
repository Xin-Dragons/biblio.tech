"use client"
import { Collection } from "@/types/database"

import Solana from "@/../public/solana.svg"
import Eth from "@/../public/eth.svg"
import Matic from "@/../public/matic.svg"
import { getTensorStats } from "@/helpers/tensor-server-actions"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Stack, SvgIcon, Typography } from "@mui/material"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { StatsBar } from "./StatsBar"
import { Socials } from "./Socials"
import { bigNumberFormatter } from "@/helpers/utils"
import { ArrowUpward, ArrowDownward } from "@mui/icons-material"

export const CHAIN_ICONS = {
  SOL: (
    <SvgIcon sx={{ color: "transparent", fill: "transparent" }}>
      <Solana />
    </SvgIcon>
  ),
  ETH: (
    <SvgIcon>
      <Eth />
    </SvgIcon>
  ),
  MATIC: (
    <SvgIcon>
      <Matic />
    </SvgIcon>
  ),
}

export function CollectionStats({
  stats: initialStats,
  collection,
}: {
  stats: {
    tensorVerified: boolean
    floorPrice: number
    volumeAll: number
    floor24h: number
    numListed: number
    numMints: number
    volume24h: number
    traits: JSON
  }
  collection: Collection
}) {
  const [stats, setStats] = useState(initialStats)
  const params = useParams()

  useEffect(() => {
    const interval = setInterval(update, 10_000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  async function update() {
    const stats = await getTensorStats(params.slug as string)
    if (stats) {
      setStats(stats)
    }
  }

  const fp = stats.floorPrice / LAMPORTS_PER_SOL

  return (
    <StatsBar
      title={
        <Stack direction="row" spacing={2} alignItems="baseline">
          <Typography variant="h4" sx={{ whiteSpace: "nowrap" }}>
            {collection.name}
          </Typography>
          <Socials collection={collection} />
        </Stack>
      }
      items={[
        {
          title: "Floor price",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {fp < 1
                  ? fp.toLocaleString(undefined, {
                      maximumSignificantDigits: 3,
                    })
                  : fp.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Price change",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {!!stats.floor24h && (
                <>{stats.floor24h > 0 ? <ArrowUpward color="success" /> : <ArrowDownward color="error" />}</>
              )}
              <Typography
                variant="h5"
                sx={{ color: stats.floor24h === 0 ? "primary" : stats.floor24h > 0 ? "success.main" : "error.main" }}
              >
                {stats.floor24h.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
                %
              </Typography>
            </Stack>
          ),
        },
        {
          title: "24h volume",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {bigNumberFormatter.format(stats.volume24h / LAMPORTS_PER_SOL)}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Total volume",
          value: (
            <Stack direction="row" alignItems="center" spacing={1}>
              {CHAIN_ICONS["SOL"]}
              <Typography color="primary" variant="h5">
                {bigNumberFormatter.format(stats.volumeAll / LAMPORTS_PER_SOL)}
              </Typography>
            </Stack>
          ),
        },
        {
          title: "Supply",
          value: (
            <Typography color="primary" variant="h5">
              {bigNumberFormatter.format(stats.numMints)}
            </Typography>
          ),
        },
        {
          title: "Listed",
          value: (
            <Typography color="primary" variant="h5">
              {bigNumberFormatter.format(stats.numListed)}
            </Typography>
          ),
        },
      ]}
    />
  )
}
