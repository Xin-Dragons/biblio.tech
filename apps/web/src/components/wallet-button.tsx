import { useState } from "react"
import {
  useWallet,
  useAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWalletConnectors,
  useTransactionSigner,
} from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { Wallet, LogOut, LogIn, ChevronDown, Copy, Check, ExternalLink } from "lucide-react"
import { sessionAtom, signInAtom, signOutAtom, explicitlySignedOutAtom, connectedWalletAtom } from "@/stores/auth"
import { clearLinkedWalletsAtom } from "@/stores/linked-wallets"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { cn } from "@/lib/utils"

export function WalletButton() {
  const { isConnected, isConnecting } = useWallet()
  const { address, formatted, copy, copied } = useAccount()
  const { connect } = useConnectWallet()
  const { disconnect } = useDisconnectWallet()
  const { signer, capabilities } = useTransactionSigner()
  const connectors = useWalletConnectors()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  const session = useAtomValue(sessionAtom)
  const signIn = useSetAtom(signInAtom)
  const signOut = useSetAtom(signOutAtom)
  const setExplicitlySignedOut = useSetAtom(explicitlySignedOutAtom)
  const setConnectedWallet = useSetAtom(connectedWalletAtom)
  const clearLinkedWallets = useSetAtom(clearLinkedWalletsAtom)

  const isSessionValid = session && session.wallet === address && session.expiresAt > Date.now()
  const installedWallets = connectors.filter((c) => c.ready)

  const handleSignIn = async () => {
    if (!address || !signer || !capabilities.canSignMessage) return
    setExplicitlySignedOut(false)
    setIsSigningIn(true)
    try {
      const signMessage = async (message: Uint8Array) => {
        if (!signer.signMessage) throw new Error("Wallet does not support message signing")
        return signer.signMessage(message)
      }
      await signIn({ publicKey: address, signMessage })
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setExplicitlySignedOut(true)
    clearLinkedWallets()
    await signOut()
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 pl-3 pr-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
              <Wallet className="h-3 w-3 text-primary" />
            </div>
            <span className="font-mono text-xs">{formatted}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => copy()} className="gap-2">
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Address"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Solscan
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isSessionValid ? (
            <DropdownMenuItem onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleSignIn}
              disabled={isSigningIn || !capabilities.canSignMessage}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              {isSigningIn ? "Signing In..." : "Sign In"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => {
              setConnectedWallet(null)
              disconnect()
            }}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button variant="default" onClick={() => setShowWalletModal(true)} disabled={isConnecting} className="gap-2" glow>
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect"}
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 pt-2">
            {installedWallets.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No wallets detected. Please install a Solana wallet extension.
                </p>
              </div>
            ) : (
              installedWallets.map((wallet, index) => (
                <button
                  key={wallet.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-border p-4",
                    "transition-all duration-200",
                    "hover:border-primary/30 hover:bg-accent/50",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    "animate-fade-up opacity-0"
                  )}
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
                  onClick={async () => {
                    await connect(wallet.id)
                    setConnectedWallet({ id: wallet.id, name: wallet.name })
                    setShowWalletModal(false)
                  }}
                >
                  {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 rounded-lg" />}
                  <span className="font-medium">{wallet.name}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
