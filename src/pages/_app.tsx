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
import { SessionProvider } from "next-auth/react"
import { NftsProvider } from "../context/nfts"
import { Session } from "next-auth"
import { InfoProvider } from "../context/info"
import { WalletsProvider } from "../context/wallets"
import { SharkyProvider } from "../context/sharky"
import { TensorProvider } from "../context/tensor"
import { WalletBypassProvider } from "../context/wallet-bypass"

// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css")
require("../styles/globals.scss")

interface Props extends AppProps {
  pageProps: {
    collectionId?: string
    publicKey?: string
    session?: Session
  }
}

const App: FC<Props> = ({ Component, pageProps: { session, ...pageProps } }) => {
  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST as string

  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletBypassProvider>
          <SessionProvider session={session}>
            <UmiProvider endpoint={process.env.NEXT_PUBLIC_RPC_HOST!}>
              <AccessProvider>
                <BasePathProvider publicKey={pageProps.publicKey}>
                  <DatabaseProvider>
                    <WalletsProvider>
                      <UiSettingsProvider>
                        <FiltersProvider>
                          <NftsProvider>
                            <TransactionStatusProvider>
                              <WalletModalProvider>
                                <MetaplexProvider>
                                  <TagsProvider>
                                    <ThemeProvider>
                                      <SharkyProvider>
                                        <TensorProvider>
                                          <InfoProvider>
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
                                          </InfoProvider>
                                        </TensorProvider>
                                      </SharkyProvider>
                                    </ThemeProvider>
                                  </TagsProvider>
                                </MetaplexProvider>
                              </WalletModalProvider>
                            </TransactionStatusProvider>
                          </NftsProvider>
                        </FiltersProvider>
                      </UiSettingsProvider>
                    </WalletsProvider>
                  </DatabaseProvider>
                </BasePathProvider>
              </AccessProvider>
            </UmiProvider>
          </SessionProvider>
        </WalletBypassProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App
