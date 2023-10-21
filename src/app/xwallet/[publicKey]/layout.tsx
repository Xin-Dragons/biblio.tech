import { Search } from "@/components/Search"
import { DigitalAssetsProvider } from "@/context/digital-assets"
import { FilteredProvider } from "@/context/filtered"
import { FiltersProvider } from "@/context/filters"
import { RarityProvider } from "@/context/rarity"
import { SortProvider } from "@/context/sort"
import { bigNumberFormatter, shorten } from "@/helpers/utils"
import { Box, Stack, SvgIcon, Typography } from "@mui/material"
import { ReactNode } from "react"
import Solana from "@/../public/solana.svg"
import { umi } from "@/app/helpers/umi"
import { publicKey } from "@metaplex-foundation/umi"
import { fetchDigitalAssetsByOwner } from "@/helpers/digital-assets"
import { FilterBar } from "@/components/FilterBar"
import { AttributeFilters } from "@/components/AttributeFilters"
import { Sidebar } from "@/components/Sidebar"
import { Tabs } from "./Tabs"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"

export default async function layout({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  const balance = await umi.rpc.getBalance(publicKey(params.publicKey))
  const solBalance = Number(balance.basisPoints) / LAMPORTS_PER_SOL
  const { grand_total } = await fetchDigitalAssetsByOwner(params.publicKey)
  return (
    <RarityProvider>
      <SortProvider defaultSort="name.asc">
        <FiltersProvider>
          <DigitalAssetsProvider publicKey={params.publicKey}>
            <FilteredProvider>
              <Stack direction="row" height="100%" width="100%">
                <Sidebar>
                  <Box padding={2}>{/* <AttributeFilters /> */}</Box>
                </Sidebar>
                <Stack height="100%" spacing={2} padding={2} flexGrow={1} width="100%">
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Stack spacing={2} direction="row" alignItems="center">
                      <Typography variant="h4">{shorten(params.publicKey)}</Typography>
                      <Stack direction="row" spacing={2}>
                        <Stack>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <SvgIcon>
                              <Solana />
                            </SvgIcon>
                            <Typography color="primary" variant="h5">
                              {solBalance < 1
                                ? solBalance.toLocaleString(undefined, {
                                    minimumFractionDigits: 3,
                                  })
                                : solBalance.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                            </Typography>
                          </Stack>
                          <Typography variant="body2">SOL BALANCE</Typography>
                        </Stack>
                        <Stack>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography color="primary" variant="h5">
                              {grand_total}
                            </Typography>
                          </Stack>
                          <Typography variant="body2">DIGITAL ASSETS</Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                    <Tabs />
                  </Stack>
                  {children}
                </Stack>
              </Stack>
            </FilteredProvider>
          </DigitalAssetsProvider>
        </FiltersProvider>
      </SortProvider>
    </RarityProvider>
  )
}
