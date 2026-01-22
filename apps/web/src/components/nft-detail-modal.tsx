import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Star, Trash2, ExternalLink, Copy, Check, Tag, Zap, Lock } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"
import { selectedNftAtom } from "@/stores/nfts"
import {
  starredAtom,
  toggleStarredAtom,
  junkAtom,
  toggleJunkAtom,
  tagsAtom,
  nftTagsAtom,
  toggleNftTagAtom,
} from "@/stores/user"

export function NftDetailModal() {
  const [nft, setNft] = useAtom(selectedNftAtom)
  const starred = useAtomValue(starredAtom)
  const junk = useAtomValue(junkAtom)
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)
  const toggleStarred = useSetAtom(toggleStarredAtom)
  const toggleJunk = useSetAtom(toggleJunkAtom)
  const toggleNftTag = useSetAtom(toggleNftTagAtom)
  const [copied, setCopied] = useState(false)
  const [showTags, setShowTags] = useState(false)

  if (!nft) return null

  const isStarred = starred.has(nft.mint)
  const isJunk = junk.has(nft.mint)
  const nftTagIds = nftTags[nft.mint] ?? []

  const handleCopy = async () => {
    await navigator.clipboard.writeText(nft.mint)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setNft(null)
    setShowTags(false)
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
            {tags.length > 0 && (
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowTags(!showTags)}>
                  <Tag className="h-4 w-4" />
                  Tags ({nftTagIds.length})
                </Button>
                {showTags && (
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                    {tags.map((tag) => {
                      const isSelected = nftTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleNftTag({ mint: nft.mint, tagId: tag.id })}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                            isSelected ? "text-white shadow-sm" : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          )}
                          style={isSelected ? { backgroundColor: tag.color } : undefined}
                        >
                          {tag.name}
                        </button>
                      )
                    })}
                  </div>
                )}
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
                <span className="badge bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  <Lock className="h-3 w-3" />
                  Frozen
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
