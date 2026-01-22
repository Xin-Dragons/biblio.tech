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
      <header className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <img src="/logo.svg" alt="Biblio" className="h-7 w-7" />
          </Link>
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
        </div>

        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="icon-sm" className="group">
              <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            </Button>
          </Link>
          <WalletButton />
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-background-secondary border-r border-border/50 animate-slide-in-left">
            <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
              <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                <img src="/logo.svg" alt="Biblio" className="h-8 w-8" />
                <span className="font-display text-xl font-bold text-primary">Biblio</span>
              </Link>
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1 p-3">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Wallet
              </p>
              {navItems.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      "animate-fade-up opacity-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
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
