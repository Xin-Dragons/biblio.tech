import { Box, Stack } from "@mui/material"
import { ReactNode } from "react"
import { Tabs } from "../Tabs"
import { routes } from "./routes"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Stack>
      <Tabs tabs={routes} title="Token tool" />
      <Box padding={4}>{children}</Box>
    </Stack>
  )
}
