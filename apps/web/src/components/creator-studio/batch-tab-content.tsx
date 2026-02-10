import { useState, useCallback, useEffect, useMemo, memo } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { type Address, type TransactionSigner } from "@solana/kit"
import { toast } from "sonner"
import { FixedSizeGrid, type GridChildComponentProps } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import {
  Plus,
  Trash2,
  FolderOpen,
  AlertTriangle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  Search,
  Users,
  FileCode,
  Filter,
  ChevronDown,
  Percent,
  UserCheck,
  UserX,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { batchInstructionsBySize, executeBatches, type InstructionGroup } from "@/lib/transaction"
import { mplCore, tokenMetadata } from "@biblio/solana-programs"
import {
  type BatchLookupMode,
  type Creator,
  type BatchNft,
  type BatchNftFilters,
  type BatchNftGridCellData,
  type HeliusDasAsset,
  type HeliusDasResponse,
  type BatchOperationProgress,
  getBatchGridColumnCount,
} from "@/lib/creator-studio"
import { isValidSolanaAddress, validateCreatorsSimple } from "@/lib/creator-studio/validation"
import { rpcRequest, getMetadataPda } from "@/lib/creator-studio/rpc"
import { BatchProgressBar } from "@/components/creator-studio/form-sections"

function mapHeliusAssetToBatchNft(asset: HeliusDasAsset): BatchNft {
  const collectionGrouping = asset.grouping?.find((g) => g.group_key === "collection")
  const rawImage = asset.content?.links?.image ?? asset.content?.files?.[0]?.uri ?? ""
  const updateAuthority = asset.authorities?.find((a) => a.scopes.includes("full"))?.address ?? null

  return {
    mint: asset.id,
    name: asset.content?.metadata?.name ?? "Unknown",
    image: rawImage,
    collectionId: collectionGrouping?.group_value ?? null,
    updateAuthority,
    royaltiesPercent: (asset.royalty?.basis_points ?? 0) / 100,
    creators: asset.creators ?? [],
    interface: asset.interface ?? null,
  }
}

async function lookupNftsByCollection(collectionAddress: string): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  let page = 1
  let total = 1

  while (allNfts.length < total) {
    const response = await rpcRequest<HeliusDasResponse>("getAssetsByGroup", {
      groupKey: "collection",
      groupValue: collectionAddress,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })

    total = response.grand_total ?? response.total
    for (const item of response.items) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
    page++
  }

  return allNfts
}

async function lookupNftsByCreator(creatorAddress: string): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  let page = 1
  let total = 1

  while (allNfts.length < total) {
    const response = await rpcRequest<HeliusDasResponse>("getAssetsByCreator", {
      creatorAddress,
      onlyVerified: true,
      page,
      limit: 1000,
      displayOptions: {
        showGrandTotal: true,
      },
    })

    total = response.grand_total ?? response.total
    for (const item of response.items) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
    page++
  }

  return allNfts
}

async function lookupNftsByHashlist(mintAddresses: string[]): Promise<BatchNft[]> {
  const allNfts: BatchNft[] = []
  const batchSize = 100

  for (let i = 0; i < mintAddresses.length; i += batchSize) {
    const batch = mintAddresses.slice(i, i + batchSize)
    const response = await rpcRequest<HeliusDasAsset[]>("getAssetBatch", {
      ids: batch,
    })

    for (const item of response) {
      allNfts.push(mapHeliusAssetToBatchNft(item))
    }
  }

  return allNfts
}

const BATCH_LOOKUP_MODES: Array<{
  value: BatchLookupMode
  label: string
  description: string
  icon: typeof FolderOpen
}> = [
  {
    value: "collection",
    label: "By Collection",
    description: "Look up all NFTs in a collection",
    icon: FolderOpen,
  },
  {
    value: "creator",
    label: "By First Verified Creator",
    description: "Look up NFTs by their first verified creator",
    icon: Users,
  },
  {
    value: "hashlist",
    label: "By Hashlist",
    description: "Provide a JSON array of mint addresses",
    icon: FileCode,
  },
]

const BatchNftCard = memo(function BatchNftCard({ nft }: { nft: BatchNft }) {
  const truncatedMint = `${nft.mint.slice(0, 4)}...${nft.mint.slice(-4)}`

  return (
    <div className="group relative rounded-lg border bg-card overflow-hidden transition-colors hover:border-primary/50">
      <div className="aspect-square relative bg-muted">
        {nft.image ? (
          <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-2 space-y-0.5">
        <p className="text-sm font-medium truncate" title={nft.name}>
          {nft.name || "Unnamed"}
        </p>
        <p className="text-xs text-muted-foreground font-mono">{truncatedMint}</p>
      </div>
    </div>
  )
})

function BatchNftGridCell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<BatchNftGridCellData>) {
  const { nfts, columnCount } = data
  const index = rowIndex * columnCount + columnIndex
  const nft = nfts[index]

  if (!nft) return null

  return (
    <div style={style} className="p-1.5">
      <BatchNftCard nft={nft} />
    </div>
  )
}

interface BatchNftGridProps {
  nfts: BatchNft[]
}

function BatchNftGrid({ nfts }: BatchNftGridProps) {
  if (nfts.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/30">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">No NFTs match filters</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your filter criteria</p>
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full">
      <AutoSizer>
        {({ width, height }) => {
          const columnCount = getBatchGridColumnCount(width)
          const columnWidth = width / columnCount
          const rowHeight = columnWidth * 1.3
          const rowCount = Math.ceil(nfts.length / columnCount)

          return (
            <FixedSizeGrid<BatchNftGridCellData>
              width={width}
              height={height}
              columnCount={columnCount}
              columnWidth={columnWidth}
              rowCount={rowCount}
              rowHeight={rowHeight}
              itemData={{ nfts, columnCount }}
              className="scrollbar-hide"
            >
              {BatchNftGridCell}
            </FixedSizeGrid>
          )
        }}
      </AutoSizer>
    </div>
  )
}

interface CollectionAssignmentSectionProps {
  nfts: BatchNft[]
  account: string | null
  onComplete: () => void
}

function CollectionAssignmentSection({ nfts, account, onComplete }: CollectionAssignmentSectionProps) {
  const { signer, capabilities } = useTransactionSigner()
  const [isExpanded, setIsExpanded] = useState(false)
  const [collectionAddress, setCollectionAddress] = useState("")
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchOperationProgress | null>(null)

  const nftsNotInCollection = useMemo(() => {
    if (!collectionAddress.trim() || !isValidSolanaAddress(collectionAddress.trim())) {
      return []
    }
    return nfts.filter((nft) => nft.collectionId !== collectionAddress.trim())
  }, [nfts, collectionAddress])

  const nftsUserCanUpdate = useMemo(() => {
    if (!account) return []
    return nftsNotInCollection.filter((nft) => nft.updateAuthority === account)
  }, [nftsNotInCollection, account])

  const validateCollectionAddress = useCallback((value: string) => {
    if (!value.trim()) {
      setCollectionError(null)
      return
    }
    if (!isValidSolanaAddress(value.trim())) {
      setCollectionError("Invalid Solana address")
    } else {
      setCollectionError(null)
    }
  }, [])

  const handleCollectionAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setCollectionAddress(value)
      validateCollectionAddress(value)
    },
    [validateCollectionAddress]
  )

  const handleBatchAddToCollection = useCallback(async () => {
    if (!account || !signer || !capabilities?.canSignMessage) {
      toast.error("Please connect your wallet")
      return
    }

    if (nftsUserCanUpdate.length === 0) {
      toast.error("No NFTs to update")
      return
    }

    setIsProcessing(true)
    setProgress({ completed: 0, total: nftsUserCanUpdate.length, failed: 0 })

    const toastId = toast.loading(`Adding ${nftsUserCanUpdate.length} NFTs to collection...`)

    try {
      const feePayer = signer as unknown as TransactionSigner
      const collectionAddr = collectionAddress.trim() as Address

      const instructionGroups: InstructionGroup<BatchNft>[] = nftsUserCanUpdate.map((nft) => {
        const updateInstruction = mplCore.getUpdateV1Instruction({
          asset: nft.mint as Address,
          payer: feePayer,
          authority: feePayer,
          collection: collectionAddr,
          newName: null,
          newUri: null,
          newUpdateAuthority: null,
        })
        return { item: nft, instructions: [updateInstruction] }
      })

      const batches = await batchInstructionsBySize(instructionGroups, feePayer)

      const { completed, failed } = await executeBatches({
        batches,
        feePayer,
        onProgress: (c, f) => {
          setProgress({ completed: c, total: nftsUserCanUpdate.length, failed: f })
          toast.loading(`Adding to collection: ${c}/${nftsUserCanUpdate.length}`, { id: toastId })
        },
      })

      if (failed === 0) {
        toast.success(`Successfully added ${completed} NFTs to collection`, { id: toastId })
      } else {
        toast.warning(`Added ${completed} NFTs, ${failed} failed`, { id: toastId })
      }

      onComplete()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add to collection"
      toast.error(message, { id: toastId })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [account, signer, capabilities, nftsUserCanUpdate, collectionAddress, onComplete])

  const canExecute =
    account && collectionAddress.trim() && !collectionError && nftsUserCanUpdate.length > 0 && !isProcessing

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Add to Collection</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-collection-address">Collection Address</Label>
            <Input
              id="batch-collection-address"
              type="text"
              placeholder="Enter collection mint address"
              value={collectionAddress}
              onChange={handleCollectionAddressChange}
              disabled={isProcessing}
              className={cn(collectionError && "border-destructive")}
            />
            {collectionError && <p className="text-sm text-destructive">{collectionError}</p>}
          </div>

          {collectionAddress.trim() && !collectionError && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">NFTs not in this collection:</span>
                <span className="font-medium">{nftsNotInCollection.length}</span>
              </div>
              {account && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">NFTs you can update:</span>
                  <span className="font-medium text-primary">{nftsUserCanUpdate.length}</span>
                </div>
              )}
              {nftsNotInCollection.length > 0 && nftsUserCanUpdate.length === 0 && account && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  You are not the update authority of any NFTs not already in this collection.
                </p>
              )}
            </div>
          )}

          {progress && (
            <BatchProgressBar completed={progress.completed} total={progress.total} failed={progress.failed} />
          )}

          <Button onClick={handleBatchAddToCollection} disabled={!canExecute} className="w-full gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4" />
                Add {nftsUserCanUpdate.length > 0 ? nftsUserCanUpdate.length : ""} NFT
                {nftsUserCanUpdate.length !== 1 ? "s" : ""} to Collection
              </>
            )}
          </Button>

          {!account && (
            <p className="text-xs text-muted-foreground text-center">Connect your wallet to add NFTs to a collection</p>
          )}
        </div>
      )}
    </div>
  )
}

interface GlobalUpdatesSectionProps {
  nfts: BatchNft[]
  account: string | null
  onComplete: () => void
}

function GlobalUpdatesSection({ nfts, account, onComplete }: GlobalUpdatesSectionProps) {
  const { signer, capabilities } = useTransactionSigner()
  const [isExpanded, setIsExpanded] = useState(false)
  const [royaltiesPercent, setRoyaltiesPercent] = useState(5)
  const [creators, setCreators] = useState<Creator[]>([{ address: "", share: 100 }])
  const [creatorsError, setCreatorsError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchOperationProgress | null>(null)

  useEffect(() => {
    if (account && creators.length === 1 && !creators[0].address) {
      setCreators([{ address: account, share: 100 }])
    }
  }, [account, creators])

  const nftsUserCanUpdate = useMemo(() => {
    if (!account) return []
    return nfts.filter((nft) => nft.updateAuthority === account)
  }, [nfts, account])

  const validateCreatorsLocal = useCallback((): boolean => {
    const result = validateCreatorsSimple(creators)
    setCreatorsError(result.error)
    return result.isValid
  }, [creators])

  const handleRoyaltiesChange = useCallback((value: number) => {
    setRoyaltiesPercent(value)
  }, [])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setCreators((prev) => {
      const newCreators = [...prev]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return newCreators
    })
    setCreatorsError(null)
  }, [])

  const handleAddCreator = useCallback(() => {
    setCreators((prev) => [...prev, { address: "", share: 0 }])
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setCreators((prev) => {
      const newCreators = prev.filter((_, i) => i !== index)
      return newCreators.length > 0 ? newCreators : [{ address: "", share: 100 }]
    })
  }, [])

  const handleBatchUpdate = useCallback(async () => {
    if (!account || !signer || !capabilities?.canSignMessage) {
      toast.error("Please connect your wallet")
      return
    }

    if (!validateCreatorsLocal()) {
      return
    }

    if (nftsUserCanUpdate.length === 0) {
      toast.error("No NFTs to update")
      return
    }

    setIsProcessing(true)
    setProgress({ completed: 0, total: nftsUserCanUpdate.length, failed: 0 })

    const toastId = toast.loading(`Updating ${nftsUserCanUpdate.length} NFTs...`)

    try {
      const feePayer = signer as unknown as TransactionSigner
      const basisPoints = Math.round(royaltiesPercent * 100)

      const royaltiesData = {
        basisPoints,
        creators: creators.map((c) => ({
          address: c.address as Address,
          percentage: c.share,
        })),
        ruleSet: { __kind: "None" as const },
      }

      const instructionGroups: InstructionGroup<BatchNft>[] = nftsUserCanUpdate.map((nft) => {
        const updatePluginInstruction = mplCore.getUpdatePluginV1Instruction({
          asset: nft.mint as Address,
          payer: feePayer,
          authority: feePayer,
          collection: nft.collectionId ? (nft.collectionId as Address) : undefined,
          plugin: {
            __kind: "Royalties",
            fields: [royaltiesData] as const,
          },
        })
        return { item: nft, instructions: [updatePluginInstruction] }
      })

      const batches = await batchInstructionsBySize(instructionGroups, feePayer)

      const { completed, failed } = await executeBatches({
        batches,
        feePayer,
        onProgress: (c, f) => {
          setProgress({ completed: c, total: nftsUserCanUpdate.length, failed: f })
          toast.loading(`Updating royalties: ${c}/${nftsUserCanUpdate.length}`, { id: toastId })
        },
      })

      if (failed === 0) {
        toast.success(`Successfully updated ${completed} NFTs`, { id: toastId })
      } else {
        toast.warning(`Updated ${completed} NFTs, ${failed} failed`, { id: toastId })
      }

      onComplete()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update NFTs"
      toast.error(message, { id: toastId })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [account, signer, capabilities, nftsUserCanUpdate, royaltiesPercent, creators, validateCreatorsLocal, onComplete])

  const canExecute = account && nftsUserCanUpdate.length > 0 && !isProcessing && !creatorsError

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Global Updates</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {!account ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Connect your wallet to update royalties and creators
            </p>
          ) : nftsUserCanUpdate.length === 0 ? (
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              You are not the update authority of any loaded NFTs.
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-amber-500/10 p-3 space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">Warning</span>
                </div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  This will overwrite existing royalties and creator configurations on all selected NFTs.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">NFTs you can update:</span>
                  <span className="font-medium text-primary">{nftsUserCanUpdate.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Royalties</Label>
                  <span className="text-sm font-medium">{royaltiesPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={royaltiesPercent}
                  onChange={(e) => handleRoyaltiesChange(parseFloat(e.target.value))}
                  disabled={isProcessing}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Creators</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={handleAddCreator}
                    disabled={isProcessing}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Creator
                  </Button>
                </div>

                {creatorsError && <p className="text-sm text-destructive">{creatorsError}</p>}

                <div className="space-y-2">
                  {creators.map((creator, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          value={creator.address}
                          onChange={(e) => handleCreatorChange(index, "address", e.target.value)}
                          placeholder="Wallet address"
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={creator.share}
                          onChange={(e) => handleCreatorChange(index, "share", parseInt(e.target.value) || 0)}
                          placeholder="%"
                          disabled={isProcessing}
                        />
                      </div>
                      {creators.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveCreator(index)}
                          disabled={isProcessing}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">Creator shares must sum to 100%.</p>
              </div>

              {progress && (
                <BatchProgressBar completed={progress.completed} total={progress.total} failed={progress.failed} />
              )}

              <Button onClick={handleBatchUpdate} disabled={!canExecute} className="w-full gap-2">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Percent className="h-4 w-4" />
                    Update {nftsUserCanUpdate.length} NFT{nftsUserCanUpdate.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface VerifyCreatorSectionProps {
  nfts: BatchNft[]
  account: string | null
  onComplete: () => void
}

function VerifyCreatorSection({ nfts, account, onComplete }: VerifyCreatorSectionProps) {
  const { signer, capabilities } = useTransactionSigner()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<BatchOperationProgress | null>(null)

  const nftsWhereUserIsUnverifiedCreator = useMemo(() => {
    if (!account) return []
    return nfts.filter((nft) => {
      const isTokenMetadata = nft.interface === "V1_NFT" || nft.interface === "ProgrammableNFT"
      if (!isTokenMetadata) return false
      const creatorEntry = nft.creators.find((c) => c.address === account)
      return creatorEntry && !creatorEntry.verified
    })
  }, [nfts, account])

  const nftsWhereUserIsVerifiedCreator = useMemo(() => {
    if (!account) return []
    return nfts.filter((nft) => {
      const isTokenMetadata = nft.interface === "V1_NFT" || nft.interface === "ProgrammableNFT"
      if (!isTokenMetadata) return false
      const creatorEntry = nft.creators.find((c) => c.address === account)
      return creatorEntry && creatorEntry.verified
    })
  }, [nfts, account])

  const handleBatchVerify = useCallback(async () => {
    if (!account || !signer || !capabilities?.canSignMessage) {
      toast.error("Please connect your wallet")
      return
    }

    if (nftsWhereUserIsUnverifiedCreator.length === 0) {
      toast.error("No NFTs to verify")
      return
    }

    setIsProcessing(true)
    setProgress({ completed: 0, total: nftsWhereUserIsUnverifiedCreator.length, failed: 0 })

    const toastId = toast.loading(`Verifying creator on ${nftsWhereUserIsUnverifiedCreator.length} NFTs...`)

    try {
      const feePayer = signer as unknown as TransactionSigner

      const instructionGroups: InstructionGroup<BatchNft>[] = await Promise.all(
        nftsWhereUserIsUnverifiedCreator.map(async (nft) => {
          const metadataPda = await getMetadataPda(nft.mint as Address)
          const verifyInstruction = tokenMetadata.getVerifyInstruction({
            authority: feePayer,
            metadata: metadataPda,
            verificationArgs: tokenMetadata.VerificationArgs.CreatorV1,
          })
          return { item: nft, instructions: [verifyInstruction] }
        })
      )

      const batches = await batchInstructionsBySize(instructionGroups, feePayer)

      const { completed, failed } = await executeBatches({
        batches,
        feePayer,
        onProgress: (c, f) => {
          setProgress({ completed: c, total: nftsWhereUserIsUnverifiedCreator.length, failed: f })
          toast.loading(`Verifying creator: ${c}/${nftsWhereUserIsUnverifiedCreator.length}`, { id: toastId })
        },
      })

      if (failed === 0) {
        toast.success(`Successfully verified creator on ${completed} NFTs`, { id: toastId })
      } else {
        toast.warning(`Verified ${completed} NFTs, ${failed} failed`, { id: toastId })
      }

      onComplete()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to verify creator"
      toast.error(message, { id: toastId })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [account, signer, capabilities, nftsWhereUserIsUnverifiedCreator, onComplete])

  const handleBatchUnverify = useCallback(async () => {
    if (!account || !signer || !capabilities?.canSignMessage) {
      toast.error("Please connect your wallet")
      return
    }

    if (nftsWhereUserIsVerifiedCreator.length === 0) {
      toast.error("No NFTs to unverify")
      return
    }

    setIsProcessing(true)
    setProgress({ completed: 0, total: nftsWhereUserIsVerifiedCreator.length, failed: 0 })

    const toastId = toast.loading(`Unverifying creator on ${nftsWhereUserIsVerifiedCreator.length} NFTs...`)

    try {
      const feePayer = signer as unknown as TransactionSigner

      const instructionGroups: InstructionGroup<BatchNft>[] = await Promise.all(
        nftsWhereUserIsVerifiedCreator.map(async (nft) => {
          const metadataPda = await getMetadataPda(nft.mint as Address)
          const unverifyInstruction = tokenMetadata.getUnverifyInstruction({
            authority: feePayer,
            metadata: metadataPda,
            verificationArgs: tokenMetadata.VerificationArgs.CreatorV1,
          })
          return { item: nft, instructions: [unverifyInstruction] }
        })
      )

      const batches = await batchInstructionsBySize(instructionGroups, feePayer)

      const { completed, failed } = await executeBatches({
        batches,
        feePayer,
        onProgress: (c, f) => {
          setProgress({ completed: c, total: nftsWhereUserIsVerifiedCreator.length, failed: f })
          toast.loading(`Unverifying creator: ${c}/${nftsWhereUserIsVerifiedCreator.length}`, { id: toastId })
        },
      })

      if (failed === 0) {
        toast.success(`Successfully unverified creator on ${completed} NFTs`, { id: toastId })
      } else {
        toast.warning(`Unverified ${completed} NFTs, ${failed} failed`, { id: toastId })
      }

      onComplete()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unverify creator"
      toast.error(message, { id: toastId })
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [account, signer, capabilities, nftsWhereUserIsVerifiedCreator, onComplete])

  const hasUnverifiedNfts = nftsWhereUserIsUnverifiedCreator.length > 0
  const hasVerifiedNfts = nftsWhereUserIsVerifiedCreator.length > 0
  const hasAnyNfts = hasUnverifiedNfts || hasVerifiedNfts

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Verify / Unverify Creator</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {!account ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Connect your wallet to verify or unverify your creator status
            </p>
          ) : !hasAnyNfts ? (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground text-center">
              You are not listed as a creator on any of the loaded NFTs, or the NFTs are not Token Metadata standard
              (pNFT/V1_NFT).
            </div>
          ) : (
            <>
              {hasUnverifiedNfts && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Verify Creator</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sign to verify your creator status on {nftsWhereUserIsUnverifiedCreator.length} NFT
                      {nftsWhereUserIsUnverifiedCreator.length !== 1 ? "s" : ""} where you are listed as an unverified
                      creator.
                    </p>
                  </div>

                  <Button onClick={handleBatchVerify} disabled={isProcessing} className="w-full gap-2">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Verify Creator on {nftsWhereUserIsUnverifiedCreator.length} NFT
                        {nftsWhereUserIsUnverifiedCreator.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {hasVerifiedNfts && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <UserX className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">Unverify Creator</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Sign to remove your verification from {nftsWhereUserIsVerifiedCreator.length} NFT
                      {nftsWhereUserIsVerifiedCreator.length !== 1 ? "s" : ""} where you are listed as a verified
                      creator.
                    </p>
                  </div>

                  <Button
                    onClick={handleBatchUnverify}
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4" />
                        Unverify Creator on {nftsWhereUserIsVerifiedCreator.length} NFT
                        {nftsWhereUserIsVerifiedCreator.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {progress && (
                <BatchProgressBar completed={progress.completed} total={progress.total} failed={progress.failed} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface BatchTabContentProps {
  onBatchDataUpdate?: (data: { totalCount: number; images: string[] }) => void
}

export function BatchTabContent({ onBatchDataUpdate }: BatchTabContentProps) {
  const { account } = useWallet()
  const [lookupMode, setLookupMode] = useState<BatchLookupMode>("collection")
  const [addressInput, setAddressInput] = useState("")
  const [hashlistInput, setHashlistInput] = useState("")
  const [hashlistError, setHashlistError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedNfts, setLoadedNfts] = useState<BatchNft[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<BatchNftFilters>({
    creator: null,
    royalties: null,
    updateAuthority: null,
  })

  const uniqueCreators = useMemo(() => {
    const creatorsSet = new Set<string>()
    loadedNfts.forEach((nft) => {
      nft.creators.forEach((creator) => {
        creatorsSet.add(creator.address)
      })
    })
    return Array.from(creatorsSet).sort()
  }, [loadedNfts])

  const uniqueRoyalties = useMemo(() => {
    const royaltiesSet = new Set<number>()
    loadedNfts.forEach((nft) => {
      royaltiesSet.add(nft.royaltiesPercent)
    })
    return Array.from(royaltiesSet).sort((a, b) => a - b)
  }, [loadedNfts])

  const uniqueUpdateAuthorities = useMemo(() => {
    const authSet = new Set<string>()
    loadedNfts.forEach((nft) => {
      if (nft.updateAuthority) {
        authSet.add(nft.updateAuthority)
      }
    })
    return Array.from(authSet).sort()
  }, [loadedNfts])

  const filteredNfts = useMemo(() => {
    return loadedNfts.filter((nft) => {
      if (filters.creator) {
        const hasCreator = nft.creators.some((c) => c.address === filters.creator)
        if (!hasCreator) return false
      }
      if (filters.royalties !== null) {
        if (nft.royaltiesPercent !== parseFloat(filters.royalties)) return false
      }
      if (filters.updateAuthority) {
        if (nft.updateAuthority !== filters.updateAuthority) return false
      }
      return true
    })
  }, [loadedNfts, filters])

  const hasActiveFilters = filters.creator || filters.royalties !== null || filters.updateAuthority

  // Update parent with batch data for preview panel
  useEffect(() => {
    onBatchDataUpdate?.({
      totalCount: loadedNfts.length,
      images: loadedNfts.slice(0, 9).map((nft) => nft.image),
    })
  }, [loadedNfts, onBatchDataUpdate])

  const clearFilters = useCallback(() => {
    setFilters({ creator: null, royalties: null, updateAuthority: null })
  }, [])

  const handleLookupModeChange = (mode: BatchLookupMode) => {
    setLookupMode(mode)
    setLoadError(null)
  }

  const validateHashlist = useCallback((input: string): string[] | null => {
    if (!input.trim()) {
      setHashlistError("Hashlist is required")
      return null
    }

    try {
      const parsed = JSON.parse(input)
      if (!Array.isArray(parsed)) {
        setHashlistError("Hashlist must be a JSON array")
        return null
      }

      const invalidAddresses: number[] = []
      for (let i = 0; i < parsed.length; i++) {
        if (typeof parsed[i] !== "string" || !isValidSolanaAddress(parsed[i])) {
          invalidAddresses.push(i + 1)
        }
      }

      if (invalidAddresses.length > 0) {
        if (invalidAddresses.length <= 3) {
          setHashlistError(`Invalid addresses at positions: ${invalidAddresses.join(", ")}`)
        } else {
          setHashlistError(`${invalidAddresses.length} invalid addresses found`)
        }
        return null
      }

      if (parsed.length === 0) {
        setHashlistError("Hashlist is empty")
        return null
      }

      setHashlistError(null)
      return parsed as string[]
    } catch {
      setHashlistError("Invalid JSON format")
      return null
    }
  }, [])

  const handleLookup = useCallback(async () => {
    setLoadError(null)
    setLoadedNfts([])

    if (lookupMode === "collection" || lookupMode === "creator") {
      if (!addressInput.trim()) {
        setLoadError("Address is required")
        return
      }
      if (!isValidSolanaAddress(addressInput.trim())) {
        setLoadError("Invalid Solana address")
        return
      }
    }

    if (lookupMode === "hashlist") {
      const addresses = validateHashlist(hashlistInput)
      if (!addresses) {
        return
      }
    }

    setIsLoading(true)

    try {
      let nfts: BatchNft[] = []

      switch (lookupMode) {
        case "collection":
          nfts = await lookupNftsByCollection(addressInput.trim())
          break
        case "creator":
          nfts = await lookupNftsByCreator(addressInput.trim())
          break
        case "hashlist": {
          const addresses = JSON.parse(hashlistInput) as string[]
          nfts = await lookupNftsByHashlist(addresses)
          break
        }
      }

      setLoadedNfts(nfts)

      if (nfts.length === 0) {
        setLoadError("No NFTs found")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load NFTs"
      setLoadError(message)
      toast.error("Failed to load NFTs", { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [lookupMode, addressInput, hashlistInput, validateHashlist])

  const handleClear = () => {
    setAddressInput("")
    setHashlistInput("")
    setHashlistError(null)
    setLoadedNfts([])
    setLoadError(null)
    clearFilters()
  }

  const handleBatchOperationComplete = useCallback(() => {
    handleLookup()
  }, [handleLookup])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Lookup Mode</Label>
          <div className="grid gap-3">
            {BATCH_LOOKUP_MODES.map(({ value, label, description, icon: Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  lookupMode === value ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
                )}
              >
                <input
                  type="radio"
                  name="lookupMode"
                  value={value}
                  checked={lookupMode === value}
                  onChange={() => handleLookupModeChange(value)}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {(lookupMode === "collection" || lookupMode === "creator") && (
          <div className="space-y-2">
            <Label htmlFor="batch-address">
              {lookupMode === "collection" ? "Collection Address" : "Creator Address"}
            </Label>
            <Input
              id="batch-address"
              type="text"
              placeholder={`Enter ${lookupMode === "collection" ? "collection" : "creator"} address`}
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value)
                setLoadError(null)
              }}
              className={cn(loadError && "border-destructive")}
            />
          </div>
        )}

        {lookupMode === "hashlist" && (
          <div className="space-y-2">
            <Label htmlFor="batch-hashlist">Mint Addresses (JSON Array)</Label>
            <Textarea
              id="batch-hashlist"
              placeholder='["mintAddress1", "mintAddress2", ...]'
              value={hashlistInput}
              onChange={(e) => {
                setHashlistInput(e.target.value)
                setHashlistError(null)
                setLoadError(null)
              }}
              className={cn("font-mono text-sm min-h-[120px]", hashlistError && "border-destructive")}
            />
            {hashlistError && <p className="text-sm text-destructive">{hashlistError}</p>}
          </div>
        )}

        {loadError && lookupMode !== "hashlist" && <p className="text-sm text-destructive">{loadError}</p>}

        <div className="flex gap-3">
          <Button onClick={handleLookup} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Lookup NFTs
              </>
            )}
          </Button>
          {(addressInput || hashlistInput || loadedNfts.length > 0) && (
            <Button variant="outline" onClick={handleClear} disabled={isLoading}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {loadedNfts.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium">NFTs Loaded</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{filteredNfts.length.toLocaleString()}</span>
                {hasActiveFilters && (
                  <span className="text-sm text-muted-foreground ml-1">/ {loadedNfts.length.toLocaleString()}</span>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${filteredNfts.length.toLocaleString()} of ${loadedNfts.length.toLocaleString()} NFT${loadedNfts.length !== 1 ? "s" : ""}.`
                : `Found ${loadedNfts.length.toLocaleString()} NFT${loadedNfts.length !== 1 ? "s" : ""}.`}
              {!account && " Connect your wallet to perform batch operations."}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Filters</Label>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="filter-creator" className="text-xs text-muted-foreground">
                  Creator
                </Label>
                <Select
                  value={filters.creator ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, creator: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-creator" className="h-9">
                    <SelectValue placeholder="All creators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All creators</SelectItem>
                    {uniqueCreators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        <span className="font-mono text-xs">{`${creator.slice(0, 4)}...${creator.slice(-4)}`}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-royalties" className="text-xs text-muted-foreground">
                  Royalties
                </Label>
                <Select
                  value={filters.royalties ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, royalties: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-royalties" className="h-9">
                    <SelectValue placeholder="All royalties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All royalties</SelectItem>
                    {uniqueRoyalties.map((royalty) => (
                      <SelectItem key={royalty} value={royalty.toString()}>
                        {royalty}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="filter-authority" className="text-xs text-muted-foreground">
                  Update Authority
                </Label>
                <Select
                  value={filters.updateAuthority ?? "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, updateAuthority: value === "all" ? null : value }))
                  }
                >
                  <SelectTrigger id="filter-authority" className="h-9">
                    <SelectValue placeholder="All authorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All authorities</SelectItem>
                    {uniqueUpdateAuthorities.map((auth) => (
                      <SelectItem key={auth} value={auth}>
                        <span className="font-mono text-xs">{`${auth.slice(0, 4)}...${auth.slice(-4)}`}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <CollectionAssignmentSection
            nfts={filteredNfts}
            account={account ?? null}
            onComplete={handleBatchOperationComplete}
          />

          <GlobalUpdatesSection
            nfts={filteredNfts}
            account={account ?? null}
            onComplete={handleBatchOperationComplete}
          />

          <VerifyCreatorSection
            nfts={filteredNfts}
            account={account ?? null}
            onComplete={handleBatchOperationComplete}
          />

          <BatchNftGrid nfts={filteredNfts} />
        </div>
      )}
    </div>
  )
}
