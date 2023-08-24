import { ActionBar } from "@/components/ActionBar"
import { SideMenu } from "@/components/SideMenu"
import { Sidebar } from "@/components/Sidebar"
import { DatabaseProvider } from "@/context/database"
import { Box, Container, Stack } from "@mui/material"
import { ReactNode } from "react"
import { NftsProvider } from "@/context/nfts"
import { SelectionProvider } from "@/context/selection"
import { FiltersProvider } from "@/context/filters"
import { SortProvider } from "@/context/sort"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DatabaseProvider>
      <NftsProvider>
        <FiltersProvider>
          <SortProvider>
            <SelectionProvider>
              <Stack direction="row" sx={{ height: "100%", overflowY: "auto" }}>
                <Sidebar>
                  <SideMenu />
                </Sidebar>
                <Stack sx={{ flexGrow: 1, overflow: "hidden" }}>
                  <Container
                    maxWidth={false}
                    sx={{ borderBottom: 1, borderColor: "divider", paddingLeft: `0.75em !important` }}
                  >
                    <ActionBar />
                  </Container>
                  <Box
                    sx={{
                      width: "100%",
                      overflowY: "auto",
                      flexGrow: 1,
                      backgroundImage: "url(/tapestry-dark.svg)",
                      backgroundSize: "100px",
                      paddingLeft: 2,
                    }}
                  >
                    {children}
                  </Box>
                </Stack>
              </Stack>
            </SelectionProvider>
          </SortProvider>
        </FiltersProvider>
      </NftsProvider>
    </DatabaseProvider>
  )
}
