"use client"
import { Box, Stack, Theme, useMediaQuery } from "@mui/material"
import { Toaster } from "react-hot-toast"
import { FC, ReactNode } from "react"
import { Footer } from "../Footer"
import { useUiSettings } from "../../context/ui-settings"
import { AppBar } from "../AppBar"
import { SolTransfer } from "../SolTransfer"
import { Menu } from "../Menu"

type LayoutProps = {
  children: ReactNode
  title?: ReactNode
  actions?: ReactNode
  allowDevnet?: boolean
}

export const Layout: FC<LayoutProps> = ({ children, title, actions, allowDevnet }) => {
  const { lightMode } = useUiSettings()
  // const theme = useTheme()

  const hideMenu = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"))

  return (
    <Box>
      <Toaster />
      <Stack height="100vh" width="100vw">
        <AppBar showMenu={!hideMenu} title={title} allowDevnet={allowDevnet} />
        <Box
          flexGrow={1}
          sx={{
            overflow: "hidden",
            width: "100vw",
            backgroundImage: "url(/tapestry-dark.svg)",
            backgroundSize: "100px",
          }}
        >
          {children}
        </Box>
        <Footer />
      </Stack>
      <Menu />
      <SolTransfer />
    </Box>
  )
}
