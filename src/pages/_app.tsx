import { CssBaseline } from '@mui/material';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import type { AppProps } from 'next/app';
import { FC } from 'react';
import { MetaplexProvider } from '../context/metaplex';
import { SelectionProvider } from '../context/selection';
import { UiSettingsProvider } from '../context/ui-settings';
import { FrozenProvider } from '../context/frozen';
import { TagsProvider } from '../context/tags';
import { DatabaseProvider } from "../context/database";
import { FiltersProvider } from '../context/filters';
import Script from 'next/script';
import { DialogProvider } from '../context/dialog';
import { ThemeProvider } from '../context/theme';

// Use require instead of import since order matters
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.scss');

interface Props extends AppProps {
  pageProps: {
    collectionId?: string;
  }
}

const App: FC<AppProps> = ({ Component, pageProps }) => {

  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ]

  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST as string


  return (
      <ConnectionProvider endpoint={endpoint} config={{
        httpHeaders: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`
        }
      }}>
        <WalletProvider wallets={wallets} autoConnect>
          <DatabaseProvider collectionId={pageProps.collectionId}>
            <WalletModalProvider>
              <MetaplexProvider>
                <FiltersProvider collectionId={pageProps.collectionId}>
                  <FrozenProvider>
                    <TagsProvider>
                      <ThemeProvider>
                        <Script
                          async
                          strategy='afterInteractive'
                          type='module'
                          src='https://unpkg.com/@google/model-viewer@^3.0.1/dist/model-viewer.min.js'
                        />
                        <CssBaseline />
                        <SelectionProvider>
                          <UiSettingsProvider>
                            <DialogProvider>
                              <Component {...pageProps} />
                            </DialogProvider>
                          </UiSettingsProvider>
                        </SelectionProvider>
                      </ThemeProvider>
                    </TagsProvider>
                  </FrozenProvider>
                </FiltersProvider>
              </MetaplexProvider>
            </WalletModalProvider>
          </DatabaseProvider>
        </WalletProvider>
      </ConnectionProvider>
  );
};

export default App;
