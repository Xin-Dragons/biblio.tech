import { useWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { Coins, ExternalLink } from "lucide-react"
import { tokensAtom, tokensLoadingAtom, fetchTokensAtom, type Token } from "@/stores/nfts"
import { Button } from "@/components/ui/button"

function TokenCard({ token }: { token: Token }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
      {token.image ? (
        <img src={token.image} alt={token.name} className="h-12 w-12 shrink-0 rounded-full" />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <Coins className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{token.name || "Unknown Token"}</h3>
          {token.symbol && <span className="shrink-0 text-sm text-muted-foreground">{token.symbol}</span>}
        </div>
        <p className="text-lg font-bold">
          {token.uiBalance.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: token.decimals > 4 ? 4 : token.decimals,
          })}
        </p>
      </div>
      <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
        <Button variant="ghost" size="icon">
          <ExternalLink className="h-4 w-4" />
        </Button>
      </a>
    </div>
  )
}

export function SplPage() {
  const { isConnected, account } = useWallet()
  const tokens = useAtomValue(tokensAtom)
  const isLoading = useAtomValue(tokensLoadingAtom)
  const fetchTokens = useSetAtom(fetchTokensAtom)

  useEffect(() => {
    if (isConnected && account) {
      fetchTokens(account)
    }
  }, [isConnected, account, fetchTokens])

  if (!isConnected) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Coins className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-lg font-medium">Connect your wallet</p>
        <p className="text-sm text-muted-foreground">to view your SPL tokens</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading tokens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">SPL Tokens</h1>
        <p className="text-sm text-muted-foreground">{tokens.length} tokens</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tokens.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <Coins className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">No tokens found</p>
            <p className="text-sm text-muted-foreground">Your SPL tokens will appear here</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <TokenCard key={token.mint} token={token} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
