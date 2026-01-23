import { Shield } from "lucide-react"
import { useWallet } from "@solana/connector/react"

export function VaultPage() {
  const { account } = useWallet()

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Vault</h1>
        </div>
      </div>

      {!account ? (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view your vault</p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Shield className="mb-4 h-12 w-12 text-primary/50" />
            <p className="text-lg font-medium">Vault</p>
            <p className="text-sm text-muted-foreground">Protect your NFTs by freezing them in the vault</p>
          </div>
        </div>
      )}
    </div>
  )
}
