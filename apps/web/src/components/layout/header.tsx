import { useState } from "react"
import { RefreshCw, Settings, Menu, X } from "lucide-react"
import { Link, useLocation } from "react-router"
import { useSetAtom, useAtomValue } from "jotai"
import { Button } from "../ui/button"
import { WalletButton } from "../wallet-button"
import { refreshNftsAtom, isLoadingAtom } from "@/stores/nfts"
import { cn } from "@/lib/utils"
import { Folder, Image, Star, Coins, Trash2, User, Lock } from "lucide-react"

const navItems = [
  { href: "/", label: "Collections", icon: Folder },
  { href: "/nfts", label: "All NFTs", icon: Image },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/spl", label: "Tokens", icon: Coins },
  { href: "/stake", label: "Staking", icon: Lock },
  { href: "/junk", label: "Junk", icon: Trash2 },
  { href: "/showcase", label: "Showcase", icon: User },
]

export function Header() {
  const refreshNfts = useSetAtom(refreshNftsAtom)
  const isLoading = useAtomValue(isLoadingAtom)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <img src="/logo.svg" alt="Biblio" className="h-6 w-6" />
          </Link>
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
          <WalletButton />
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-card">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link to="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <img src="/logo.svg" alt="Biblio" className="h-7 w-7" />
                <span className="text-lg font-bold text-primary">Biblio</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1 p-3">
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Wallet</p>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
