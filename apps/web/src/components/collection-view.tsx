import type { ReactNode } from "react"
import { Link } from "react-router"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, ImageIcon, Grid3X3 } from "lucide-react"
import { useAtomValue } from "jotai"
import { cn } from "@/lib/utils"
import { sortOptionAtom, layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { SortableNftGrid } from "@/components/sortable-nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { NftGridSkeleton } from "@/components/ui/skeleton"
import type { NFT } from "@/stores/nfts"

interface CollectionViewProps {
  nfts: NFT[]
  title: string
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  headerRight?: ReactNode
  isLoading?: boolean
  backTo?: string
  image?: string
}

export function CollectionView({
  nfts,
  title,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  headerRight,
  isLoading,
  backTo,
  image,
}: CollectionViewProps) {
  const sortOption = useAtomValue(sortOptionAtom)
  const layoutType = useAtomValue(layoutTypeAtom)

  const renderGrid = () => {
    if (isLoading && nfts.length === 0) {
      return <NftGridSkeleton count={12} />
    }
    if (sortOption === "custom") {
      return <SortableNftGrid nfts={nfts} />
    }
    if (layoutType === "collage") {
      return <CollageNftGrid nfts={nfts} />
    }
    return <NftGrid nfts={nfts} />
  }

  const hasCollectionHeader = backTo || image

  return (
    <div className="flex h-full flex-col">
      {hasCollectionHeader ? (
        <div className="relative mb-6 shrink-0">
          {image && (
            <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
              <img src={image} alt="" className="h-full w-full scale-110 object-cover opacity-20 blur-2xl" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
            </div>
          )}

          <div className="flex items-center gap-5 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
            {backTo && (
              <Link
                to={backTo}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  "border border-border/50 bg-background/50",
                  "transition-all duration-200",
                  "hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                )}
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}

            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
              {image ? (
                <img src={image} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <ImageIcon className="h-6 w-6 text-primary/40" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-2xl font-bold tracking-tight">{title}</h1>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Grid3X3 className="h-3.5 w-3.5" />
                  <span>{isLoading && nfts.length === 0 ? "Loading..." : `${nfts.length} items`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h1 className="text-xl font-bold">{title}</h1>
          {headerRight}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {nfts.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <EmptyIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        ) : (
          renderGrid()
        )}
      </div>
    </div>
  )
}
