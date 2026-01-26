import { useState, useMemo } from "react"
import { Search, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { NFT } from "@/stores/nfts"

interface NftPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSelect: (nfts: NFT[]) => void
  title: string
  description: string
  confirmLabel: string
}

export function NftPickerDialog({
  open,
  onOpenChange,
  nfts,
  onSelect,
  title,
  description,
  confirmLabel,
}: NftPickerDialogProps) {
  const [selectedMints, setSelectedMints] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const filteredNfts = useMemo(() => {
    if (!search) return nfts
    const q = search.toLowerCase()
    return nfts.filter(
      (nft) =>
        nft.name.toLowerCase().includes(q) ||
        nft.collectionName?.toLowerCase().includes(q) ||
        nft.mint.toLowerCase().includes(q)
    )
  }, [nfts, search])

  const toggleSelect = (mint: string) => {
    setSelectedMints((prev) => {
      const next = new Set(prev)
      if (next.has(mint)) {
        next.delete(mint)
      } else {
        next.add(mint)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedMints(new Set(filteredNfts.map((nft) => nft.mint)))
  }

  const clearSelection = () => {
    setSelectedMints(new Set())
  }

  const handleConfirm = () => {
    const selected = nfts.filter((nft) => selectedMints.has(nft.mint))
    onSelect(selected)
    setSelectedMints(new Set())
    setSearch("")
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedMints(new Set())
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search NFTs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          {selectedMints.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
          {filteredNfts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              {nfts.length === 0 ? "No NFTs available to vault" : "No NFTs match your search"}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {filteredNfts.map((nft) => {
                const isSelected = selectedMints.has(nft.mint)
                return (
                  <button
                    key={nft.mint}
                    onClick={() => toggleSelect(nft.mint)}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-lg border-2 transition-all",
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"
                    )}
                  >
                    <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" loading="lazy" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="rounded-full bg-primary p-1">
                          <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex-1 text-sm text-muted-foreground">{selectedMints.size} selected</div>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedMints.size === 0}>
            {confirmLabel} ({selectedMints.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
