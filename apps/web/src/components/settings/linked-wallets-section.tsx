import { useState } from "react"
import { useWallet } from "@solana/connector/react"
import { useSetAtom } from "jotai"
import { Wallet, Plus, Trash2, Crown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LinkWalletDialog } from "./link-wallet-dialog"
import { UnlinkWalletDialog } from "./unlink-wallet-dialog"
import { skipAuthWalletSwitchAtom } from "@/stores/wallet-operations"
import type { LinkedWallet } from "@/stores/linked-wallets"

interface LinkedWalletsSectionProps {
  wallets: LinkedWallet[]
  isLoading: boolean
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

export function LinkedWalletsSection({ wallets, isLoading }: LinkedWalletsSectionProps) {
  const { account } = useWallet()
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [unlinkWallet, setUnlinkWallet] = useState<LinkedWallet | null>(null)
  const setSkipAuthWalletSwitch = useSetAtom(skipAuthWalletSwitchAtom)

  const handleOpenLinkDialog = () => {
    setSkipAuthWalletSwitch(true)
    setLinkDialogOpen(true)
  }

  const handleCloseLinkDialog = (open: boolean) => {
    if (!open) {
      setSkipAuthWalletSwitch(false)
    }
    setLinkDialogOpen(open)
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Linked Wallets</h2>
            <p className="text-sm text-muted-foreground">Manage wallets linked to your account</p>
          </div>
        </div>
        <Button onClick={handleOpenLinkDialog} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Link Wallet
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <Wallet className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">No wallets linked yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Link additional wallets for secure freeze and recovery</p>
        </div>
      ) : (
        <div className="space-y-2">
          {wallets.map((wallet) => {
            const isCurrentWallet = wallet.publicKey === account
            return (
              <div
                key={wallet.publicKey}
                className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    {wallet.isMain ? (
                      <Crown className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{shortenAddress(wallet.publicKey)}</span>
                      {wallet.isMain && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-500">Main</span>
                      )}
                      {isCurrentWallet && !wallet.isMain && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Connected</span>
                      )}
                    </div>
                    {wallet.nickname && <p className="text-xs text-muted-foreground">{wallet.nickname}</p>}
                  </div>
                </div>
                {!wallet.isMain && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setUnlinkWallet(wallet)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <LinkWalletDialog open={linkDialogOpen} onOpenChange={handleCloseLinkDialog} />

      <UnlinkWalletDialog
        open={!!unlinkWallet}
        onOpenChange={(open) => !open && setUnlinkWallet(null)}
        wallet={unlinkWallet}
      />
    </section>
  )
}
