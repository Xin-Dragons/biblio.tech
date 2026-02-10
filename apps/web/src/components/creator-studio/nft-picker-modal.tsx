import { useState, useCallback, useEffect, useMemo, memo } from "react"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Search, FolderOpen, Loader2, ImageIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import {
  rpcRequest,
  type CollectionNft,
  type CollectionNftGridCellData,
  type HeliusDasAsset,
  getModalGridColumnCount,
} from "@/lib/creator-studio"
import { API_BASE } from "@/lib/api"

interface HeliusDasAssetExtended extends HeliusDasAsset {
  specification_asset_class?: string
}

interface HeliusDasResponseExtended {
  items: HeliusDasAssetExtended[]
  total: number
  grand_total?: number
}

interface AssetByAuthorityResponse {
  assets: Array<{
    mint: string
    name: string
    uri: string
    image: string | null
    standard: "core" | "nifty" | "pnft"
  }>
}

async function fetchUserCollectionNfts(ownerAddress: string): Promise<CollectionNft[]> {
  const allCollections: CollectionNft[] = []
  let page = 1
  let total = 1

  while (allCollections.length < total) {
    const response = await rpcRequest<HeliusDasResponseExtended>("getAssetsByOwner", {
      ownerAddress,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })

    total = response.grand_total ?? response.total

    for (const item of response.items) {
      const isCollection = item.specification_asset_class === "nft_collection" || item.interface === "MplCoreCollection"
      if (!isCollection) continue

      const rawImage = item.content?.links?.image ?? item.content?.files?.[0]?.uri ?? ""
      allCollections.push({
        mint: item.id,
        name: item.content?.metadata?.name ?? "Unknown Collection",
        image: rawImage,
      })
    }
    page++
  }

  return allCollections
}

async function fetchNftsWithUpdateAuthority(authorityAddress: string): Promise<CollectionNft[]> {
  const response = await fetch(`${API_BASE}/nfts/by-authority/${authorityAddress}`)
  if (!response.ok) {
    throw new Error("Failed to fetch NFTs by authority")
  }

  const data = (await response.json()) as AssetByAuthorityResponse

  return data.assets.map((asset) => ({
    mint: asset.mint,
    name: asset.name,
    image: asset.image ?? "",
  }))
}

const CollectionNftCard = memo(function CollectionNftCard({
  nft,
  isSelected,
  onSelect,
}: {
  nft: CollectionNft
  isSelected: boolean
  onSelect: () => void
}) {
  const truncatedMint = `${nft.mint.slice(0, 4)}...${nft.mint.slice(-4)}`

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative rounded-lg border bg-card overflow-hidden transition-all text-left w-full",
        "hover:border-primary/50 hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
    >
      <div className="aspect-square relative bg-muted">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        {isSelected && <div className="absolute inset-0 bg-primary/20" />}
      </div>
      <div className="p-2 space-y-0.5">
        <p className="text-sm font-medium truncate" title={nft.name}>
          {nft.name}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{truncatedMint}</p>
      </div>
    </button>
  )
})

function CollectionNftGridCell({
  columnIndex,
  rowIndex,
  style,
  data,
}: GridChildComponentProps<CollectionNftGridCellData>) {
  const { nfts, columnCount, selectedMint, onSelect } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  return (
    <div style={style} className="p-1.5">
      <CollectionNftCard nft={nft} isSelected={selectedMint === nft.mint} onSelect={() => onSelect(nft.mint)} />
    </div>
  )
}

type PickerMode = "collection" | "updateAuthority"

const PICKER_CONFIG = {
  collection: {
    title: "Choose Collection",
    description: "Select a collection NFT that you own",
    emptyMessage: "No collection NFTs found",
    emptyHint: "Create a collection NFT first",
    buttonText: "Select Collection",
  },
  updateAuthority: {
    title: "Choose NFT to Update",
    description: "Select an NFT you have update authority for",
    emptyMessage: "No updatable NFTs found",
    emptyHint: "You don't have update authority for any NFTs",
    buttonText: "Select NFT",
  },
}

interface NftPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (mintAddress: string) => void
  account: string | null
  mode?: PickerMode
}

export function NftPickerModal({ open, onClose, onSelect, account, mode = "collection" }: NftPickerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [nfts, setNfts] = useState<CollectionNft[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMint, setSelectedMint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedMode, setLoadedMode] = useState<PickerMode | null>(null)

  const config = PICKER_CONFIG[mode]

  const filteredNfts = useMemo(() => {
    if (!searchQuery.trim()) return nfts
    const query = searchQuery.toLowerCase()
    return nfts.filter((nft) => nft.name.toLowerCase().includes(query) || nft.mint.toLowerCase().includes(query))
  }, [nfts, searchQuery])

  const loadNfts = useCallback(async () => {
    if (!account) return

    setIsLoading(true)
    setError(null)

    try {
      const fetchedNfts =
        mode === "collection" ? await fetchUserCollectionNfts(account) : await fetchNftsWithUpdateAuthority(account)
      setNfts(fetchedNfts)
      setLoadedMode(mode)
    } catch (err) {
      console.error("Failed to load NFTs:", err)
      setError(err instanceof Error ? err.message : "Failed to load NFTs")
    } finally {
      setIsLoading(false)
    }
  }, [account, mode])

  useEffect(() => {
    if (open && account && (nfts.length === 0 || loadedMode !== mode)) {
      loadNfts()
    }
  }, [open, account, nfts.length, loadedMode, mode, loadNfts])

  useEffect(() => {
    if (!open) {
      setSelectedMint(null)
      setSearchQuery("")
    }
  }, [open])

  // Reset nfts when mode changes
  useEffect(() => {
    if (loadedMode !== null && loadedMode !== mode) {
      setNfts([])
    }
  }, [mode, loadedMode])

  const handleSelect = useCallback((mint: string) => {
    setSelectedMint(mint)
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedMint) {
      onSelect(selectedMint)
      onClose()
    }
  }, [selectedMint, onSelect, onClose])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {!account ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
              <p className="text-muted-foreground font-medium">Connect your wallet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">to view your NFTs</p>
            </div>
          ) : isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground font-medium mt-4">Loading NFTs...</p>
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={loadNfts}>
                Try Again
              </Button>
            </div>
          ) : filteredNfts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FolderOpen className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                {nfts.length === 0 ? config.emptyMessage : "No NFTs match your search"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {nfts.length === 0 ? config.emptyHint : "Try a different search term"}
              </p>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <AutoSizer>
                {({ width, height }) => {
                  const columnCount = getModalGridColumnCount(width)
                  const columnWidth = width / columnCount
                  const rowHeight = columnWidth * 1.3
                  const rowCount = Math.ceil(filteredNfts.length / columnCount)

                  return (
                    <FixedSizeGrid<CollectionNftGridCellData>
                      width={width}
                      height={height}
                      columnCount={columnCount}
                      columnWidth={columnWidth}
                      rowCount={rowCount}
                      rowHeight={rowHeight}
                      itemData={{ nfts: filteredNfts, columnCount, selectedMint, onSelect: handleSelect }}
                      className="scrollbar-hide"
                    >
                      {CollectionNftGridCell}
                    </FixedSizeGrid>
                  )
                }}
              </AutoSizer>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedMint}>
            {config.buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
