import type { ReactNode } from "react"
import { Link } from "react-router"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft } from "lucide-react"
import { useAtomValue } from "jotai"
import { layoutTypeAtom } from "@/stores/ui"
import { NftGrid } from "@/components/nft-grid"
import { CollageNftGrid } from "@/components/collage-nft-grid"
import { NftGridSkeleton } from "@/components/ui/skeleton"
import { LayoutControls } from "@/components/layout-controls"
import type { NFT } from "@/stores/nfts"

interface CollectionViewProps {
  nfts: NFT[]
  title: ReactNode
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
  isLoading?: boolean
  backTo?: string
  context?: string
  supportsCollage?: boolean
  headerRight?: ReactNode
}

export function CollectionView({
  nfts,
  title,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  isLoading,
  backTo,
  context,
  supportsCollage = true,
  headerRight,
}: CollectionViewProps) {
  const layoutType = useAtomValue(layoutTypeAtom)

  const renderGrid = () => {
    if (isLoading && nfts.length === 0) {
      return <NftGridSkeleton count={12} />
    }
    if (supportsCollage && layoutType === "collage") {
      return <CollageNftGrid nfts={nfts} context={context} />
    }
    return <NftGrid nfts={nfts} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link
              to={backTo}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <h1 className="text-xl font-bold">{title}</h1>
          {nfts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{nfts.length}</span> items
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LayoutControls nfts={nfts} supportsCollage={supportsCollage} />
          {headerRight}
        </div>
      </div>
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
