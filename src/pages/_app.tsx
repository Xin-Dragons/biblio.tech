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
import { PublicKey } from "@metaplex-foundation/js"
import { BasePathProvider } from "../context/base-path"
import { AccessProvider } from "../context/access"
import { UmiProvider } from "../context/umi"
import { TransactionStatusProvider } from "../context/transactions"
import { SessionProvider } from "next-auth/react"
import { NftsProvider } from "../context/nfts"
import { Session } from "next-auth"
import { InfoProvider } from "../context/info"

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
        <SessionProvider session={session}>
          <AccessProvider>
            <UmiProvider endpoint={process.env.NEXT_PUBLIC_RPC_HOST!}>
              <BasePathProvider publicKey={pageProps.publicKey}>
                <TransactionStatusProvider>
                  <DatabaseProvider>
                    <UiSettingsProvider>
                      <FiltersProvider>
                        <NftsProvider>
                          <WalletModalProvider>
                            <MetaplexProvider>
                              <TagsProvider>
                                <ThemeProvider>
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
                                </ThemeProvider>
                              </TagsProvider>
                            </MetaplexProvider>
                          </WalletModalProvider>
                        </NftsProvider>
                      </FiltersProvider>
                    </UiSettingsProvider>
                  </DatabaseProvider>
                </TransactionStatusProvider>
              </BasePathProvider>
            </UmiProvider>
          </AccessProvider>
        </SessionProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App
