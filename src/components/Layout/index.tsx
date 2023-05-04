import { AppBar, Box, Button, Dialog, IconButton, Stack, TextField, Typography, useMediaQuery } from "@mui/material"
import { Container } from "@mui/system";
import { Main } from "next/document";
import dynamic from "next/dynamic";
import Link from "next/link"
import { Toaster } from "react-hot-toast"
import { FC, useState } from "react";
import { ActionBar } from "../ActionBar";
import { SelectedMenu } from "../SelectedMenu";
import { SideMenu } from "../SideMenu";
import Spinner from "../Spinner";
import styles from './style.module.scss';
import { Footer } from "../Footer";
import Head from "next/head";
import { Search } from "../Search";
import { useWidth } from "../../hooks/use-width";
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { Close } from "@mui/icons-material";
import { useTags } from "../../context/tags";
import { Color, Tags } from "../Tags";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletSearch } from "../WalletSearch";
import { useBasePath } from "../../context/base-path";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

type LayoutProps = {
  children: JSX.Element | JSX.Element[]
}

export const Layout: FC<LayoutProps> = ({ children, title, nfts, filters, tagId, rarity, filtered, allowCollageView, showUntagged }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const showMenu = useMediaQuery(theme => theme.breakpoints.up("md"))
  const showNavigation = useMediaQuery(theme => theme.breakpoints.up("sm"))
  const wallet = useWallet();
  const basePath = useBasePath();

  function toggleMenu() {
    setMenuOpen(!menuOpen)
  }

  return (
    <Box>
    <Head>
      <title>BiBLIO | Smart wallet for NFTs</title>
    </Head>
    <Container maxWidth={false} sx={{ height: "100%" }}>
      <AppBar sx={{ background: "black" }}>
        <Stack direction="row" justifyContent="space-between" padding={1} alignItems="center" spacing={2}>
          <Link href="/">
            <img src="/logo.svg" width={50} height={50} style={{ cursor: "pointer" }}/>
          </Link>
          {
            showNavigation && (
              <>
                <Link href="/" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>Collections</Button>
                </Link>
                <Link href="/nfts" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>NFTs</Button>
                </Link>
                <Link href="/wallet" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>Wallets</Button>
                </Link>
              </>
            )
          }
          
          <Search />
          
          <Stack direction="row" spacing={1} alignItems="center">
            <WalletMultiButtonDynamic />
            {
              !showMenu && <IconButton onClick={toggleMenu}>
                <MenuRoundedIcon fontSize="large" />
              </IconButton>
            }
          </Stack>
        </Stack>
      </AppBar>
      <Toaster />
      <main className={styles.main}>
        <Stack spacing={2}>
          <ActionBar
            title={title}
            includeStarredControl={true}
            allowCollageView={allowCollageView}
            nfts={nfts}
            rarity={rarity}
            filtered={filtered}
            showUntagged={showUntagged}
          />
          <Stack direction="row" spacing={2} sx={{ height: "100%" }}>
            {
              showMenu && <SideMenu nfts={nfts} filters={filters} tagId={tagId} />
            }
            
            <Box sx={{ width: "100%", marginLeft: showMenu && "2rem !important" }}>
              {
                wallet.connected
                  ? children
                  : <Stack sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }} spacing={2}>
                    <Typography variant="h4">Wallet not connected</Typography>
                    <WalletSearch />
                    <Stack direction="row" alignItems="center">
                      <Typography>or</Typography>
                      <WalletMultiButtonDynamic />
                      <Typography>to begin</Typography>
                    </Stack>
                  </Stack>
              }
            </Box>
          </Stack>
        </Stack>
      </main>
      {
        !showMenu && (
          <Dialog open={menuOpen} onClose={toggleMenu} fullScreen>
            <Container>
              <Stack>
                <IconButton size="large" sx={{ position: "fixed", top: "0.25em", right: "0.25em" }} onClick={toggleMenu}>
                  <Close fontSize="large" />
                </IconButton>
                <img src="/biblio-logo.png" style={{ color: "red"}} width="40%" style={{ margin: "0 auto" }} />
                <Link href="/collections" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>Collections</Button>
                </Link>
                <Link href="/" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>NFTs</Button>
                </Link>
                <Link href="/wallet" passHref>
                  <Button size="large" sx={{ fontWeight: "bold" }}>Wallets</Button>
                </Link>
                <Typography variant="h5">Tags</Typography>
                <Tags />
              </Stack>
            </Container>
          </Dialog>
        )
      }
      </Container>
      <SelectedMenu filtered={filtered} />
      <Footer />
    </Box>
  )
}