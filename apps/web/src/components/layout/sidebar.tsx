import { Link, useLocation } from "react-router"
import {
  Folder,
  Image,
  Star,
  Coins,
  Trash2,
  User,
  Lock,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Tags,
} from "lucide-react"
import { useAtom, useAtomValue } from "jotai"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { tagsAtom, tagsLoadingAtom, type Tag as TagType } from "@/stores/user"
import { sessionAtom } from "@/stores/auth"
import { sidebarCollapsedAtom } from "@/stores/ui"
import { tierAtom } from "@/stores/tier"
import { Tier, TierBadge } from "@/components/tier-badge"
import { BiblioLogo } from "../biblio-logo"
import { TagManagementDialog } from "../tag-management-dialog"

const navItems = [
  { href: "/", label: "Collections", icon: Folder },
  { href: "/nfts", label: "All NFTs", icon: Image },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/spl", label: "Tokens", icon: Coins },
  { href: "/membership", label: "Membership", icon: Lock },
  { href: "/vault", label: "Vault", icon: Shield },
  { href: "/junk", label: "Junk", icon: Trash2 },
  { href: "/showcase", label: "Showcase", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
]

function TagNavItem({ tag, isActive }: { tag: TagType; isActive: boolean }) {
  return (
    <Link
      to={`/tags/${tag.id}`}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <div
        className={cn("h-2.5 w-2.5 rounded-full ring-2", isActive ? "ring-primary/30" : "ring-white/10")}
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate">{tag.name}</span>
    </Link>
  )
}

const tierLogoColors: Record<Exclude<Tier, Tier.Free>, string> = {
  [Tier.Bronze]: "text-amber-500 animate-logo-breathe",
  [Tier.Silver]: "text-slate-400 animate-logo-breathe",
  [Tier.Gold]: "text-yellow-400 animate-logo-breathe",
  [Tier.Diamond]: "text-cyan-400 animate-logo-breathe",
}

export function Sidebar() {
  const location = useLocation()
  const tags = useAtomValue(tagsAtom)
  const tagsLoading = useAtomValue(tagsLoadingAtom)
  const session = useAtomValue(sessionAtom)
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const tierInfo = useAtomValue(tierAtom)
  const hasTier = tierInfo && tierInfo.tier !== Tier.Free
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const isAuthenticated = !!session?.token

  return (
    <aside
      className={cn(
        "relative z-10 hidden flex-col border-r border-white/5 bg-background/80 backdrop-blur-xl transition-all duration-300 md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-white/5", collapsed ? "justify-center px-2" : "px-4")}>
        <Link to="/" className="flex items-center gap-3 group">
          <BiblioLogo
            className={cn(
              "transition-transform duration-300 group-hover:scale-110",
              hasTier ? tierLogoColors[tierInfo.tier as Exclude<Tier, Tier.Free>] : "text-white"
            )}
          />
          {!collapsed && (
            <>
              <img src="/biblio-text.svg" alt="Biblio" className="h-4 invert" />
              {hasTier && <TierBadge tier={tierInfo.tier} size="sm" />}
            </>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {!collapsed && (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Wallet
          </p>
        )}
        {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                "animate-fade-up opacity-0",
                collapsed ? "justify-center px-2" : "px-3",
                isActive
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  isActive ? "text-primary" : "group-hover:scale-110"
                )}
              />
              {!collapsed && item.label}
            </Link>
          )
        })}
      </nav>

      {/* Tags Section - hidden when collapsed or not authenticated */}
      {!collapsed && isAuthenticated && (
        <div className="border-t border-white/5 p-3">
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Tags</p>
          </div>
          {!tagsLoading && tags.length === 0 ? (
            <div className="px-3 py-2">
              <p className="text-xs text-muted-foreground/60">No tags yet</p>
              <button onClick={() => setTagDialogOpen(true)} className="mt-1 text-xs text-primary hover:underline">
                Create your first tag
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <TagNavItem key={tag.id} tag={tag} isActive={location.pathname === `/tags/${tag.id}`} />
              ))}
            </div>
          )}
          <button
            onClick={() => setTagDialogOpen(true)}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground/70 transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <Tags className="h-3.5 w-3.5" />
            Manage Tags
          </button>
          <TagManagementDialog open={tagDialogOpen} onOpenChange={setTagDialogOpen} />
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
