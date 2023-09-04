import { Box, Button, Container, IconButton, AppBar as MuiAppBar, Stack, SvgIcon } from "@mui/material"
import Link from "next/link"

import MenuRoundedIcon from "@mui/icons-material/MenuRounded"
import { WalletSearch } from "../WalletSearch"
import { UserMenu } from "../UserMenu"
import { FC, ReactNode } from "react"
import Logo from "./logo.svg"
import { WorkshopMenu } from "../WorkshopMenu"
import { WalletManagerMenu } from "../WalletManagerMenu"
import { BarterMenu } from "../BarterMenu"

type AppBarProps = {
  showMenu?: boolean
  toggleMenu?: Function
  title?: ReactNode
  allowDevnet?: boolean
}

export const AppBar: FC<AppBarProps> = ({ showMenu, toggleMenu }) => {
  return (
    <MuiAppBar
      sx={{ borderBottom: 1, borderColor: "divider", maxWidth: "100%", overflow: "hidden" }}
      position="sticky"
      elevation={0}
      color="default"
    >
      <Container maxWidth={false}>
        <Stack
          direction="row"
          justifyContent="space-between"
          padding={0}
          alignItems="center"
          spacing={10}
          overflow="hidden"
          maxWidth="100%"
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Link href="/">
              <SvgIcon
                fontSize="large"
                sx={{
                  width: "75px",
                  height: "75px",
                  cursor: "pointer",
                  color: "white",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <Logo />
              </SvgIcon>
            </Link>
            <BarterMenu />
            <WalletManagerMenu />
            <WorkshopMenu />
          </Stack>
          <Box sx={{ flexGrow: 1 }}>
            <WalletSearch />
          </Box>

          {/* <Box sx={{ flexGrow: breakLine ? 0 : 1 }}>
            <Typography variant="h5" fontWeight="bold" textAlign="center" textTransform="uppercase">
              {title}
            </Typography>
          </Box> */}

          {showMenu ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {/* <LightDarkMode /> */}
              {/* <ShowInfo /> */}
              {/* <ViewMenu /> */}
              <UserMenu />
            </Stack>
          ) : (
            <IconButton onClick={toggleMenu as any} size="large">
              <MenuRoundedIcon fontSize="large" />
            </IconButton>
          )}
        </Stack>
      </Container>
    </MuiAppBar>
  )
}
