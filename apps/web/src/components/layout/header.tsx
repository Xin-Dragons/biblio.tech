import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { RefreshCw, Settings } from "lucide-react"
import { Link } from "react-router"
import { useSetAtom, useAtomValue } from "jotai"
import { Button } from "../ui/button"
import { refreshNftsAtom, isLoadingAtom } from "@/stores/nfts"

export function Header() {
  const refreshNfts = useSetAtom(refreshNftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => refreshNfts()} disabled={isLoading} title="Refresh NFTs">
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <WalletMultiButton />
      </div>
    </header>
  )
}
