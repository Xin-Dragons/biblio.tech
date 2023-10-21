import { CollectionStats } from "@/components/CollectionStats"
import { Sidebar } from "@/components/Sidebar"
import { DigitalAssetsProvider } from "@/context/digital-assets"
import { FiltersProvider } from "@/context/filters"
import { SelectionProvider } from "@/context/selection"
import { Stack, Box, Typography } from "@mui/material"
import { ReactNode } from "react"
import { Tabs } from "./Tabs"
import { getSolanaCollectionStats } from "./get-collection"
import { notFound } from "next/navigation"
import { getCollection } from "@/app/helpers/supabase"
import { AttributeFilters } from "@/components/AttributeFilters"
import { FilterAlt } from "@mui/icons-material"
import { TensorProvider } from "@/context/tensor"

export default async function Layout({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  const collection = await getCollection(params.slug)
  const stats = await getSolanaCollectionStats(collection)
  if (!collection || !stats) {
    return notFound()
  }

  return (
    <TensorProvider>
      <FiltersProvider>
        <SelectionProvider>
          <Stack direction="row" height="100%" width="100%">
            <Sidebar>
              <Box p={2}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                  <FilterAlt />
                  <Typography variant="h5" color="primary" textTransform="uppercase" textAlign="center">
                    Traits
                  </Typography>
                </Stack>
                <AttributeFilters attributes={collection.traits} />
              </Box>
            </Sidebar>
            <Stack height="100%" spacing={2} padding={2} flexGrow={1} width="100%" overflow="hidden">
              <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                justifyContent="space-between"
                sx={{ overflow: "hidden", width: "100%" }}
              >
                <CollectionStats stats={stats} collection={collection} />
                <Stack flexGrow={1} direction="row" justifyContent="flex-end">
                  <Tabs />
                </Stack>
              </Stack>
              {children}
            </Stack>
          </Stack>
        </SelectionProvider>
      </FiltersProvider>
    </TensorProvider>
  )
}
