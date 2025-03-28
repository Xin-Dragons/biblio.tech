import App from "next/app"
import { CssBaseline } from "@mui/material"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import type { AppProps } from "next/app"
import { FC } from "react"
import { MetaplexProvider } from "../context/metaplex"
import { SelectionProvider } from "../context/selection"
import { UiSettingsProvider } from "../context/ui-settings"
import { TagsProvider } from "../context/tags"
import { DatabaseProvider } from "../context/database"
import { FiltersProvider } from "../context/filters"
import Script from "next/script"
import { DialogProvider } from "../context/dialog"
import { ThemeProvider } from "../context/theme"
import { BasePathProvider } from "../context/base-path"
import { AccessProvider } from "../context/access"
import { UmiProvider } from "../context/umi"
import { TransactionStatusProvider } from "../context/transactions"
import { NftsProvider } from "../context/nfts"
import { WalletsProvider } from "../context/wallets"
import { SharkyProvider } from "../context/sharky"
import { TensorProvider } from "../context/tensor"
import { WalletBypassProvider } from "../context/wallet-bypass"
import { WagmiConfig } from "wagmi"
import { wagmiConfig } from "../helpers/wagmi"
import { BriceProvider } from "../context/brice"
import { AlchemyProvider } from "../context/alchemy"
import { SortProvider } from "../context/sort"
import { CitrusProvider } from "../context/citrus"
import { ClusterProvider } from "../context/cluster"
import { NextPageContext } from "next"
import cookie from "cookie"
import { CrowProvider } from "../apps/crow"
import { PriorityFeesProvider } from "../context/priority-fees"
import { StakeProvider } from "../apps/stake"

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css")
require("../styles/globals.scss")

interface Props extends AppProps {}

export default function Biblio({
  Component,
  pageProps: { ...pageProps },
  nonce,
}: AppProps & {
  pageProps: {
    collectionId?: string
    publicKey?: string
  }
  nonce: string
}) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST as string

  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

  return (
    <ClusterProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <AlchemyProvider>
            <WagmiConfig config={wagmiConfig}>
              <BriceProvider>
                <WalletBypassProvider>
                  <UmiProvider>
                    <AccessProvider nonce={nonce}>
                      <BasePathProvider publicKey={pageProps.publicKey}>
                        <DatabaseProvider>
                          <WalletsProvider>
                            <UiSettingsProvider>
                              <FiltersProvider>
                                <NftsProvider>
                                  <SortProvider>
                                    <TransactionStatusProvider>
                                      <WalletModalProvider>
                                        <MetaplexProvider>
                                          <TagsProvider>
                                            <ThemeProvider>
                                              <SharkyProvider>
                                                <CitrusProvider>
                                                  <TensorProvider>
                                                    <CrowProvider>
                                                      <StakeProvider>
                                                        <PriorityFeesProvider>
                                                          <Script
                                                            async
                                                            strategy="afterInteractive"
                                                            type="module"
                                                            src="https://unpkg.com/@google/model-viewer@^3.0.1/dist/model-viewer.min.js"
                                                          />
                                                          <CssBaseline />
                                                          <SelectionProvider>
                                                            <DialogProvider>
                                                              <Component {...pageProps} />
                                                            </DialogProvider>
                                                          </SelectionProvider>
                                                        </PriorityFeesProvider>
                                                      </StakeProvider>
                                                    </CrowProvider>
                                                  </TensorProvider>
                                                </CitrusProvider>
                                              </SharkyProvider>
                                            </ThemeProvider>
                                          </TagsProvider>
                                        </MetaplexProvider>
                                      </WalletModalProvider>
                                    </TransactionStatusProvider>
                                  </SortProvider>
                                </NftsProvider>
                              </FiltersProvider>
                            </UiSettingsProvider>
                          </WalletsProvider>
                        </DatabaseProvider>
                      </BasePathProvider>
                    </AccessProvider>
                  </UmiProvider>
                </WalletBypassProvider>
              </BriceProvider>
            </WagmiConfig>
          </AlchemyProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ClusterProvider>
  )
}

Biblio.getInitialProps = async (context: any) => {
  const props = await App.getInitialProps(context)
  let nonce
  if (!context.ctx.req) {
    nonce = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`nonce=`))
      ?.split("=")[1]
  } else {
    const cookies = context.ctx.res?.getHeader("set-cookie")?.[0]
    nonce = cookies ? cookie.parse(cookies)?.nonce : null
  }
  return {
    ...props,
    nonce,
  }
}
