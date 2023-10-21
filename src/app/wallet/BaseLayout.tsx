// import { SideMenu } from "@/components/SideMenu"
import { Sidebar } from "@/components/Sidebar"
import { Box, Stack, Typography } from "@mui/material"
import { PropsWithChildren, ReactNode } from "react"
import { SelectionProvider } from "@/context/selection"
import { FiltersProvider } from "@/context/filters"
import { SortProvider } from "@/context/sort"
import { FilterBar } from "@/components/FilterBar"
import { FilteredProvider } from "@/context/filtered"
import { TypeFilter } from "@/components/TypeFilter"
import { FilterAlt } from "@mui/icons-material"
import { FilterSummary } from "@/components/FilterSummary"
import { OwnedAssetsProvider } from "@/context/owned-assets"
import { Tabs } from "./Tabs"
import { WalletStats } from "@/components/WalletStats"
import { TensorProvider } from "@/context/tensor"

export default function Layout({
  children,
  publicKey,
  sidebar,
}: PropsWithChildren<{ publicKey: string; sidebar: ReactNode }>) {
  return (
    <OwnedAssetsProvider publicKey={publicKey}>
      <TensorProvider>
        <FiltersProvider>
          <SortProvider defaultSort={"value.desc"}>
            <FilteredProvider>
              <SelectionProvider>
                <Stack direction="row" sx={{ height: "100%", overflowY: "auto" }}>
                  <Sidebar>
                    <Box p={2}>{sidebar}</Box>
                  </Sidebar>
                  <Stack height="100%" spacing={2} padding={2} flexGrow={1} width="100%">
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <WalletStats address={publicKey} />
                        <Tabs />
                      </Stack>
                      <FilterBar sortOptions={["value", "floor", "rarity", "name"]} />
                      {/* <FilterSummary /> */}
                    </Stack>
                    <Box flexGrow={1} height="100%">
                      {children}
                    </Box>
                  </Stack>
                </Stack>
              </SelectionProvider>
            </FilteredProvider>
          </SortProvider>
        </FiltersProvider>
      </TensorProvider>
    </OwnedAssetsProvider>
  )
}
