import { AppBar, Box, Stack, Typography } from "@mui/material"
import { Container } from "@mui/system";
import { Main } from "next/document";
import dynamic from "next/dynamic";
import Link from "next/link"
import { Toaster } from "react-hot-toast"
import { FC, useState } from "react";
import { useNfts } from "../../context/nfts";
import { ActionBar } from "../ActionBar";
import { SelectedMenu } from "../SelectedMenu";
import { SideMenu } from "../SideMenu";
import Spinner from "../Spinner";
import styles from './style.module.scss';
import { Footer } from "../Footer";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

type LayoutProps = {
  children: JSX.Element | JSX.Element[]
}

export const Layout: FC<LayoutProps> = ({ children, title, nfts, filters, tagId }) => {
  const { loading } = useNfts()

  function toggleMenu() {
    setMenuShowing(!menuShowing)
  }

  return (
    <Box>

    <Container maxWidth={false} sx={{ height: "100%" }}>
      <AppBar sx={{ background: "black" }}>
        <Stack direction="row" justifyContent="space-between" padding={1} alignItems="center">
          <Link href="/">
            <img src="/logo.png" width={50} height={50} />
          </Link>
          <Typography variant="h4">Biblio</Typography>
          <WalletMultiButtonDynamic />
        </Stack>
      </AppBar>
      <Toaster />
      <main className={styles.main}>
        <Stack spacing={2}>
          <ActionBar
            title={title}
            includeStarredControl={true}
            nfts={nfts}
          />
          <Stack direction="row" spacing={2} sx={{ height: "100%" }}>
            <SideMenu nfts={nfts} filters={filters} tagId={tagId} />
            <Box sx={{ width: "100%", marginLeft: "2rem !important" }}>
              
              {
                children
                // loading
                //   ? <Box sx={{ height: "calc(100vh - 150px)", width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
                //       <Stack spacing={2} width="100%" justifyContent="center" alignItems="center">
                //         <Typography variant="h5" textAlign="center">Loading wallet contents</Typography>
                //         <Spinner />
                //       </Stack>
                //     </Box>
                //   : children
              }
            </Box>
            <SelectedMenu nfts={nfts} />
          </Stack>
        </Stack>
      </main>
      </Container>
      <Footer />
    </Box>
  )
}