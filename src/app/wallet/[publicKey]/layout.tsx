import { Search } from "@/components/Search"
import { DigitalAssetsProvider } from "@/context/digital-assets"
import { FiltersProvider } from "@/context/filters"
import { ListingsProvider } from "@/context/listings"
import { shorten } from "@/helpers/utils"
import { Stack, Typography } from "@mui/material"
import { ReactNode } from "react"

export default function layout({ params, children }: { params: Record<string, string>; children: ReactNode }) {
  return (
    <FiltersProvider>
      <ListingsProvider>
        <DigitalAssetsProvider wallet={params.publicKey}>
          <Stack height="100%">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h4">{shorten(params.publicKey)}</Typography>
              <Search />
            </Stack>
            {children}
          </Stack>
        </DigitalAssetsProvider>
      </ListingsProvider>
    </FiltersProvider>
  )
}
