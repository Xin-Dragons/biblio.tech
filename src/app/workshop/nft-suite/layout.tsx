import { Box, Stack } from "@mui/material"
import { ReactNode } from "react"
import { Tabs } from "../Tabs"
import { routes } from "./routes"
import { NftsProvider } from "./nfts-context"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Stack>
      <NftsProvider>
        <Tabs tabs={routes} title="NFT Suite" />
        <Box padding={4}>{children}</Box>
      </NftsProvider>
    </Stack>
  )
}
