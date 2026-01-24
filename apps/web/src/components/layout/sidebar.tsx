import { Link, useLocation } from "react-router"
import {
  Folder,
  Image,
  Star,
  Coins,
  Trash2,
  Plus,
  X,
  User,
  Lock,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { tagsAtom, addTagAtom, removeTagAtom, type Tag as TagType } from "@/stores/user"
import { sidebarCollapsedAtom } from "@/stores/ui"
import { tierAtom } from "@/stores/tier"
import { Tier, TierBadge } from "@/components/tier-badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"
import { BiblioLogo } from "../biblio-logo"

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

const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"]

function TagItem({ tag, onRemove }: { tag: TagType; onRemove: () => void }) {
  return (
    <div className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-accent/50">
      <div className="flex items-center gap-2.5">
        <div className="h-2.5 w-2.5 rounded-full ring-2 ring-white/10" style={{ backgroundColor: tag.color }} />
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{tag.name}</span>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault()
          onRemove()
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  )
}

function AddTagDialog() {
  const addTag = useSetAtom(addTagAtom)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [color, setColor] = useState(TAG_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addTag({ name: name.trim(), color })
    setName("")
    setColor(TAG_COLORS[0])
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="h-6 w-6 opacity-60 hover:opacity-100">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag name" autoFocus />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-all duration-200",
                    color === c
                      ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-background"
                      : "hover:scale-105 ring-1 ring-white/20"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const removeTag = useSetAtom(removeTagAtom)
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom)
  const tierInfo = useAtomValue(tierAtom)
  const hasTier = tierInfo && tierInfo.tier !== Tier.Free

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

      {/* Tags Section - hidden when collapsed */}
      {!collapsed && (
        <div className="border-t border-white/5 p-3">
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Tags</p>
            <AddTagDialog />
          </div>
          {tags.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground/60">No tags yet</p>
          ) : (
            <div className="space-y-0.5">
              {tags.map((tag) => (
                <TagItem key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
              ))}
            </div>
          )}
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
