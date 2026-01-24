import { useState, useMemo } from "react"
import { useLocation, Link } from "react-router"
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
  RefreshCw,
  Settings,
  Info,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  layoutSizeAtom,
  layoutTypeAtom,
  searchQueryAtom,
  sortOptionAtom,
  showInfoAtom,
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
import { filteredNftsAtom, refreshNftsAtom, isLoadingAtom } from "@/stores/nfts"
import { vaultedMintsSetAtom } from "@/stores/vault"
import { BulkSendDialog } from "./bulk-send-dialog"
import { BulkBurnDialog } from "./bulk-burn-dialog"
import { CollageExportDialog } from "./collage-export-dialog"
import { VaultDialog } from "./vault/VaultDialog"
import { UnvaultDialog } from "./vault/UnvaultDialog"
import { WalletButton } from "./wallet-button"
import { Button } from "./ui/button"

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
  const location = useLocation()
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
  const isLoading = useAtomValue(isLoadingAtom)
  const [showInfo, setShowInfo] = useAtom(showInfoAtom)
  const vaultedMints = useAtomValue(vaultedMintsSetAtom)

  const showNftControls =
    location.pathname === "/nfts" ||
    location.pathname.startsWith("/collection/") ||
    location.pathname === "/starred" ||
    location.pathname === "/junk" ||
    location.pathname === "/vault" ||
    (location.pathname.startsWith("/showcase/") && location.pathname !== "/showcase")

  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [collageDialogOpen, setCollageDialogOpen] = useState(false)
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false)
  const [unvaultDialogOpen, setUnvaultDialogOpen] = useState(false)

  const selectedNfts = filteredNfts.filter((nft) => selectedMints.has(nft.mint))

  const vaultActionState = useMemo(() => {
    if (selectedNfts.length === 0) {
      return { disabled: true, reason: "No NFTs selected", action: null as "vault" | "unvault" | null }
    }

    const hasCompressed = selectedNfts.some((nft) => nft.compressed)
    if (hasCompressed) {
      return { disabled: true, reason: "Compressed NFTs cannot be vaulted", action: null as "vault" | "unvault" | null }
    }

    const vaultedCount = selectedNfts.filter((nft) => vaultedMints.has(nft.mint)).length
    const nonVaultedCount = selectedNfts.length - vaultedCount

    if (vaultedCount > 0 && nonVaultedCount > 0) {
      return {
        disabled: true,
        reason: "Selection contains both vaulted and non-vaulted NFTs",
        action: null as "vault" | "unvault" | null,
      }
    }

    if (vaultedCount === selectedNfts.length) {
      return { disabled: false, reason: null, action: "unvault" as const }
    }

    return { disabled: false, reason: null, action: "vault" as const }
  }, [selectedNfts, vaultedMints])

  const handleActionSuccess = () => {
    clearSelection()
    toggleSelectMode()
    refreshNfts()
  }

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl">
        {/* Refresh - Far Left */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refreshNfts()}
          disabled={isLoading}
          title="Refresh NFTs"
          className="group"
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 transition-transform duration-500",
              isLoading ? "animate-spin" : "group-hover:rotate-180"
            )}
          />
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search NFTs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-200",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "hover:border-white/20"
            )}
          />
        </div>

        {/* Selection Mode Actions */}
        {showNftControls && isSelectMode && (
          <div className="flex items-center gap-2 animate-fade-in">
            <span className="text-sm text-muted-foreground tabular-nums">{selectedMints.size} selected</span>

            <Button
              variant="default"
              size="sm"
              onClick={() => setSendDialogOpen(true)}
              disabled={selectedMints.size === 0}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBurnDialogOpen(true)}
              disabled={selectedMints.size === 0}
              className="gap-1.5"
            >
              <Flame className="h-3.5 w-3.5" />
              Burn
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (vaultActionState.action === "vault") {
                  setVaultDialogOpen(true)
                } else if (vaultActionState.action === "unvault") {
                  setUnvaultDialogOpen(true)
                }
              }}
              disabled={vaultActionState.disabled}
              title={vaultActionState.reason ?? undefined}
              className="gap-1.5"
            >
              <Shield className="h-3.5 w-3.5" />
              {vaultActionState.action === "unvault" ? "Unvault" : "Vault"}
            </Button>

            <div className="mx-1 h-5 w-px bg-border" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => selectAll(filteredNfts.map((nft) => nft.mint))}
              className="gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection()} disabled={selectedMints.size === 0}>
              Clear
            </Button>
          </div>
        )}

        {/* Controls - only on NFT grid pages */}
        {showNftControls && (
          <div className="flex items-center gap-2">
            {/* Select Mode Toggle */}
            <Button
              variant={isSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSelectMode()}
              className="gap-1.5"
            >
              {isSelectMode ? <X className="h-3.5 w-3.5" /> : <MousePointerClick className="h-3.5 w-3.5" />}
              {isSelectMode ? "Done" : "Select"}
            </Button>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className={cn(
                "h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm",
                "transition-all duration-200",
                "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
                "hover:border-white/20 cursor-pointer"
              )}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Layout Type Toggle */}
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {layoutTypeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setLayoutType(option.value)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center transition-all duration-200",
                      layoutType === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>

            {/* Collage Export */}
            {layoutType === "collage" && (
              <Button variant="outline" size="sm" onClick={() => setCollageDialogOpen(true)} className="gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Export
              </Button>
            )}

            {/* Grid Size Toggle */}
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {layoutOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setLayoutSize(option.value)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center transition-all duration-200",
                      layoutSize === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Far Right - Info Toggle, Settings & Wallet */}
        <div className="flex items-center gap-2 ml-auto">
          {showNftControls && (
            <Button
              variant={showInfo ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setShowInfo(!showInfo)}
              title={showInfo ? "Hide NFT Info" : "Show NFT Info"}
            >
              <Info className="h-4 w-4" />
            </Button>
          )}
          <Link to="/settings">
            <Button variant="ghost" size="icon-sm" className="group" title="Settings">
              <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            </Button>
          </Link>
          <WalletButton />
        </div>
      </div>

      {sendDialogOpen && (
        <BulkSendDialog nfts={selectedNfts} onClose={() => setSendDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

      {burnDialogOpen && (
        <BulkBurnDialog nfts={selectedNfts} onClose={() => setBurnDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

      {collageDialogOpen && <CollageExportDialog onClose={() => setCollageDialogOpen(false)} />}

      <VaultDialog
        open={vaultDialogOpen}
        onOpenChange={setVaultDialogOpen}
        nfts={selectedNfts}
        onSuccess={handleActionSuccess}
      />

      <UnvaultDialog
        open={unvaultDialogOpen}
        onOpenChange={setUnvaultDialogOpen}
        nfts={selectedNfts}
        onSuccess={handleActionSuccess}
      />
    </>
  )
}
