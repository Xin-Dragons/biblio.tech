import { CssBaseline } from '@mui/material';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
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
import { SortingProvider } from '../context/sorting';
import { WalletProvider } from '../context/wallet';
import { PublicKey } from '@metaplex-foundation/js';
import { BasePathProvider } from '../context/base-path';

// Use require instead of import since order matters
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.scss');

interface Props extends AppProps {
  pageProps: {
    collectionId?: string;
    publicKey?: string;

  }
}

const App: FC<Props> = ({ Component, pageProps }) => {

  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST as string

  return (
      <ConnectionProvider endpoint={endpoint} config={{
        httpHeaders: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_HELLO_MOON_API_KEY}`
        }
      }}>
        <BasePathProvider publicKey={pageProps.publicKey}>
          <WalletProvider publicKey={pageProps.publicKey && new PublicKey(pageProps.publicKey)}>
            <DatabaseProvider collectionId={pageProps.collectionId} publicKey={pageProps.publicKey}>
              <WalletModalProvider>
                <MetaplexProvider>
                  <SortingProvider>  
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
                  </SortingProvider>
                </MetaplexProvider>
              </WalletModalProvider>
            </DatabaseProvider>
          </WalletProvider>
        </BasePathProvider>
      </ConnectionProvider>
  );
};

export default App;
