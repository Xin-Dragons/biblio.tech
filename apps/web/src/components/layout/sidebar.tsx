import { Link, useLocation } from "react-router"
import { Folder, Image, Star, Coins, Trash2, Plus, X } from "lucide-react"
import { useAtomValue, useSetAtom } from "jotai"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { tagsAtom, addTagAtom, removeTagAtom, type Tag as TagType } from "@/stores/user"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog"

const navItems = [
  { href: "/", label: "Collections", icon: Folder },
  { href: "/nfts", label: "All NFTs", icon: Image },
  { href: "/starred", label: "Starred", icon: Star },
  { href: "/spl", label: "Tokens", icon: Coins },
  { href: "/junk", label: "Junk", icon: Trash2 },
]

const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899"]

function TagItem({ tag, onRemove }: { tag: TagType; onRemove: () => void }) {
  return (
    <div className="group flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
        <span className="text-muted-foreground">{tag.name}</span>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault()
          onRemove()
        }}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
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
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Tag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                    "h-6 w-6 rounded-full transition-transform",
                    color === c && "scale-125 ring-2 ring-white ring-offset-2 ring-offset-background"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

export function Sidebar() {
  const location = useLocation()
  const tags = useAtomValue(tagsAtom)
  const removeTag = useSetAtom(removeTagAtom)

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Biblio" className="h-7 w-7" />
          <span className="text-lg font-bold text-primary">Biblio</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Wallet</p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
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
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tags</p>
          <AddTagDialog />
        </div>
        {tags.length === 0 ? (
          <p className="px-3 text-xs text-muted-foreground">No tags yet</p>
        ) : (
          <div className="space-y-0.5">
            {tags.map((tag) => (
              <TagItem key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
