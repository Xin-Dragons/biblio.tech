import { Box, Button, Dialog, IconButton, Stack, Theme, Typography, useMediaQuery } from "@mui/material"
import { Container } from "@mui/system"
import Link from "next/link"
import { Toaster } from "react-hot-toast"
import { FC, useState } from "react"
import { ActionBar, WalletMultiButtonDynamic } from "../ActionBar"
import { SideMenu } from "../SideMenu"
import { Footer } from "../Footer"
import Head from "next/head"
import { Close } from "@mui/icons-material"
import { Tags } from "../Tags"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletSearch } from "../WalletSearch"
import { useBasePath } from "../../context/base-path"
import { useUiSettings } from "../../context/ui-settings"
import { TagList } from "../TagList"
import { AppBar } from "../AppBar"
import { useSelection } from "../../context/selection"
import { useAccess } from "../../context/access"
import { useRouter } from "next/router"
import { SignUp } from "../SignUp"
import { Nft } from "../../db"
import { CollectionItem } from "../../pages/collections"

type LayoutProps = {
  nfts: Nft[] | CollectionItem[]
  filtered: Nft[] | CollectionItem[]
  children: JSX.Element | JSX.Element[]
  showUntagged?: boolean
  selection?: boolean
}

export const Layout: FC<LayoutProps> = ({ children, filtered, nfts, showUntagged, selection }) => {
  const { showTags, setShowTags } = useUiSettings()
  const { selected } = useSelection()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  function toggleMenu() {
    setMenuOpen(!menuOpen)
  }

  const wallet = useWallet()
  const { isAdmin } = useAccess()
  const basePath = useBasePath()

  const showMenu = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"))

  return (
    <Box>
      <Head>
        <title>BIBLIO | Smart wallet for NFTs</title>
        <link rel="preload" href="/Barmeno-Regular.woff" as="font" crossOrigin="" type="font/woff" />
        <link rel="preload" href="/Barmeno-Regular.woff2" as="font" crossOrigin="" type="font/woff2" />
        <link rel="preload" href="/Lato-Regular.woff" as="font" crossOrigin="" type="font/woff" />
        <link rel="preload" href="/Lato-Regular.woff2" as="font" crossOrigin="" type="font/woff2" />
        <link rel="preload" href="/Lato-Bold.woff" as="font" crossOrigin="" type="font/woff" />
        <link rel="preload" href="/Lato-Bold.woff2" as="font" crossOrigin="" type="font/woff2" />
      </Head>
      <Toaster />
      <Stack height="100vh">
        <AppBar showMenu={showMenu} toggleMenu={toggleMenu} />
        <Box flexGrow={1} sx={{ overflow: "hidden" }}>
          <Stack direction="row" spacing={2} sx={{ height: "100%", overflowY: "auto" }}>
            {showMenu && <SideMenu />}
            <Stack sx={{ flexGrow: 1 }}>
              <ActionBar nfts={nfts} filtered={filtered} />
              {showTags && <TagList filtered={filtered} />}
              <Box
                sx={{
                  width: "100%",
                  overflowY: "auto",
                  flexGrow: 1,
                  backgroundImage: "url(/books-lighter.svg)",
                  backgroundSize: "200px",
                }}
              >
                {wallet.connected || router.query.publicKey ? (
                  children
                ) : (
                  <Stack
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingTop: 5,
                    }}
                    spacing={2}
                  >
                    <Typography variant="h5" textTransform="uppercase">
                      Wallet not connected
                    </Typography>
                    <WalletSearch />
                    <Stack direction="row" alignItems="center">
                      <Typography>or</Typography>
                      <WalletMultiButtonDynamic />
                      <Typography>to begin</Typography>
                    </Stack>
                  </Stack>
                )}
              </Box>
            </Stack>
          </Stack>
        </Box>
        <Footer />
      </Stack>

      {!showMenu && (
        <Dialog open={menuOpen} onClose={toggleMenu} fullScreen>
          <Container>
            <Stack>
              <IconButton size="large" sx={{ position: "fixed", top: "0.25em", right: "0.25em" }} onClick={toggleMenu}>
                <Close fontSize="large" />
              </IconButton>
              <img src="/biblio-logo.png" style={{ color: "red", margin: "0 auto" }} width="40%" />
              <Link href="/collections" passHref>
                <Button size="large" sx={{ fontWeight: "bold" }}>
                  Collections
                </Button>
              </Link>
              <Link href="/" passHref>
                <Button size="large" sx={{ fontWeight: "bold" }}>
                  NFTs
                </Button>
              </Link>
              <Link href="/wallet" passHref>
                <Button size="large" sx={{ fontWeight: "bold" }}>
                  Wallets
                </Button>
              </Link>
              <Typography variant="h5">Tags</Typography>
              <Tags />
            </Stack>
          </Container>
        </Dialog>
      )}
      <SignUp />
    </Box>
  )
}
