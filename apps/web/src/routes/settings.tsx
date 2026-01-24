import { useState } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Settings, Wallet, Shield, Link2, LogIn, Loader2 } from "lucide-react"
import { sessionAtom, signInAtom, explicitlySignedOutAtom } from "@/stores/auth"
import { isLinkingWalletAtom } from "@/hooks/use-wallet-linking"
import { fetchLinkedWalletsAtom, linkedWalletsAtom, linkedWalletsLoadingAtom } from "@/stores/linked-wallets"
import { LinkedWalletsSection } from "@/components/settings/linked-wallets-section"
import { Button } from "@/components/ui/button"

export function SettingsPage() {
  const { isConnected, account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const session = useAtomValue(sessionAtom)
  const signIn = useSetAtom(signInAtom)
  const setExplicitlySignedOut = useSetAtom(explicitlySignedOutAtom)
  const isLinkingWallet = useAtomValue(isLinkingWalletAtom)
  const fetchLinkedWallets = useSetAtom(fetchLinkedWalletsAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const isLoading = useAtomValue(linkedWalletsLoadingAtom)
  const [isSigningIn, setIsSigningIn] = useState(false)

  // Session is valid if connected with main wallet OR a linked wallet
  const isLinkedWallet = linkedWallets.some((w) => w.publicKey === account)
  const isSessionValid = session && session.expiresAt > Date.now() && (session.wallet === account || isLinkedWallet)

  const handleSignIn = async () => {
    if (!account || !signer || !capabilities.canSignMessage) return
    setExplicitlySignedOut(false)
    setIsSigningIn(true)
    try {
      const signMessage = async (message: Uint8Array) => {
        if (!signer.signMessage) throw new Error("Wallet does not support message signing")
        return signer.signMessage(message)
      }
      await signIn({ publicKey: account, signMessage })
    } finally {
      setIsSigningIn(false)
    }
  }

  useEffect(() => {
    if (isSessionValid) {
      fetchLinkedWallets()
    }
  }, [isSessionValid, fetchLinkedWallets])

  if ((!isConnected || !isSessionValid) && !isLinkingWallet) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center animate-fade-up">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <Settings className="relative h-10 w-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold">Settings</h1>
          <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
            {isConnected ? "Sign in to access settings" : "Connect your wallet to access settings"}
          </p>
          {isConnected && (
            <Button
              onClick={handleSignIn}
              disabled={isSigningIn || !capabilities.canSignMessage}
              className="mt-6 gap-2"
              glow
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h1 className="font-display text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 max-w-2xl">
          <LinkedWalletsSection wallets={linkedWallets} isLoading={isLoading} />

          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Vault Information</h2>
                <p className="text-sm text-muted-foreground">How linked wallets work with vault</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground space-y-2">
              <p className="flex items-start gap-2">
                <Link2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Secure Freeze:</strong> When you vault NFTs with a linked wallet
                  as delegate, only that wallet can unfreeze them.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Wallet className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Recover:</strong> If your main wallet is compromised, use a linked
                  wallet to recover vaulted NFTs to safety.
                </span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
