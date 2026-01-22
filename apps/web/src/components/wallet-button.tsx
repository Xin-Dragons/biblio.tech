import { useState } from "react"
import {
  useWallet,
  useAccount,
  useConnectWallet,
  useDisconnectWallet,
  useWalletConnectors,
} from "@solana/connector/react"
import { Wallet, LogOut, ChevronDown, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"

export function WalletButton() {
  const { isConnected, isConnecting } = useWallet()
  const { address, formatted, copy, copied } = useAccount()
  const { connect } = useConnectWallet()
  const { disconnect } = useDisconnectWallet()
  const connectors = useWalletConnectors()
  const [showWalletModal, setShowWalletModal] = useState(false)

  const installedWallets = connectors.filter((c) => c.ready)

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {formatted}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => copy()}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied!" : "Copy Address"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Solscan
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => disconnect()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={() => setShowWalletModal(true)} disabled={isConnecting} className="gap-2">
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            {installedWallets.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No wallets detected. Please install a Solana wallet extension.
              </p>
            ) : (
              installedWallets.map((wallet) => (
                <Button
                  key={wallet.id}
                  variant="outline"
                  className="justify-start gap-3 h-12"
                  onClick={async () => {
                    await connect(wallet.id)
                    setShowWalletModal(false)
                  }}
                >
                  {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="h-6 w-6 rounded" />}
                  {wallet.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
