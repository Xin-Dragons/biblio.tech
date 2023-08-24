"use client"
import { Close } from "@mui/icons-material"
import { Dialog, Card, Container, Stack, IconButton, SvgIcon, Typography, AppBar } from "@mui/material"
import { Collage } from "./Collage"
import { Footer } from "./Footer"
import { LightDarkMode } from "./LightDarkMode"
import { ShowInfo } from "./ShowInfo"
import { SideMenu } from "./SideMenu"
import { UserMenu } from "./UserMenu"
import { ViewMenu } from "./ViewMenu"
import { WalletSearch } from "./WalletSearch"
import { useState } from "react"
import Logo from "./AppBar/logo.svg"

export function Menu() {
  const [menuOpen, setMenuOpen] = useState(false)

  function toggleMenu() {
    setMenuOpen(!menuOpen)
  }

  return (
    <Dialog open={menuOpen} onClose={toggleMenu} fullScreen>
      <Card sx={{ overflowY: "auto" }}>
        <AppBar elevation={0} position="sticky" sx={{ height: "75px" }} color="default">
          <Container sx={{ height: "100%" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" height="100%">
              <Stack direction="row" alignItems="center" spacing={1}>
                <ViewMenu />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <UserMenu />
                <IconButton onClick={toggleMenu}>
                  <Close />
                </IconButton>
              </Stack>
            </Stack>
          </Container>
        </AppBar>
        <Container>
          <Stack direction="row" justifyContent="space-between">
            <Stack direction="row">
              <LightDarkMode />
              <ShowInfo />
            </Stack>
            <Collage />
          </Stack>
          <Stack spacing={2}>
            <SvgIcon
              fontSize="large"
              sx={{
                width: "50%",
                height: "20%",
                cursor: "pointer",
                textAlign: "center",
                margin: "-20px auto 0 auto",
              }}
            >
              <Logo fontSize="large" />
            </SvgIcon>
            <Typography variant="h6" textTransform="uppercase" fontWeight="bold">
              Wallet search
            </Typography>
            <WalletSearch large />
            <SideMenu noAccordions large />
          </Stack>
        </Container>
      </Card>
      <Footer />
    </Dialog>
  )
}
