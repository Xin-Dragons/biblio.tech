import { useState, useMemo, useCallback } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { MousePointerClick, X, CheckSquare, Send, Flame, Shield, Tag, Plus, Check, Minus } from "lucide-react"
import { toast } from "sonner"
import {
  isSelectModeAtom,
  toggleSelectModeAtom,
  selectedMintsAtom,
  selectAllAtom,
  clearSelectionAtom,
} from "@/stores/selection"
import { vaultedMintsSetAtom } from "@/stores/vault"
import { tagsAtom, nftTagsAtom, tagNftCountsAtom, bulkUpdateNftTagsAtom } from "@/stores/user"
import { isAuthenticatedAtom } from "@/stores/auth"
import { BulkSendDialog } from "./bulk-send-dialog"
import { BulkBurnDialog } from "./bulk-burn-dialog"
import { VaultDialog } from "./vault/VaultDialog"
import { UnvaultDialog } from "./vault/UnvaultDialog"
import { TagManagementDialog } from "./tag-management-dialog"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import type { NFT } from "@/stores/nfts"

interface SelectionControlsProps {
  nfts: NFT[]
}

export function SelectionControls({ nfts }: SelectionControlsProps) {
  const isSelectMode = useAtomValue(isSelectModeAtom)
  const toggleSelectMode = useSetAtom(toggleSelectModeAtom)
  const selectedMints = useAtomValue(selectedMintsAtom)
  const selectAll = useSetAtom(selectAllAtom)
  const clearSelection = useSetAtom(clearSelectionAtom)
  const vaultedMints = useAtomValue(vaultedMintsSetAtom)
  const tags = useAtomValue(tagsAtom)
  const nftTags = useAtomValue(nftTagsAtom)
  const tagNftCounts = useAtomValue(tagNftCountsAtom)
  const bulkUpdateNftTags = useSetAtom(bulkUpdateNftTagsAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)

  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [burnDialogOpen, setBurnDialogOpen] = useState(false)
  const [vaultDialogOpen, setVaultDialogOpen] = useState(false)
  const [unvaultDialogOpen, setUnvaultDialogOpen] = useState(false)
  const [tagManagementOpen, setTagManagementOpen] = useState(false)

  const selectedNfts = nfts.filter((nft) => selectedMints.has(nft.mint))

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
  }

  const selectedMintsArray = useMemo(() => [...selectedMints], [selectedMints])

  const getTagStateForSelection = useCallback(
    (tagId: string): "all" | "some" | "none" => {
      if (selectedMintsArray.length === 0) return "none"
      const withTag = selectedMintsArray.filter((mint) => nftTags[mint]?.includes(tagId))
      if (withTag.length === selectedMintsArray.length) return "all"
      if (withTag.length > 0) return "some"
      return "none"
    },
    [selectedMintsArray, nftTags]
  )

  const handleTagToggle = useCallback(
    async (tagId: string) => {
      const state = getTagStateForSelection(tagId)
      try {
        if (state === "all") {
          await bulkUpdateNftTags({ tagId, remove: selectedMintsArray })
        } else {
          const mintsToAdd = selectedMintsArray.filter((mint) => !nftTags[mint]?.includes(tagId))
          await bulkUpdateNftTags({ tagId, add: mintsToAdd })
        }
      } catch {
        toast.error("Failed to update tags")
      }
    },
    [getTagStateForSelection, bulkUpdateNftTags, selectedMintsArray, nftTags]
  )

  return (
    <>
      {isSelectMode ? (
        <div className="flex items-center gap-2">
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

          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={selectedMints.size === 0} className="gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  Tag
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {tags.length === 0 ? (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">No tags yet</div>
                ) : (
                  tags.map((tag) => {
                    const state = getTagStateForSelection(tag.id)
                    const count = tagNftCounts[tag.id] ?? 0
                    return (
                      <DropdownMenuItem key={tag.id} onClick={() => handleTagToggle(tag.id)} className="cursor-pointer">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="flex-1 truncate">{tag.name}</span>
                          <span className="text-xs text-muted-foreground">({count})</span>
                        </div>
                        <div className="ml-2 h-4 w-4 flex items-center justify-center">
                          {state === "all" && <Check className="h-4 w-4" />}
                          {state === "some" && <Minus className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </DropdownMenuItem>
                    )
                  })
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTagManagementOpen(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  New Tag
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="mx-1 h-5 w-px bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => selectAll(nfts.map((nft) => nft.mint))}
            className="gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => clearSelection()} disabled={selectedMints.size === 0}>
            Clear
          </Button>

          <Button variant="default" size="sm" onClick={() => toggleSelectMode()} className="gap-1.5">
            <X className="h-3.5 w-3.5" />
            Done
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => toggleSelectMode()} className="gap-1.5">
          <MousePointerClick className="h-3.5 w-3.5" />
          Select
        </Button>
      )}

      {sendDialogOpen && (
        <BulkSendDialog nfts={selectedNfts} onClose={() => setSendDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

      {burnDialogOpen && (
        <BulkBurnDialog nfts={selectedNfts} onClose={() => setBurnDialogOpen(false)} onSuccess={handleActionSuccess} />
      )}

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

      <TagManagementDialog open={tagManagementOpen} onOpenChange={setTagManagementOpen} />
    </>
  )
}
