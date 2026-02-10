import { useState } from "react"
import { useAtom } from "jotai"
import { Square, Grid2X2, Grid3X3, LayoutDashboard, MousePointerClick, Camera } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  layoutTypeAtom,
  layoutSizeAtom,
  sortOptionAtom,
  type LayoutSize,
  type LayoutType,
  type SortOption,
} from "@/stores/ui"
import { CollageExportDialog } from "@/components/collage-export-dialog"
import { SelectionControls } from "@/components/selection-controls"
import { TagFilterDropdown } from "@/components/tag-filter-dropdown"
import { Button } from "@/components/ui/button"
import type { NFT } from "@/stores/nfts"

const layoutOptions: { value: LayoutSize; icon: typeof Square; label: string }[] = [
  { value: "large", icon: Square, label: "Large" },
  { value: "medium", icon: Grid2X2, label: "Medium" },
  { value: "small", icon: Grid3X3, label: "Small" },
]

const layoutTypeOptions: { value: LayoutType; icon: typeof Grid2X2; label: string }[] = [
  { value: "manage", icon: MousePointerClick, label: "Manage" },
  { value: "collage", icon: LayoutDashboard, label: "Collage" },
]

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "collection", label: "Collection" },
  { value: "name", label: "Name" },
  { value: "rarity", label: "Rarity" },
  { value: "recent", label: "Recent" },
]

interface LayoutControlsProps {
  nfts: NFT[]
  supportsCollage?: boolean
  showSelectionControls?: boolean
  showTagFilter?: boolean
}

export function LayoutControls({
  nfts,
  supportsCollage = true,
  showSelectionControls = true,
  showTagFilter = true,
}: LayoutControlsProps) {
  const [layoutType, setLayoutType] = useAtom(layoutTypeAtom)
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)
  const [sortOption, setSortOption] = useAtom(sortOptionAtom)
  const [collageDialogOpen, setCollageDialogOpen] = useState(false)

  const showManageControls = !supportsCollage || layoutType === "manage"

  return (
    <>
      <div className="flex items-center gap-2">
        {supportsCollage && layoutType === "collage" && (
          <Button variant="outline" size="sm" onClick={() => setCollageDialogOpen(true)} className="gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
        {showManageControls && (
          <>
            {showSelectionControls && import.meta.env.VITE_FEATURE_SELECT === "true" && (
              <SelectionControls nfts={nfts} />
            )}
            {showTagFilter && <TagFilterDropdown />}
            {import.meta.env.VITE_FEATURE_SORT === "true" && (
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className={cn(
                  "h-8 rounded-md border border-border bg-background px-2.5 text-sm",
                  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                  "cursor-pointer"
                )}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            <div className="flex overflow-hidden rounded-md border border-border">
              {layoutOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setLayoutSize(option.value)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center transition-colors",
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
          </>
        )}
        {supportsCollage && (
          <div className="flex overflow-hidden rounded-md border border-border">
            {layoutTypeOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setLayoutType(option.value)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 px-3 text-sm transition-colors",
                    layoutType === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {collageDialogOpen && <CollageExportDialog onClose={() => setCollageDialogOpen(false)} />}
    </>
  )
}
