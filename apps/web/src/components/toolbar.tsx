import { useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import {
  Search,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  MousePointerClick,
  X,
  CheckSquare,
  LayoutDashboard,
  AlignJustify,
  Send,
  Flame,
  Camera,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  layoutSizeAtom,
  layoutTypeAtom,
  searchQueryAtom,
  sortOptionAtom,
  type LayoutSize,
  type LayoutType,
  type SortOption,
} from "@/stores/ui"
import {
  isSelectModeAtom,
  toggleSelectModeAtom,
  selectedMintsAtom,
  selectAllAtom,
  clearSelectionAtom,
} from "@/stores/selection"
import { filteredNftsAtom, refreshNftsAtom } from "@/stores/nfts"
import { BulkSendDialog } from "./bulk-send-dialog"
import { BulkBurnDialog } from "./bulk-burn-dialog"
import { CollageExportDialog } from "./collage-export-dialog"

const layoutOptions: { value: LayoutSize; icon: typeof Grid2X2; label: string }[] = [
  { value: "large", icon: Grid2X2, label: "Large" },
  { value: "medium", icon: Grid3X3, label: "Medium" },
  { value: "small", icon: LayoutGrid, label: "Small" },
]

const layoutTypeOptions: { value: LayoutType; icon: typeof Grid2X2; label: string }[] = [
  { value: "grid", icon: AlignJustify, label: "Grid" },
  { value: "collage", icon: LayoutDashboard, label: "Collage" },
]

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "collection", label: "Collection" },
  { value: "name", label: "Name" },
  { value: "rarity", label: "Rarity" },
  { value: "recent", label: "Recent" },
  { value: "custom", label: "Custom" },
]

export function Toolbar() {
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)
  const [layoutType, setLayoutType] = useAtom(layoutTypeAtom)
  const [sortOption, setSortOption] = useAtom(sortOptionAtom)
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom)
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const toggleSelectMode = useSetAtom(toggleSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const selectAll = useSetAtom(selectAllAtom)
  const clearSelection = useSetAtom(clearSelectionAtom)
  const filteredNfts = useAtomValue(filteredNftsAtom)
  const refreshNfts = useSetAtom(refreshNftsAtom)

  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [collageDialogOpen, setCollageDialogOpen] = useState(false)

  const selectedNfts = filteredNfts.filter((nft) => selectedMints.has(nft.mint))

  const handleActionSuccess = () => {
    clearSelection()
    toggleSelectMode()
    refreshNfts()
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-4 border-b border-border bg-card/50 px-4 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full max-w-sm rounded-md border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {isSelectMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{selectedMints.size} selected</span>

            <button
              onClick={() => setSendDialogOpen(true)}
              disabled={selectedMints.size === 0}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                selectedMints.size > 0
                  ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border-border bg-background text-muted-foreground opacity-50"
              )}
              title="Send selected NFTs"
            >
              <Send className="h-4 w-4" />
              Send
            </button>

            <button
              onClick={() => setBurnDialogOpen(true)}
              disabled={selectedMints.size === 0}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
                selectedMints.size > 0
                  ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "border-border bg-background text-muted-foreground opacity-50"
              )}
              title="Burn selected NFTs"
            >
              <Flame className="h-4 w-4" />
              Burn
            </button>

            <div className="mx-2 h-6 w-px bg-border" />

            <button
              onClick={() => selectAll(filteredNfts.map((nft) => nft.mint))}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-accent"
            >
              <CheckSquare className="h-4 w-4" />
              Select All
            </button>
            <button
              onClick={() => clearSelection()}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-accent"
              disabled={selectedMints.size === 0}
            >
              Clear
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSelectMode()}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
              isSelectMode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            title="Select mode"
          >
            {isSelectMode ? <X className="h-4 w-4" /> : <MousePointerClick className="h-4 w-4" />}
            {isSelectMode ? "Done" : "Select"}
          </button>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          <div className="flex rounded-md border border-border">
            {layoutTypeOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setLayoutType(option.value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center transition-colors",
                    layoutType === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>

          {layoutType === "collage" && (
            <button
              onClick={() => setCollageDialogOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Download collage image"
            >
              <Camera className="h-4 w-4" />
              Collage
            </button>
          )}

          <div className="flex rounded-md border border-border">
            {layoutOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setLayoutSize(option.value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center transition-colors",
                    layoutSize === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {sendDialogOpen && (
        <BulkSendDialog nfts={selectedNfts} onClose={() => setSendDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

      {burnDialogOpen && (
        <BulkBurnDialog nfts={selectedNfts} onClose={() => setBurnDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

      {collageDialogOpen && <CollageExportDialog onClose={() => setCollageDialogOpen(false)} />}
    </>
  )
}
