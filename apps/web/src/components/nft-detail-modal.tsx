import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Star, Trash2, ExternalLink, Copy, Check, Tag, Zap, Shield, X, Plus, ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Input } from "./ui/input"
import { cn } from "@/lib/utils"
import { selectedNftAtom } from "@/stores/nfts"
import {
  starredAtom,
  toggleStarredAtom,
  junkAtom,
  toggleJunkAtom,
  tagsAtom,
  nftTagsAtom,
  bulkUpdateNftTagsAtom,
  createTagAtom,
  PRESET_COLORS,
} from "@/stores/user"
import { isAuthenticatedAtom } from "@/stores/auth"

export function NftDetailModal() {
  const [nft, setNft] = useAtom(selectedNftAtom)
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const bulkUpdateNftTags = useSetAtom(bulkUpdateNftTagsAtom)
  const createTag = useSetAtom(createTagAtom)
  const [copied, setCopied] = useState(false)
  const [isCreatingTag, setIsCreatingTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState<string>(PRESET_COLORS[5])
  const [isLoading, setIsLoading] = useState(false)

  if (!nft) return null

  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const nftTagIds = nftTags[nft.mint] ?? []
  const assignedTags = tags.filter((tag) => nftTagIds.includes(tag.id))
  const availableTags = tags.filter((tag) => !nftTagIds.includes(tag.id))

  const handleAddTag = (tagId: string) => {
    bulkUpdateNftTags({ tagId, add: [nft.mint] })
  }

  const handleRemoveTag = (tagId: string) => {
    bulkUpdateNftTags({ tagId, remove: [nft.mint] })
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required")
      return
    }
    if (newTagName.length > 30) {
      toast.error("Tag name must be 30 characters or less")
      return
    }

    setIsLoading(true)
    try {
      const newTag = await createTag({ name: newTagName.trim(), color: newTagColor })
      if (newTag) {
        await bulkUpdateNftTags({ tagId: newTag.id, add: [nft.mint] })
        toast.success(`Created "${newTagName.trim()}" and added NFT`)
      }
      setNewTagName("")
      setNewTagColor(PRESET_COLORS[5])
      setIsCreatingTag(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tag")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(nft.mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setNft(null)
  }

  return (
    <Dialog open={!!nft} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display">{nft.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted">
              <img src={nft.image} alt={nft.name} className="aspect-square w-full object-cover" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant={isStarred ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => toggleStarred(nft.mint)}
              >
                <Star className={cn("h-4 w-4", isStarred && "fill-current")} />
                {isStarred ? "Starred" : "Star"}
              </Button>
              <Button
                variant={isJunk ? "destructive" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => toggleJunk(nft.mint)}
              >
                <Trash2 className="h-4 w-4" />
                {isJunk ? "Junked" : "Junk"}
              </Button>
            </div>

            {/* Tags */}
            {isAuthenticated && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {assignedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-black/20 transition-colors"
                        aria-label={`Remove ${tag.name} tag`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {isCreatingTag ? (
                    <div className="flex w-full flex-col gap-2 rounded-lg border border-primary/50 bg-primary/5 p-2">
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="Tag name"
                        maxLength={30}
                        disabled={isLoading}
                        autoFocus
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateTag()
                          if (e.key === "Escape") {
                            setIsCreatingTag(false)
                            setNewTagName("")
                          }
                        }}
                      />
                      <div className="flex items-center gap-1">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setNewTagColor(color)}
                            className={cn(
                              "h-5 w-5 rounded-full transition-all",
                              newTagColor === color ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                            )}
                            style={{ backgroundColor: color }}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setIsCreatingTag(false)
                            setNewTagName("")
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={handleCreateTag}
                          disabled={isLoading || !newTagName.trim()}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                          <Plus className="h-3 w-3" />
                          Add Tag
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {availableTags.map((tag) => (
                          <DropdownMenuItem key={tag.id} onClick={() => handleAddTag(tag.id)} className="gap-2">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            {tag.name}
                          </DropdownMenuItem>
                        ))}
                        {availableTags.length > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => setIsCreatingTag(true)} className="gap-2">
                          <Plus className="h-3 w-3" />
                          New Tag
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-5">
            {/* Collection */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Collection</h4>
              <p className="text-sm font-medium">{nft.collectionName ?? "Unknown Collection"}</p>
            </div>

            {/* Mint Address */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mint Address</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs">{nft.mint}</code>
                <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a href={`https://solscan.io/token/${nft.mint}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon-sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Listed Price */}
            {nft.listing?.price && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Listed Price</h4>
                <p className="font-display text-2xl font-bold text-primary">
                  {(Number(nft.listing.price) / 1e9).toFixed(3)} SOL
                </p>
                <p className="text-xs text-muted-foreground">on {nft.listing.source}</p>
              </div>
            )}

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              {nft.compressed && (
                <span className="badge badge-primary">
                  <Zap className="h-3 w-3" />
                  Compressed
                </span>
              )}
              {nft.frozen && (
                <span className="badge bg-primary/15 text-primary border border-primary/20">
                  <Shield className="h-3 w-3" />
                  Vault
                </span>
              )}
            </div>

            {/* Attributes */}
            {nft.attributes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Attributes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {nft.attributes.map((attr, i) => (
                    <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {attr.trait_type}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
