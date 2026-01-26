import { Link } from "react-router"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Search, RefreshCw, Settings, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { searchQueryAtom, showInfoAtom } from "@/stores/ui"
import { refreshNftsAtom, isLoadingAtom } from "@/stores/nfts"
import { WalletButton } from "./wallet-button"
import { Button } from "./ui/button"

export function Toolbar() {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom)
  const refreshNfts = useSetAtom(refreshNftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const [showInfo, setShowInfo] = useAtom(showInfoAtom)

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl">
      {/* Refresh */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => refreshNfts()}
        disabled={isLoading}
        title="Refresh NFTs"
        className="group"
      >
        <RefreshCw
          className={cn(
            "h-4 w-4 transition-transform duration-500",
            isLoading ? "animate-spin" : "group-hover:rotate-180"
          )}
        />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search NFTs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            "h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm",
            "placeholder:text-muted-foreground/60",
            "transition-all duration-200",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "hover:border-white/20"
          )}
        />
      </div>

      {/* Far Right - Info Toggle, Settings & Wallet */}
      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant={showInfo ? "default" : "ghost"}
          size="icon-sm"
          onClick={() => setShowInfo(!showInfo)}
          title={showInfo ? "Hide NFT Info" : "Show NFT Info"}
        >
          <Info className="h-4 w-4" />
        </Button>
        <Link to="/settings">
          <Button variant="ghost" size="icon-sm" className="group" title="Settings">
            <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          </Button>
        </Link>
        <WalletButton />
      </div>
    </div>
  )
}
