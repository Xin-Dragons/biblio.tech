import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Star, Trash2, ExternalLink, Copy, Check, Tag, Zap, Shield, X, Plus, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
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
  const [copied, setCopied] = useState(false)

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
                  {availableTags.length > 0 ? (
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : tags.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No tags created yet</span>
                  ) : assignedTags.length === tags.length ? (
                    <span className="text-xs text-muted-foreground">All tags assigned</span>
                  ) : null}
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
