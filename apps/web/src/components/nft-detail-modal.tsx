import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { Star, Trash2, ExternalLink, Copy, Check, Tag } from "lucide-react"
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
          <DialogTitle className="pr-8">{nft.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={nft.image} alt={nft.name} className="aspect-square w-full object-cover" />
            </div>

            <div className="flex gap-2">
              <Button
                variant={isStarred ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => toggleStarred(nft.mint)}
              >
                <Star className={cn("mr-2 h-4 w-4", isStarred && "fill-current")} />
                {isStarred ? "Starred" : "Star"}
              </Button>
              <Button
                variant={isJunk ? "destructive" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => toggleJunk(nft.mint)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isJunk ? "Marked Junk" : "Mark Junk"}
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowTags(!showTags)}>
                  <Tag className="mr-2 h-4 w-4" />
                  Tags ({nftTagIds.length})
                </Button>
                {showTags && (
                  <div className="flex flex-wrap gap-2 rounded-lg border border-border p-2">
                    {tags.map((tag) => {
                      const isSelected = nftTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleNftTag({ mint: nft.mint, tagId: tag.id })}
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
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

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Collection</h4>
              <p className="text-sm">{nft.collectionName ?? "Unknown Collection"}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Mint Address</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{nft.mint}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
                <a
                  href={`https://solscan.io/token/${nft.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {nft.listing?.price && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Listed Price</h4>
                <p className="text-lg font-bold">{(Number(nft.listing.price) / 1e9).toFixed(3)} SOL</p>
                <p className="text-xs text-muted-foreground">on {nft.listing.source}</p>
              </div>
            )}

            <div className="flex gap-2 text-xs">
              {nft.compressed && <span className="rounded bg-purple-500/20 px-2 py-1 text-purple-400">Compressed</span>}
              {nft.frozen && <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-400">Frozen</span>}
            </div>

            {nft.attributes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Attributes</h4>
                <div className="grid grid-cols-2 gap-2">
                  {nft.attributes.map((attr, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-2">
                      <p className="text-xs text-muted-foreground">{attr.trait_type}</p>
                      <p className="truncate text-sm font-medium">{attr.value}</p>
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
