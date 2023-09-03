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
import { AccessProvider } from "@/context/access"
import { SessionProvider } from "next-auth/react"
import { UiSettingsProvider } from "@/context/ui-settings"
import { ProgressProvider } from "@/context/progress"

export function SharedProviders({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_HOST!
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
  return (
    <ClusterProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <UmiProvider endpoint={endpoint}>
              <UiSettingsProvider>
                <NextAuthProvider>
                  <AccessProvider>
                    <ThemeProvider>
                      <ProgressProvider>{children}</ProgressProvider>
                    </ThemeProvider>
                  </AccessProvider>
                </NextAuthProvider>
              </UiSettingsProvider>
            </UmiProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ClusterProvider>
  )
}
