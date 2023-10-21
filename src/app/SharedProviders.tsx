"use client"
import { UmiProvider } from "@/context/umi"
import { ReactNode } from "react"
import { ThemeProvider } from "@/context/theme"
import { NextAuthProvider } from "./SessionProvider"
import { ClusterProvider } from "@/context/cluster"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import { SelectionProvider } from "@/context/selection"
import { SessionProvider } from "next-auth/react"
import { UiSettingsProvider } from "@/context/ui-settings"
import { ProgressProvider } from "@/context/progress"
import { DialogProvider } from "@/context/dialog"
import { BriceProvider } from "@/context/brice"
import { TransactionStatusProvider } from "@/context/transactions"
import { AccessProvider } from "@/context/access"
import { PublicKeyProvider } from "@/context/public-key"
import { ProfileProvider } from "@/context/profile"

export function SharedProviders({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST!
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  return (
    <ClusterProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <PublicKeyProvider>
            <ProfileProvider>
              <AccessProvider>
                <BriceProvider>
                  <WalletModalProvider>
                    <UmiProvider endpoint={endpoint}>
                      <UiSettingsProvider>
                        <NextAuthProvider>
                          <DialogProvider>
                            {/* <AccessProvider> */}
                            <ThemeProvider>
                              <TransactionStatusProvider>
                                <ProgressProvider>{children}</ProgressProvider>
                              </TransactionStatusProvider>
                            </ThemeProvider>
                            {/* </AccessProvider> */}
                          </DialogProvider>
                        </NextAuthProvider>
                      </UiSettingsProvider>
                    </UmiProvider>
                  </WalletModalProvider>
                </BriceProvider>
              </AccessProvider>
            </ProfileProvider>
          </PublicKeyProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ClusterProvider>
  )
}
