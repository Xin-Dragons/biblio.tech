import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import {
  generateKeyPairSigner,
  createKeyPairSignerFromBytes,
  type Address,
  type TransactionSigner,
  type Instruction,
  type KeyPairSigner,
} from "@solana/kit"
import { toast } from "sonner"
import {
  Plus,
  Box,
  Lock,
  Sparkles,
  ImagePlus,
  X,
  Film,
  Music,
  Trash2,
  FolderOpen,
  AlertTriangle,
  Check,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
  RefreshCw,
  Upload,
  Key,
  Shield,
  Link2,
  Snowflake,
  FileX,
  ShieldCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
  uploadToIrys,
  uploadJsonMetadata,
  type ConnectorSigner,
  type NftMetadataInput,
  type MultimediaCategory as IrysMultimediaCategory,
} from "@/lib/irys"
import { type InstructionGroup } from "@/lib/transaction"
import { batchExecute } from "@/lib/batch-transactions"
import {
  type AssetStandard,
  type RuleSetOption,
  type MultimediaCategory,
  type Creator,
  type Attribute,
  type CreateFormState,
  type CreateFormErrors,
  type TextFormField,
  type UploadStep,
  type MintResult,
  type BatchMintResult,
  type UploadedUris,
  type NftPreviewData,
  RULE_SET_ADDRESSES,
  ASSET_STANDARDS,
} from "@/lib/creator-studio"
import {
  isValidSolanaAddress,
  validateUrl,
  getMultimediaCategory,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_EXTENSIONS,
  MAX_IMAGE_SIZE_MB,
  MAX_IMAGE_SIZE_BYTES,
  ACCEPTED_MULTIMEDIA_EXTENSIONS,
  MAX_MULTIMEDIA_SIZE_MB,
  MAX_MULTIMEDIA_SIZE_BYTES,
} from "@/lib/creator-studio/validation"
import { rpcRequest } from "@/lib/creator-studio/rpc"
import { mintCoreAsset, mintPnft, mintNiftyAsset } from "@/lib/creator-studio/minting"
import {
  buildCoreAssetInstructions,
  buildPnftInstructions,
  buildNiftyAssetInstructions,
  type BatchMintItem,
} from "@/lib/creator-studio/batch-operations"
import { validateCreators } from "@/lib/creator-studio/validation"
import { NftPickerModal } from "@/components/creator-studio/nft-picker-modal"

const STANDARD_ICONS: Record<AssetStandard, typeof Box> = {
  core: Box,
  pnft: Lock,
  nifty: Sparkles,
}

const ASSET_STANDARDS_UI = ASSET_STANDARDS.map((standard) => ({
  ...standard,
  icon: STANDARD_ICONS[standard.value],
}))

interface AssetStandardSelectorProps {
  value: AssetStandard
  onChange: (value: AssetStandard) => void
}

const STANDARD_DESCRIPTIONS: Record<AssetStandard, string> = {
  core: "Modern, cost-effective assets",
  pnft: "Enforced royalties & rules",
  nifty: "Lightweight & extensible",
}

function AssetStandardSelector({ value, onChange }: AssetStandardSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">Asset Standard</label>
      <div className="grid grid-cols-3 gap-2">
        {ASSET_STANDARDS_UI.map(({ value: standardValue, label, icon: Icon }) => {
          const isSelected = value === standardValue
          return (
            <button
              key={standardValue}
              type="button"
              onClick={() => onChange(standardValue)}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isSelected
                  ? "bg-primary/10 border-2 border-primary/50"
                  : "bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-border"
              )}
            >
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                  isSelected
                    ? "bg-primary/20 text-primary"
                    : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="relative text-center">
                <p
                  className={cn(
                    "text-xs font-semibold transition-colors",
                    isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 leading-tight">
                  {STANDARD_DESCRIPTIONS[standardValue]}
                </p>
              </div>
              {isSelected && (
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary shadow-sm">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  counter?: { current: number; max: number }
  children: React.ReactNode
}

function FormField({ label, required, error, counter, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className={cn(error && "text-destructive")}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {counter && (
          <span className={cn("text-xs", counter.current > counter.max ? "text-destructive" : "text-muted-foreground")}>
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface MultimediaPreviewProps {
  category: MultimediaCategory | null
  previewUrl: string
}

function MultimediaPreview({ category, previewUrl }: MultimediaPreviewProps) {
  if (category === "video") {
    return <video src={previewUrl} className="h-24 w-24 rounded-lg object-cover border" muted playsInline />
  }

  if (category === "audio") {
    return (
      <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
        <audio src={previewUrl} controls className="w-20" />
      </div>
    )
  }

  if (category === "vr") {
    return (
      <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
        <Box className="h-10 w-10 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
      <Film className="h-10 w-10 text-muted-foreground" />
    </div>
  )
}

interface MultimediaCategoryBadgeProps {
  category: MultimediaCategory | null
}

function MultimediaCategoryBadge({ category }: MultimediaCategoryBadgeProps) {
  if (!category) return null

  const config: Record<MultimediaCategory, { label: string; icon: typeof Film }> = {
    video: { label: "Video", icon: Film },
    audio: { label: "Audio", icon: Music },
    vr: { label: "3D Model", icon: Box },
  }

  const { label, icon: Icon } = config[category]

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

interface RoyaltiesCreatorsSectionProps {
  royaltiesPercent: number
  creators: Creator[]
  errors: CreateFormErrors
  standard: AssetStandard
  storeCreatorsOnchain: boolean
  onRoyaltiesChange: (value: number) => void
  onCreatorChange: (index: number, field: "address" | "share", value: string | number) => void
  onAddCreator: () => void
  onRemoveCreator: (index: number) => void
  onBlur: () => void
  onStoreCreatorsOnchainChange: (value: boolean) => void
}

function RoyaltiesCreatorsSection({
  royaltiesPercent,
  creators,
  errors,
  standard,
  storeCreatorsOnchain,
  onRoyaltiesChange,
  onCreatorChange,
  onAddCreator,
  onRemoveCreator,
  onBlur,
  onStoreCreatorsOnchainChange,
}: RoyaltiesCreatorsSectionProps) {
  const supportsOnchainCreators = standard === "core" || standard === "nifty"

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Royalties</Label>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-2 py-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={royaltiesPercent}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val >= 0 && val <= 100) {
                  onRoyaltiesChange(Math.round(val * 100) / 100)
                }
              }}
              className="w-14 h-7 px-2 text-right text-sm font-semibold bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm font-medium text-muted-foreground pr-1">%</span>
          </div>
        </div>

        {/* Custom styled slider */}
        <div className="relative h-2">
          {/* Background track */}
          <div className="absolute inset-0 rounded-full bg-muted" />
          {/* Filled track - account for thumb width (8px = half of 16px thumb) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-100"
            style={{
              width: `calc(${(Math.min(royaltiesPercent, 15) / 15) * 100}% + ${8 - (Math.min(royaltiesPercent, 15) / 15) * 16}px)`,
            }}
          />
          {/* Range input */}
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={Math.min(royaltiesPercent, 15)}
            onChange={(e) => onRoyaltiesChange(parseFloat(e.target.value))}
            className={cn(
              "absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
              "[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_hsl(var(--primary)/0.3),0_1px_3px_rgba(0,0,0,0.3)]",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary",
              "[&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:duration-150",
              "[&::-webkit-slider-thumb]:hover:shadow-[0_0_0_5px_hsl(var(--primary)/0.3),0_2px_6px_rgba(0,0,0,0.3)]",
              "[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:border-0",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white",
              "[&::-moz-range-thumb]:shadow-[0_0_0_3px_hsl(var(--primary)/0.3),0_1px_3px_rgba(0,0,0,0.3)]"
            )}
          />
        </div>
        {/* Scale markers */}
        <div className="flex justify-between mt-3 px-0.5">
          {[0, 5, 10, 15].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onRoyaltiesChange(val)}
              className={cn(
                "text-[10px] font-medium transition-colors",
                royaltiesPercent === val ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {val}%
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Secondary sale royalties. Slider for quick selection, input for precise values up to 100%.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Creators</Label>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddCreator}>
            <Plus className="h-4 w-4 mr-1" />
            Add Creator
          </Button>
        </div>

        {errors.creators && <p className="text-sm text-destructive">{errors.creators}</p>}

        <div className="space-y-2">
          {creators.map((creator, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={creator.address}
                  onChange={(e) => onCreatorChange(index, "address", e.target.value)}
                  onBlur={onBlur}
                  placeholder="Wallet address"
                  error={!!errors.creatorAddresses?.[index]}
                />
                {errors.creatorAddresses?.[index] && (
                  <p className="text-xs text-destructive mt-1">{errors.creatorAddresses[index]}</p>
                )}
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={creator.share}
                  onChange={(e) => onCreatorChange(index, "share", parseInt(e.target.value) || 0)}
                  onBlur={onBlur}
                  placeholder="%"
                  error={!!errors.creatorShares?.[index]}
                />
                {errors.creatorShares?.[index] && (
                  <p className="text-xs text-destructive mt-1">{errors.creatorShares[index]}</p>
                )}
              </div>
              {creators.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveCreator(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Creator shares must sum to 100%. The first creator is typically the primary creator.
        </p>
      </div>

      {/* Store Creators On-chain Toggle */}
      {supportsOnchainCreators && (
        <button
          type="button"
          onClick={() => onStoreCreatorsOnchainChange(!storeCreatorsOnchain)}
          className={cn(
            "w-full rounded-xl p-4 transition-all duration-200 border text-left",
            storeCreatorsOnchain
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                  storeCreatorsOnchain ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground"
                )}
              >
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    storeCreatorsOnchain ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  Store Creators On-chain
                </p>
                <p className="text-xs text-muted-foreground">
                  {standard === "core" ? "Add VerifiedCreators plugin" : "Add Creators extension"}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                storeCreatorsOnchain ? "bg-emerald-500" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  storeCreatorsOnchain ? "translate-x-6" : "translate-x-1"
                )}
              />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}

interface AttributesSectionProps {
  attributes: Attribute[]
  standard: AssetStandard
  storeOnchain: boolean
  onAttributeChange: (index: number, field: "traitType" | "value", value: string) => void
  onAddAttribute: () => void
  onRemoveAttribute: (index: number) => void
  onStoreOnchainChange: (value: boolean) => void
}

function AttributesSection({
  attributes,
  standard,
  storeOnchain,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
  onStoreOnchainChange,
}: AttributesSectionProps) {
  const supportsOnchain = standard === "core" || standard === "nifty"

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Add traits to describe your NFT. Attributes with empty trait types will be excluded.
          </p>
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={onAddAttribute}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {supportsOnchain && (
          <button
            type="button"
            onClick={() => onStoreOnchainChange(!storeOnchain)}
            className={cn(
              "group relative w-full text-left rounded-xl border p-4 transition-all duration-300",
              storeOnchain
                ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm"
                : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                  storeOnchain
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                )}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "font-medium transition-colors",
                      storeOnchain ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    Store attributes on-chain
                  </span>
                  {storeOnchain && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
                      Enabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  On-chain attributes can be read by other Solana programs. Off-chain attributes are stored in JSON
                  metadata only.
                </p>
              </div>
              <div
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
                  storeOnchain ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300",
                    storeOnchain ? "left-6" : "left-1"
                  )}
                />
              </div>
            </div>
            {storeOnchain && <div className="absolute inset-0 -z-10 rounded-xl bg-primary/5 blur-xl" />}
          </button>
        )}

        <div className="space-y-2">
          {attributes.map((attribute, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  value={attribute.traitType}
                  onChange={(e) => onAttributeChange(index, "traitType", e.target.value)}
                  placeholder="Trait type (e.g., Background)"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={attribute.value}
                  onChange={(e) => onAttributeChange(index, "value", e.target.value)}
                  placeholder="Value (e.g., Blue)"
                />
              </div>
              {attributes.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveAttribute(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface CollectionSectionProps {
  collectionAddress: string
  error?: string
  account: string | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  onSelectCollection: (mintAddress: string) => void
}

function CollectionSection({
  collectionAddress,
  error,
  account,
  onChange,
  onBlur,
  onSelectCollection,
}: CollectionSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const handleSelectCollection = useCallback(
    (mintAddress: string) => {
      onSelectCollection(mintAddress)
    },
    [onSelectCollection]
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className={cn(error && "text-destructive")}>Collection</Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={collectionAddress}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Collection address (optional)"
              error={!!error}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setIsPickerOpen(true)}
            disabled={!account}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose Collection
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Optionally assign this NFT to a collection. Leave empty to create a standalone NFT.
        </p>
      </div>

      <NftPickerModal
        open={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectCollection}
        account={account}
      />
    </div>
  )
}

interface SettingsSectionProps {
  isMutable: boolean
  isCollectionNft: boolean
  isCreateMany: boolean
  createManyQuantity: number
  onMutableChange: (checked: boolean) => void
  onCollectionNftChange: (checked: boolean) => void
  onCreateManyChange: (checked: boolean) => void
  onCreateManyQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function SettingsSection({
  isMutable,
  isCollectionNft,
  isCreateMany,
  createManyQuantity,
  onMutableChange,
  onCollectionNftChange,
  onCreateManyChange,
  onCreateManyQuantityChange,
}: SettingsSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-border/50">
      <Label>Settings</Label>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="mutable-toggle" className="text-sm font-medium cursor-pointer">
              Mutable
            </Label>
            <p className="text-xs text-muted-foreground">Allow this NFT to be updated after creation</p>
          </div>
          <Switch id="mutable-toggle" checked={isMutable} onCheckedChange={onMutableChange} />
        </div>

        {!isMutable && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-warning">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs">
              <span className="font-medium">Warning:</span> Immutability is permanent. Once created, this NFT&apos;s
              metadata cannot be changed.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="collection-nft-toggle" className="text-sm font-medium cursor-pointer">
              Create as Collection NFT
            </Label>
            <p className="text-xs text-muted-foreground">Create a collection NFT that other NFTs can be added to</p>
          </div>
          <Switch id="collection-nft-toggle" checked={isCollectionNft} onCheckedChange={onCollectionNftChange} />
        </div>

        {isCollectionNft && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              Collection NFTs do not have attributes or royalties. These sections have been hidden.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="create-many-toggle" className="text-sm font-medium cursor-pointer">
              Create Many
            </Label>
            <p className="text-xs text-muted-foreground">Batch mint multiple identical NFTs at once</p>
          </div>
          <Switch id="create-many-toggle" checked={isCreateMany} onCheckedChange={onCreateManyChange} />
        </div>

        {isCreateMany && (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Label htmlFor="create-many-quantity" className="text-sm shrink-0">
                Quantity
              </Label>
              <Input
                id="create-many-quantity"
                type="number"
                min={1}
                max={1000}
                value={createManyQuantity}
                onChange={onCreateManyQuantityChange}
                className="w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the number of NFTs to mint (1-1000). All NFTs will share the same metadata.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const RULE_SET_OPTIONS: Array<{ value: RuleSetOption; label: string; description: string }> = [
  {
    value: "metaplex",
    label: "Metaplex",
    description: "Standard Metaplex rule set for royalty enforcement",
  },
  {
    value: "compatibility",
    label: "Compatibility",
    description: "Allows trading on all marketplaces",
  },
  {
    value: "none",
    label: "None",
    description: "No programmable rules applied",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Specify your own rule set address",
  },
]

interface RuleSetSectionProps {
  ruleSetOption: RuleSetOption
  customRuleSetAddress: string
  error?: string
  onRuleSetOptionChange: (option: RuleSetOption) => void
  onCustomAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCustomAddressBlur: () => void
}

function RuleSetSection({
  ruleSetOption,
  customRuleSetAddress,
  error,
  onRuleSetOptionChange,
  onCustomAddressChange,
  onCustomAddressBlur,
}: RuleSetSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Rule Set</Label>
        <p className="text-xs text-muted-foreground">
          pNFTs use rule sets to control transfer behavior and royalty enforcement
        </p>
      </div>

      <div className="space-y-2">
        {RULE_SET_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
              ruleSetOption === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50"
            )}
          >
            <input
              type="radio"
              name="ruleSetOption"
              value={option.value}
              checked={ruleSetOption === option.value}
              onChange={() => onRuleSetOptionChange(option.value)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">{option.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
            </div>
          </label>
        ))}
      </div>

      {ruleSetOption === "custom" && (
        <div className="space-y-2">
          <Label className={cn(error && "text-destructive")}>
            Custom Rule Set Address <span className="text-destructive">*</span>
          </Label>
          <Input
            value={customRuleSetAddress}
            onChange={onCustomAddressChange}
            onBlur={onCustomAddressBlur}
            placeholder="Enter rule set address"
            error={!!error}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {ruleSetOption !== "custom" && ruleSetOption !== "none" && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Address:</span>{" "}
            <code className="font-mono text-xs">{RULE_SET_ADDRESSES[ruleSetOption]}</code>
          </p>
        </div>
      )}
    </div>
  )
}

interface CustomKeypairSectionProps {
  customKeypair: KeyPairSigner | null
  error?: string
  isValidating: boolean
  onGenerate: () => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
  inputRef: React.RefObject<HTMLInputElement>
}

function CustomKeypairSection({
  customKeypair,
  error,
  isValidating,
  onGenerate,
  onUpload,
  onClear,
  inputRef,
}: CustomKeypairSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Token Address
        </Label>
        <p className="text-xs text-muted-foreground">
          Customize the mint address with a vanity keypair or use a random one
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            value={customKeypair?.address ?? ""}
            placeholder="Generate or upload a keypair"
            readOnly
            className="flex-1"
          />
          {customKeypair && (
            <Button type="button" variant="ghost" size="icon" onClick={onClear} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isValidating}
            className="flex-1"
          >
            {isValidating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Respin
          </Button>

          <input ref={inputRef} type="file" accept=".json" onChange={onUpload} className="hidden" />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isValidating}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Keypair
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {customKeypair && !error && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-2 text-green-600 text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Keypair validated. Account does not exist on-chain.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export interface CreateTabContentProps {
  standard: AssetStandard
  onStandardChange: (value: AssetStandard) => void
  onPreviewUpdate: (data: NftPreviewData) => void
}

export function CreateTabContent({ standard, onStandardChange, onPreviewUpdate }: CreateTabContentProps) {
  const { account } = useWallet()

  const [form, setForm] = useState<CreateFormState>({
    name: "",
    symbol: "",
    description: "",
    externalUrl: "",
    imageFile: null,
    multimediaFile: null,
    multimediaCategory: null,
    royaltiesPercent: 5,
    creators: [],
    attributes: [{ traitType: "", value: "" }],
    storeAttributesOnchain: false,
    storeCreatorsOnchain: false,
    externalLinks: [{ name: "", url: "" }],
    isSoulbound: false,
    isImmutableMetadata: false,
    preventNewPlugins: false,
    collectionAddress: "",
    isMutable: true,
    isCollectionNft: false,
    isCreateMany: false,
    createManyQuantity: 10,
    ruleSetOption: "metaplex",
    customRuleSetAddress: "",
    customKeypair: null,
  })

  const [errors, setErrors] = useState<CreateFormErrors>({})
  const [touched, setTouched] = useState<Record<keyof CreateFormState, boolean>>({
    name: false,
    symbol: false,
    description: false,
    externalUrl: false,
    imageFile: false,
    multimediaFile: false,
    multimediaCategory: false,
    royaltiesPercent: false,
    creators: false,
    attributes: false,
    storeAttributesOnchain: false,
    storeCreatorsOnchain: false,
    externalLinks: false,
    isSoulbound: false,
    isImmutableMetadata: false,
    preventNewPlugins: false,
    collectionAddress: false,
    isMutable: false,
    isCollectionNft: false,
    isCreateMany: false,
    createManyQuantity: false,
    ruleSetOption: false,
    customRuleSetAddress: false,
    customKeypair: false,
  })

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [multimediaPreviewUrl, setMultimediaPreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const multimediaInputRef = useRef<HTMLInputElement>(null)
  const keypairInputRef = useRef<HTMLInputElement>(null)
  const [isValidatingKeypair, setIsValidatingKeypair] = useState(false)

  const [uploadStep, setUploadStep] = useState<UploadStep>("idle")
  const [, setUploadedUris] = useState<UploadedUris>({
    imageUri: null,
    multimediaUri: null,
    metadataUri: null,
  })
  const [mintResult, setMintResult] = useState<MintResult | null>(null)
  const [batchMintResult, setBatchMintResult] = useState<BatchMintResult | null>(null)
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; failed: number } | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)

  const { signer, capabilities } = useTransactionSigner()

  const validateField = useCallback((field: TextFormField, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Name is required"
        if (value.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or less`
        return undefined
      case "symbol":
        if (!value.trim()) return "Symbol is required"
        if (value.length > MAX_SYMBOL_LENGTH) return `Symbol must be ${MAX_SYMBOL_LENGTH} characters or less`
        return undefined
      case "description":
        if (!value.trim()) return "Description is required"
        return undefined
      case "externalUrl":
        if (value && !validateUrl(value)) return "Please enter a valid URL"
        return undefined
      default:
        return undefined
    }
  }, [])

  const validateImageFile = useCallback((file: File): string | undefined => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please select a valid image file (JPG, PNG, or GIF)"
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return `Image must be ${MAX_IMAGE_SIZE_MB}MB or less`
    }
    return undefined
  }, [])

  const validateMultimediaFile = useCallback((file: File): string | undefined => {
    const category = getMultimediaCategory(file.name)
    if (!category) {
      return "Please select a valid multimedia file (MP4, MOV, MP3, FLAC, WAV, GLB, or GLTF)"
    }
    if (file.size > MAX_MULTIMEDIA_SIZE_BYTES) {
      return `File must be ${MAX_MULTIMEDIA_SIZE_MB}MB or less`
    }
    return undefined
  }, [])

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const error = validateImageFile(file)
      if (error) {
        setErrors((prev) => ({ ...prev, imageFile: error }))
        setTouched((prev) => ({ ...prev, imageFile: true }))
        e.target.value = ""
        return
      }

      setForm((prev) => ({ ...prev, imageFile: file }))
      setErrors((prev) => ({ ...prev, imageFile: undefined }))
      setTouched((prev) => ({ ...prev, imageFile: true }))

      const objectUrl = URL.createObjectURL(file)
      setImagePreviewUrl(objectUrl)
    },
    [validateImageFile]
  )

  const handleImageClear = useCallback(() => {
    setForm((prev) => ({ ...prev, imageFile: null }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }, [imagePreviewUrl])

  const handleMultimediaSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const error = validateMultimediaFile(file)
      if (error) {
        setErrors((prev) => ({ ...prev, multimediaFile: error }))
        setTouched((prev) => ({ ...prev, multimediaFile: true }))
        e.target.value = ""
        return
      }

      const category = getMultimediaCategory(file.name)
      setForm((prev) => ({ ...prev, multimediaFile: file, multimediaCategory: category }))
      setErrors((prev) => ({ ...prev, multimediaFile: undefined }))
      setTouched((prev) => ({ ...prev, multimediaFile: true }))

      const objectUrl = URL.createObjectURL(file)
      setMultimediaPreviewUrl(objectUrl)
    },
    [validateMultimediaFile]
  )

  const handleMultimediaClear = useCallback(() => {
    setForm((prev) => ({ ...prev, multimediaFile: null, multimediaCategory: null }))
    setErrors((prev) => ({ ...prev, multimediaFile: undefined }))
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }
    if (multimediaInputRef.current) {
      multimediaInputRef.current.value = ""
    }
  }, [multimediaPreviewUrl])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      if (multimediaPreviewUrl) {
        URL.revokeObjectURL(multimediaPreviewUrl)
      }
    }
  }, [imagePreviewUrl, multimediaPreviewUrl])

  const handleChange = useCallback(
    (field: TextFormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, [field]: value }))

      if (touched[field]) {
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
      }
    },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (field: TextFormField) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }))
    },
    [form, validateField]
  )

  useEffect(() => {
    if (account && form.creators.length === 0) {
      setForm((prev) => ({
        ...prev,
        creators: [{ address: account, share: 100 }],
      }))
    }
  }, [account, form.creators.length])

  useEffect(() => {
    onPreviewUpdate({
      name: form.name,
      symbol: form.symbol,
      description: form.description,
      imagePreviewUrl,
      attributes: form.attributes.filter((attr) => attr.traitType.trim()),
    })
  }, [form.name, form.symbol, form.description, imagePreviewUrl, form.attributes, onPreviewUpdate])

  const handleRoyaltiesChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, royaltiesPercent: value }))
    setTouched((prev) => ({ ...prev, royaltiesPercent: true }))
  }, [])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setForm((prev) => {
      const newCreators = [...prev.creators]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return { ...prev, creators: newCreators }
    })
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const handleAddCreator = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      creators: [...prev.creators, { address: "", share: 0 }],
    }))
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index),
    }))
    setTouched((prev) => ({ ...prev, creators: true }))
  }, [])

  const validateCreatorsOnBlur = useCallback(() => {
    if (touched.creators) {
      const { errors: creatorErrors } = validateCreators(form.creators)
      setErrors((prev) => ({
        ...prev,
        creators: creatorErrors.creators,
        creatorAddresses: creatorErrors.creatorAddresses,
        creatorShares: creatorErrors.creatorShares,
      }))
    }
  }, [form.creators, touched.creators])

  const handleAttributeChange = useCallback((index: number, field: "traitType" | "value", value: string) => {
    setForm((prev) => {
      const newAttributes = [...prev.attributes]
      newAttributes[index] = { ...newAttributes[index], [field]: value }
      return { ...prev, attributes: newAttributes }
    })
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleAddAttribute = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { traitType: "", value: "" }],
    }))
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleRemoveAttribute = useCallback((index: number) => {
    setForm((prev) => {
      const newAttributes = prev.attributes.filter((_, i) => i !== index)
      return { ...prev, attributes: newAttributes.length > 0 ? newAttributes : [{ traitType: "", value: "" }] }
    })
    setTouched((prev) => ({ ...prev, attributes: true }))
  }, [])

  const handleStoreAttributesOnchainChange = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, storeAttributesOnchain: value }))
  }, [])

  const handleStoreCreatorsOnchainChange = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, storeCreatorsOnchain: value }))
    setTouched((prev) => ({ ...prev, storeCreatorsOnchain: true }))
  }, [])

  const handleExternalLinkChange = useCallback((index: number, field: "name" | "url", value: string) => {
    setForm((prev) => {
      const newLinks = [...prev.externalLinks]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return { ...prev, externalLinks: newLinks }
    })
    setTouched((prev) => ({ ...prev, externalLinks: true }))
  }, [])

  const handleAddExternalLink = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      externalLinks: [...prev.externalLinks, { name: "", url: "" }],
    }))
    setTouched((prev) => ({ ...prev, externalLinks: true }))
  }, [])

  const handleRemoveExternalLink = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index),
    }))
    setTouched((prev) => ({ ...prev, externalLinks: true }))
  }, [])

  const handleSoulboundChange = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, isSoulbound: value }))
    setTouched((prev) => ({ ...prev, isSoulbound: true }))
  }, [])

  const handleImmutableMetadataChange = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, isImmutableMetadata: value }))
    setTouched((prev) => ({ ...prev, isImmutableMetadata: true }))
  }, [])

  const handlePreventNewPluginsChange = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, preventNewPlugins: value }))
    setTouched((prev) => ({ ...prev, preventNewPlugins: true }))
  }, [])

  const handleCollectionAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, collectionAddress: value }))

      if (touched.collectionAddress) {
        const error = value && !isValidSolanaAddress(value) ? "Invalid Solana address" : undefined
        setErrors((prev) => ({ ...prev, collectionAddress: error }))
      }
    },
    [touched.collectionAddress]
  )

  const handleCollectionAddressBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, collectionAddress: true }))
    const error =
      form.collectionAddress && !isValidSolanaAddress(form.collectionAddress) ? "Invalid Solana address" : undefined
    setErrors((prev) => ({ ...prev, collectionAddress: error }))
  }, [form.collectionAddress])

  const handleSelectCollection = useCallback((mintAddress: string) => {
    setForm((prev) => ({ ...prev, collectionAddress: mintAddress }))
    setTouched((prev) => ({ ...prev, collectionAddress: true }))
    setErrors((prev) => ({ ...prev, collectionAddress: undefined }))
  }, [])

  const handleMutableChange = useCallback((checked: boolean) => {
    setForm((prev) => ({ ...prev, isMutable: checked }))
    setTouched((prev) => ({ ...prev, isMutable: true }))
  }, [])

  const handleCollectionNftChange = useCallback((checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isCollectionNft: checked,
      royaltiesPercent: checked ? 0 : prev.royaltiesPercent,
    }))
    setTouched((prev) => ({ ...prev, isCollectionNft: true }))
  }, [])

  const handleCreateManyChange = useCallback((checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      isCreateMany: checked,
    }))
    setTouched((prev) => ({ ...prev, isCreateMany: true }))
  }, [])

  const handleCreateManyQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setForm((prev) => ({
        ...prev,
        createManyQuantity: Math.min(1000, Math.max(1, value)),
      }))
    }
    setTouched((prev) => ({ ...prev, createManyQuantity: true }))
  }, [])

  const handleRuleSetOptionChange = useCallback((option: RuleSetOption) => {
    setForm((prev) => ({
      ...prev,
      ruleSetOption: option,
      customRuleSetAddress: option === "custom" ? prev.customRuleSetAddress : "",
    }))
    setTouched((prev) => ({ ...prev, ruleSetOption: true }))
    if (option !== "custom") {
      setErrors((prev) => ({ ...prev, customRuleSetAddress: undefined }))
    }
  }, [])

  const handleCustomRuleSetAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setForm((prev) => ({ ...prev, customRuleSetAddress: value }))

      if (touched.customRuleSetAddress) {
        const error = value && !isValidSolanaAddress(value) ? "Invalid Solana address" : undefined
        setErrors((prev) => ({ ...prev, customRuleSetAddress: error }))
      }
    },
    [touched.customRuleSetAddress]
  )

  const handleCustomRuleSetAddressBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, customRuleSetAddress: true }))
    const error =
      form.customRuleSetAddress && !isValidSolanaAddress(form.customRuleSetAddress)
        ? "Invalid Solana address"
        : undefined
    setErrors((prev) => ({ ...prev, customRuleSetAddress: error }))
  }, [form.customRuleSetAddress])

  const checkAccountExists = useCallback(async (address: string): Promise<boolean> => {
    try {
      const accountInfo = await rpcRequest<{ value: { data: string } | null }>("getAccountInfo", [
        address,
        { encoding: "base64" },
      ])
      return accountInfo.value !== null
    } catch {
      return false
    }
  }, [])

  const handleGenerateKeypair = useCallback(async () => {
    setIsValidatingKeypair(true)
    setErrors((prev) => ({ ...prev, customKeypair: undefined }))
    try {
      const newKeypair = await generateKeyPairSigner()

      const exists = await checkAccountExists(newKeypair.address)
      if (exists) {
        setErrors((prev) => ({
          ...prev,
          customKeypair: "Generated address already exists. Click Respin to try again.",
        }))
        setIsValidatingKeypair(false)
        return
      }

      setForm((prev) => ({ ...prev, customKeypair: newKeypair }))
      setTouched((prev) => ({ ...prev, customKeypair: true }))
    } catch (err) {
      console.error("Failed to generate keypair:", err)
      setErrors((prev) => ({ ...prev, customKeypair: "Failed to generate keypair" }))
    }
    setIsValidatingKeypair(false)
  }, [checkAccountExists])

  const handleUploadKeypair = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsValidatingKeypair(true)
      setErrors((prev) => ({ ...prev, customKeypair: undefined }))

      try {
        const text = await file.text()
        const keypairArray = JSON.parse(text)

        if (!Array.isArray(keypairArray)) {
          setErrors((prev) => ({ ...prev, customKeypair: "Invalid keypair format. Expected a JSON array of bytes." }))
          setIsValidatingKeypair(false)
          return
        }

        if (keypairArray.length !== 64) {
          setErrors((prev) => ({
            ...prev,
            customKeypair: `Invalid keypair length. Expected 64 bytes, got ${keypairArray.length}.`,
          }))
          setIsValidatingKeypair(false)
          return
        }

        const bytes = new Uint8Array(keypairArray)
        const keypairSigner = await createKeyPairSignerFromBytes(bytes)

        const exists = await checkAccountExists(keypairSigner.address)
        if (exists) {
          setErrors((prev) => ({
            ...prev,
            customKeypair: "This keypair has already been used. The account already exists on-chain.",
          }))
          setIsValidatingKeypair(false)
          return
        }

        setForm((prev) => ({ ...prev, customKeypair: keypairSigner }))
        setTouched((prev) => ({ ...prev, customKeypair: true }))
      } catch (err) {
        console.error("Failed to parse keypair:", err)
        if (err instanceof SyntaxError) {
          setErrors((prev) => ({
            ...prev,
            customKeypair: "Invalid JSON format. Please upload a valid keypair JSON file.",
          }))
        } else {
          setErrors((prev) => ({ ...prev, customKeypair: "Failed to parse keypair. Please check the file format." }))
        }
      }

      setIsValidatingKeypair(false)
      if (keypairInputRef.current) {
        keypairInputRef.current.value = ""
      }
    },
    [checkAccountExists]
  )

  const handleClearKeypair = useCallback(() => {
    setForm((prev) => ({ ...prev, customKeypair: null }))
    setErrors((prev) => ({ ...prev, customKeypair: undefined }))
    setTouched((prev) => ({ ...prev, customKeypair: false }))
    if (keypairInputRef.current) {
      keypairInputRef.current.value = ""
    }
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: CreateFormErrors = {}
    let isValid = true

    const nameError = validateField("name", form.name)
    if (nameError) {
      newErrors.name = nameError
      isValid = false
    }

    const symbolError = validateField("symbol", form.symbol)
    if (symbolError) {
      newErrors.symbol = symbolError
      isValid = false
    }

    const descriptionError = validateField("description", form.description)
    if (descriptionError) {
      newErrors.description = descriptionError
      isValid = false
    }

    const externalUrlError = validateField("externalUrl", form.externalUrl)
    if (externalUrlError) {
      newErrors.externalUrl = externalUrlError
      isValid = false
    }

    if (!form.imageFile) {
      newErrors.imageFile = "Image is required"
      isValid = false
    }

    if (form.collectionAddress && !isValidSolanaAddress(form.collectionAddress)) {
      newErrors.collectionAddress = "Invalid Solana address"
      isValid = false
    }

    if (!form.isCollectionNft) {
      const { isValid: creatorsValid, errors: creatorErrors } = validateCreators(form.creators)
      if (!creatorsValid) {
        newErrors.creators = creatorErrors.creators
        newErrors.creatorAddresses = creatorErrors.creatorAddresses
        newErrors.creatorShares = creatorErrors.creatorShares
        isValid = false
      }
    }

    if (standard === "pnft" && form.ruleSetOption === "custom") {
      if (!form.customRuleSetAddress) {
        newErrors.customRuleSetAddress = "Custom rule set address is required"
        isValid = false
      } else if (!isValidSolanaAddress(form.customRuleSetAddress)) {
        newErrors.customRuleSetAddress = "Invalid Solana address"
        isValid = false
      }
    }

    setErrors(newErrors)
    setTouched({
      name: true,
      symbol: true,
      description: true,
      externalUrl: true,
      imageFile: true,
      multimediaFile: true,
      multimediaCategory: true,
      royaltiesPercent: true,
      creators: true,
      attributes: true,
      storeAttributesOnchain: true,
      storeCreatorsOnchain: true,
      externalLinks: true,
      isSoulbound: true,
      isImmutableMetadata: true,
      preventNewPlugins: true,
      collectionAddress: true,
      isMutable: true,
      isCollectionNft: true,
      isCreateMany: true,
      createManyQuantity: true,
      ruleSetOption: true,
      customRuleSetAddress: true,
      customKeypair: true,
    })

    return isValid
  }, [form, standard, validateField])

  const isFormValid = useCallback((): boolean => {
    if (!form.name.trim()) return false
    if (!form.symbol.trim()) return false
    if (!form.description.trim()) return false
    if (form.externalUrl && !validateUrl(form.externalUrl)) return false
    if (!form.imageFile) return false
    if (form.collectionAddress && !isValidSolanaAddress(form.collectionAddress)) return false

    if (!form.isCollectionNft) {
      const { isValid } = validateCreators(form.creators)
      if (!isValid) return false
    }

    if (standard === "pnft" && form.ruleSetOption === "custom") {
      if (!form.customRuleSetAddress || !isValidSolanaAddress(form.customRuleSetAddress)) return false
    }

    if (form.isCreateMany) {
      if (form.createManyQuantity < 1 || form.createManyQuantity > 1000) return false
    }

    return true
  }, [form, standard])

  const handleSubmit = useCallback(async () => {
    if (!account) {
      toast.error("Please connect your wallet")
      return
    }

    if (!signer || !capabilities.canSign) {
      toast.error("Wallet does not support signing")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before continuing")
      return
    }

    if (!form.imageFile) {
      toast.error("Image is required")
      return
    }

    const connectorSigner: ConnectorSigner = {
      signMessage: signer.signMessage?.bind(signer) as ConnectorSigner["signMessage"],
    }

    try {
      setUploadStep("uploading-image")
      toast.loading("Uploading image...", { id: "upload-progress" })

      const imageResult = await uploadToIrys(form.imageFile, account, connectorSigner)
      setUploadedUris((prev) => ({ ...prev, imageUri: imageResult.uri }))

      let multimediaResult: { uri: string; type: string } | null = null
      if (form.multimediaFile) {
        setUploadStep("uploading-multimedia")
        toast.loading("Uploading multimedia...", { id: "upload-progress" })

        const result = await uploadToIrys(form.multimediaFile, account, connectorSigner)
        multimediaResult = { uri: result.uri, type: form.multimediaFile.type }
        setUploadedUris((prev) => ({ ...prev, multimediaUri: result.uri }))
      }

      setUploadStep("uploading-metadata")
      toast.loading("Uploading metadata...", { id: "upload-progress" })

      const metadataInput: NftMetadataInput = {
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        image: imageResult.uri,
        imageType: form.imageFile.type,
        externalUrl: form.externalUrl || undefined,
        attributes: form.attributes
          .filter((attr) => attr.traitType.trim() && attr.value.trim())
          .map((attr) => ({ trait_type: attr.traitType, value: attr.value })),
      }

      if (multimediaResult) {
        metadataInput.animationUrl = multimediaResult.uri
        metadataInput.animationType = multimediaResult.type
        metadataInput.multimediaCategory = form.multimediaCategory as IrysMultimediaCategory
      }

      if (!form.isCollectionNft) {
        metadataInput.sellerFeeBasisPoints = Math.round(form.royaltiesPercent * 100)
        metadataInput.creators = form.creators.map((c) => ({
          address: c.address,
          share: c.share,
          verified: c.address === account,
        }))
      }

      const metadataResult = await uploadJsonMetadata(metadataInput, account, connectorSigner)
      setUploadedUris((prev) => ({ ...prev, metadataUri: metadataResult.uri }))

      if (form.isCreateMany) {
        setUploadStep("batch-minting")
        toast.loading(`Minting ${form.createManyQuantity} NFTs...`, { id: "upload-progress" })

        const quantity = form.createManyQuantity
        const mintItems: BatchMintItem[] = await Promise.all(
          Array.from({ length: quantity }, async (_, i) => ({
            index: i,
            assetSigner: await generateKeyPairSigner(),
          }))
        )

        const mintAddresses: string[] = mintItems.map((item) => item.assetSigner.address)
        setBatchProgress({ completed: 0, total: quantity, failed: 0 })

        const instructionGroups: InstructionGroup<BatchMintItem>[] = await Promise.all(
          mintItems.map(async (item) => {
            let instructions: Instruction[]
            if (standard === "core") {
              instructions = await buildCoreAssetInstructions({
                assetSigner: item.assetSigner,
                name: form.name,
                uri: metadataResult.uri,
                collectionAddress: form.collectionAddress || undefined,
                royaltiesPercent: form.isCollectionNft ? 0 : form.royaltiesPercent,
                creators: form.isCollectionNft
                  ? []
                  : form.creators.map((c) => ({
                      address: c.address as Address,
                      percentage: c.share,
                    })),
                isCollectionNft: form.isCollectionNft,
                feePayer: signer as unknown as TransactionSigner,
                account,
                attributes: form.attributes,
                storeAttributesOnchain: form.storeAttributesOnchain,
              })
            } else if (standard === "pnft") {
              instructions = await buildPnftInstructions({
                mintSigner: item.assetSigner,
                name: form.name,
                symbol: form.symbol,
                uri: metadataResult.uri,
                sellerFeeBasisPoints: form.isCollectionNft ? 0 : Math.round(form.royaltiesPercent * 100),
                creators: form.isCollectionNft
                  ? []
                  : form.creators.map((c) => ({
                      address: c.address as Address,
                      verified: c.address === account,
                      share: c.share,
                    })),
                collectionAddress: form.collectionAddress || undefined,
                ruleSetOption: form.ruleSetOption,
                customRuleSetAddress: form.customRuleSetAddress || undefined,
                isMutable: form.isMutable,
                isCollectionNft: form.isCollectionNft,
                feePayer: signer as unknown as TransactionSigner,
                account,
              })
            } else {
              instructions = await buildNiftyAssetInstructions({
                assetSigner: item.assetSigner,
                name: form.name,
                uri: metadataResult.uri,
                symbol: form.symbol,
                description: form.description,
                attributes: form.attributes,
                collectionAddress: form.collectionAddress || undefined,
                isMutable: form.isMutable,
                isCollectionNft: form.isCollectionNft,
                feePayer: signer as unknown as TransactionSigner,
                account,
                storeAttributesOnchain: form.storeAttributesOnchain,
              })
            }
            return { item, instructions }
          })
        )

        const result = await batchExecute(instructionGroups, signer as unknown as TransactionSigner, {
          onProgress: (progress) => {
            setBatchProgress({
              completed: progress.completed,
              total: progress.total,
              failed: progress.failed,
            })
            toast.loading(`Minting NFTs: ${progress.completed}/${progress.total} (${progress.failed} failed)`, {
              id: "upload-progress",
            })
          },
        })

        setBatchMintResult({
          successful: result.successful,
          failed: result.failed,
          mintAddresses: mintAddresses.slice(0, result.successful),
          signatures: result.signatures,
        })
        setUploadStep("complete")

        if (result.failed === 0) {
          toast.success(`Successfully minted ${result.successful} NFTs!`, { id: "upload-progress" })
        } else {
          toast.warning(`Minted ${result.successful} NFTs, ${result.failed} failed`, { id: "upload-progress" })
        }
        setShowSuccessDialog(true)
      } else {
        setUploadStep("minting")
        toast.loading("Minting NFT...", { id: "upload-progress" })

        let result: MintResult

        if (standard === "core") {
          result = await mintCoreAsset({
            name: form.name,
            uri: metadataResult.uri,
            collectionAddress: form.collectionAddress || undefined,
            royaltiesPercent: form.isCollectionNft ? 0 : form.royaltiesPercent,
            creators: form.isCollectionNft
              ? []
              : form.creators.map((c) => ({
                  address: c.address as Address,
                  percentage: c.share,
                })),
            isCollectionNft: form.isCollectionNft,
            feePayer: signer as unknown as TransactionSigner,
            account,
            customKeypair: form.customKeypair,
            attributes: form.attributes,
            storeAttributesOnchain: form.storeAttributesOnchain,
            storeCreatorsOnchain: form.storeCreatorsOnchain,
            isSoulbound: form.isSoulbound,
            isImmutableMetadata: form.isImmutableMetadata,
            preventNewPlugins: form.preventNewPlugins,
          })
        } else if (standard === "pnft") {
          result = await mintPnft({
            name: form.name,
            symbol: form.symbol,
            uri: metadataResult.uri,
            sellerFeeBasisPoints: form.isCollectionNft ? 0 : Math.round(form.royaltiesPercent * 100),
            creators: form.isCollectionNft
              ? []
              : form.creators.map((c) => ({
                  address: c.address as Address,
                  verified: c.address === account,
                  share: c.share,
                })),
            collectionAddress: form.collectionAddress || undefined,
            ruleSetOption: form.ruleSetOption,
            customRuleSetAddress: form.customRuleSetAddress || undefined,
            isMutable: form.isMutable,
            isCollectionNft: form.isCollectionNft,
            feePayer: signer as unknown as TransactionSigner,
            account,
            customKeypair: form.customKeypair,
          })
        } else {
          result = await mintNiftyAsset({
            name: form.name,
            uri: metadataResult.uri,
            symbol: form.symbol,
            description: form.description,
            attributes: form.attributes,
            collectionAddress: form.collectionAddress || undefined,
            isMutable: form.isMutable,
            isCollectionNft: form.isCollectionNft,
            feePayer: signer as unknown as TransactionSigner,
            account,
            customKeypair: form.customKeypair,
            storeAttributesOnchain: form.storeAttributesOnchain,
            storeCreatorsOnchain: form.storeCreatorsOnchain,
            creators: form.isCollectionNft
              ? undefined
              : form.creators.map((c) => ({
                  address: c.address as Address,
                  percentage: c.share,
                })),
            royaltiesPercent: form.isCollectionNft ? undefined : form.royaltiesPercent,
            externalLinks: form.externalLinks,
          })
        }

        setMintResult(result)
        setUploadStep("complete")
        toast.success("NFT created successfully!", { id: "upload-progress" })
        setShowSuccessDialog(true)
      }
    } catch (err) {
      console.error("Operation failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Operation failed"
      toast.error(errorMessage, {
        id: "upload-progress",
        action: {
          label: "Retry",
          onClick: () => handleSubmit(),
        },
      })
      setUploadStep("idle")
    }
  }, [account, signer, capabilities.canSign, form, standard, validateForm])

  const isSubmitting = uploadStep !== "idle" && uploadStep !== "complete"

  const sectionCompletion = useMemo(() => {
    // Required sections - must be filled to be complete
    const details = !!(
      form.name.trim() &&
      form.name.length <= MAX_NAME_LENGTH &&
      form.symbol.trim() &&
      form.symbol.length <= MAX_SYMBOL_LENGTH &&
      form.description.trim() &&
      (!form.externalUrl || validateUrl(form.externalUrl))
    )

    const media = !!form.imageFile

    // Optional sections - only complete if user has interacted AND added meaningful content
    // Attributes: complete if user has added at least one valid attribute
    const hasValidAttributes = form.attributes.some((a) => a.traitType.trim() && a.value.trim())
    const attributes = hasValidAttributes

    // Properties: complete only if user has interacted with the section AND creators are valid
    const propertiesTouched = touched.royaltiesPercent || touched.creators
    const properties = form.isCollectionNft
      ? true
      : (() => {
          if (!propertiesTouched) return false
          const { isValid } = validateCreators(form.creators)
          return isValid
        })()

    // Collection: complete only if a valid collection address is set
    const collection = !!form.collectionAddress && isValidSolanaAddress(form.collectionAddress)

    // Advanced: complete only if user has touched the section and config is valid
    const advancedTouched = touched.customKeypair || touched.ruleSetOption
    const hasCustomKeypair = !!form.customKeypair
    const hasValidCustomRuleSet =
      form.ruleSetOption !== "custom" ||
      (!!form.customRuleSetAddress && isValidSolanaAddress(form.customRuleSetAddress))
    const advanced = advancedTouched && (hasCustomKeypair || hasValidCustomRuleSet)

    return { details, media, attributes, properties, collection, advanced }
  }, [form, standard, touched.royaltiesPercent, touched.creators, touched.customKeypair, touched.ruleSetOption])

  const getSubmitButtonText = (): string => {
    switch (uploadStep) {
      case "uploading-image":
        return "Uploading image..."
      case "uploading-multimedia":
        return "Uploading multimedia..."
      case "uploading-metadata":
        return "Uploading metadata..."
      case "minting":
        return "Minting NFT..."
      case "batch-minting":
        return batchProgress
          ? `Minting ${batchProgress.completed}/${batchProgress.total}...`
          : `Minting ${form.createManyQuantity} NFTs...`
      case "complete":
        if (batchMintResult) {
          return `${batchMintResult.successful} NFTs Created!`
        }
        return mintResult ? "NFT Created!" : "Ready to mint"
      default:
        return form.isCreateMany ? `Create ${form.createManyQuantity} NFTs` : "Create NFT"
    }
  }

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      symbol: "",
      description: "",
      externalUrl: "",
      imageFile: null,
      multimediaFile: null,
      multimediaCategory: null,
      royaltiesPercent: 5,
      creators: account ? [{ address: account, share: 100 }] : [],
      attributes: [{ traitType: "", value: "" }],
      storeAttributesOnchain: false,
      storeCreatorsOnchain: false,
      externalLinks: [{ name: "", url: "" }],
      isSoulbound: false,
      isImmutableMetadata: false,
      preventNewPlugins: false,
      collectionAddress: "",
      isMutable: true,
      isCollectionNft: false,
      isCreateMany: false,
      createManyQuantity: 10,
      ruleSetOption: "metaplex",
      customRuleSetAddress: "",
      customKeypair: null,
    })
    setErrors({})
    setTouched({
      name: false,
      symbol: false,
      description: false,
      externalUrl: false,
      imageFile: false,
      multimediaFile: false,
      multimediaCategory: false,
      royaltiesPercent: false,
      creators: false,
      attributes: false,
      storeAttributesOnchain: false,
      storeCreatorsOnchain: false,
      externalLinks: false,
      isSoulbound: false,
      isImmutableMetadata: false,
      preventNewPlugins: false,
      collectionAddress: false,
      isMutable: false,
      isCollectionNft: false,
      isCreateMany: false,
      createManyQuantity: false,
      ruleSetOption: false,
      customRuleSetAddress: false,
      customKeypair: false,
    })
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl(null)
    }
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
    if (multimediaInputRef.current) {
      multimediaInputRef.current.value = ""
    }
    if (keypairInputRef.current) {
      keypairInputRef.current.value = ""
    }
    setUploadStep("idle")
    setUploadedUris({ imageUri: null, multimediaUri: null, metadataUri: null })
    setMintResult(null)
    setBatchMintResult(null)
    setBatchProgress(null)
  }, [account, imagePreviewUrl, multimediaPreviewUrl])

  const handleSuccessDialogClose = useCallback(() => {
    setShowSuccessDialog(false)
    resetForm()
  }, [resetForm])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }, [])

  return (
    <div className="space-y-6">
      <AssetStandardSelector value={standard} onChange={onStandardChange} />

      <Accordion type="multiple" defaultValue={["details", "media"]}>
        {/* Details Section */}
        <AccordionItem value="details" isComplete={sectionCompletion.details}>
          <AccordionTrigger step={1} isComplete={sectionCompletion.details}>
            Details
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FormField
              label="Name"
              required
              error={errors.name}
              counter={{ current: form.name.length, max: MAX_NAME_LENGTH }}
            >
              <Input
                value={form.name}
                onChange={handleChange("name")}
                onBlur={handleBlur("name")}
                placeholder="My Awesome NFT"
                maxLength={MAX_NAME_LENGTH}
                error={!!errors.name}
              />
            </FormField>

            <FormField
              label="Symbol"
              required
              error={errors.symbol}
              counter={{ current: form.symbol.length, max: MAX_SYMBOL_LENGTH }}
            >
              <Input
                value={form.symbol}
                onChange={handleChange("symbol")}
                onBlur={handleBlur("symbol")}
                placeholder="NFT"
                maxLength={MAX_SYMBOL_LENGTH}
                error={!!errors.symbol}
              />
            </FormField>

            <FormField label="Description" required error={errors.description}>
              <Textarea
                value={form.description}
                onChange={handleChange("description")}
                onBlur={handleBlur("description")}
                placeholder="Describe your NFT..."
                rows={4}
                error={!!errors.description}
              />
            </FormField>

            <FormField label="External URL / Website" error={errors.externalUrl}>
              <Input
                type="url"
                value={form.externalUrl}
                onChange={handleChange("externalUrl")}
                onBlur={handleBlur("externalUrl")}
                placeholder="https://example.com"
                error={!!errors.externalUrl}
              />
            </FormField>
          </AccordionContent>
        </AccordionItem>

        {/* Media Section */}
        <AccordionItem value="media" isComplete={sectionCompletion.media}>
          <AccordionTrigger step={2} isComplete={sectionCompletion.media}>
            Media
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <FormField label="Image" required error={errors.imageFile}>
              <input
                ref={imageInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_EXTENSIONS}
                onChange={handleImageSelect}
                className="hidden"
              />
              {form.imageFile && imagePreviewUrl ? (
                <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                  <img src={imagePreviewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{form.imageFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(form.imageFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleImageClear}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="group w-full rounded-xl p-6 transition-all duration-200 border-2 border-dashed border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-muted/30"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-200">
                      <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Select Image
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        JPG, PNG, or GIF (max {MAX_IMAGE_SIZE_MB}MB)
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </FormField>

            <FormField label="Multimedia (Optional)" error={errors.multimediaFile}>
              <input
                ref={multimediaInputRef}
                type="file"
                accept={ACCEPTED_MULTIMEDIA_EXTENSIONS}
                onChange={handleMultimediaSelect}
                className="hidden"
              />
              {form.multimediaFile && multimediaPreviewUrl ? (
                <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                  <MultimediaPreview category={form.multimediaCategory} previewUrl={multimediaPreviewUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{form.multimediaFile.name}</p>
                      <MultimediaCategoryBadge category={form.multimediaCategory} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(form.multimediaFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleMultimediaClear}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => multimediaInputRef.current?.click()}
                  className="group w-full rounded-xl p-6 transition-all duration-200 border-2 border-dashed border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-muted/30"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-xl bg-muted/50 border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-all duration-200">
                      <Film className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Add Multimedia
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </FormField>
          </AccordionContent>
        </AccordionItem>

        {/* Attributes Section - Hidden for Collection NFTs */}
        {!form.isCollectionNft && (
          <AccordionItem value="attributes" isComplete={sectionCompletion.attributes}>
            <AccordionTrigger step={3} isComplete={sectionCompletion.attributes}>
              Attributes
            </AccordionTrigger>
            <AccordionContent>
              <AttributesSection
                attributes={form.attributes}
                standard={standard}
                storeOnchain={form.storeAttributesOnchain}
                onAttributeChange={handleAttributeChange}
                onAddAttribute={handleAddAttribute}
                onRemoveAttribute={handleRemoveAttribute}
                onStoreOnchainChange={handleStoreAttributesOnchainChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Royalties & Creators Section - Hidden for Collection NFTs */}
        {!form.isCollectionNft && (
          <AccordionItem value="properties" isComplete={sectionCompletion.properties}>
            <AccordionTrigger step={4} isComplete={sectionCompletion.properties}>
              Royalties & Creators
            </AccordionTrigger>
            <AccordionContent>
              <RoyaltiesCreatorsSection
                royaltiesPercent={form.royaltiesPercent}
                creators={form.creators}
                errors={errors}
                standard={standard}
                storeCreatorsOnchain={form.storeCreatorsOnchain}
                onRoyaltiesChange={handleRoyaltiesChange}
                onCreatorChange={handleCreatorChange}
                onAddCreator={handleAddCreator}
                onRemoveCreator={handleRemoveCreator}
                onBlur={validateCreatorsOnBlur}
                onStoreCreatorsOnchainChange={handleStoreCreatorsOnchainChange}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Collection & Settings Section */}
        <AccordionItem value="collection" isComplete={sectionCompletion.collection}>
          <AccordionTrigger step={form.isCollectionNft ? 3 : 5} isComplete={sectionCompletion.collection}>
            Collection & Settings
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <CollectionSection
              collectionAddress={form.collectionAddress}
              error={errors.collectionAddress}
              account={account}
              onChange={handleCollectionAddressChange}
              onBlur={handleCollectionAddressBlur}
              onSelectCollection={handleSelectCollection}
            />

            <SettingsSection
              isMutable={form.isMutable}
              isCollectionNft={form.isCollectionNft}
              isCreateMany={form.isCreateMany}
              createManyQuantity={form.createManyQuantity}
              onMutableChange={handleMutableChange}
              onCollectionNftChange={handleCollectionNftChange}
              onCreateManyChange={handleCreateManyChange}
              onCreateManyQuantityChange={handleCreateManyQuantityChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Advanced Section */}
        <AccordionItem value="advanced" showConnector={false}>
          <AccordionTrigger step={form.isCollectionNft ? 4 : 6} isComplete={sectionCompletion.advanced}>
            Advanced
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {standard === "pnft" && (
              <RuleSetSection
                ruleSetOption={form.ruleSetOption}
                customRuleSetAddress={form.customRuleSetAddress}
                error={errors.customRuleSetAddress}
                onRuleSetOptionChange={handleRuleSetOptionChange}
                onCustomAddressChange={handleCustomRuleSetAddressChange}
                onCustomAddressBlur={handleCustomRuleSetAddressBlur}
              />
            )}

            {/* Core Asset Plugins */}
            {standard === "core" && !form.isCollectionNft && (
              <div className="space-y-3">
                <Label className="text-muted-foreground">Asset Plugins</Label>
                <div className="space-y-2">
                  {/* Soulbound (PermanentFreezeDelegate) */}
                  <button
                    type="button"
                    onClick={() => handleSoulboundChange(!form.isSoulbound)}
                    className={cn(
                      "w-full rounded-xl p-3 transition-all duration-200 border text-left",
                      form.isSoulbound
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            form.isSoulbound ? "bg-cyan-500/20 text-cyan-500" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Snowflake className="h-4 w-4" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              form.isSoulbound ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            Soulbound
                          </p>
                          <p className="text-xs text-muted-foreground">Non-transferable asset</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          form.isSoulbound ? "bg-cyan-500" : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            form.isSoulbound ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Immutable Metadata */}
                  <button
                    type="button"
                    onClick={() => handleImmutableMetadataChange(!form.isImmutableMetadata)}
                    className={cn(
                      "w-full rounded-xl p-3 transition-all duration-200 border text-left",
                      form.isImmutableMetadata
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            form.isImmutableMetadata
                              ? "bg-amber-500/20 text-amber-500"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <FileX className="h-4 w-4" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              form.isImmutableMetadata ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            Immutable Metadata
                          </p>
                          <p className="text-xs text-muted-foreground">Metadata cannot be changed</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          form.isImmutableMetadata ? "bg-amber-500" : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            form.isImmutableMetadata ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Prevent New Plugins (AddBlocker) */}
                  <button
                    type="button"
                    onClick={() => handlePreventNewPluginsChange(!form.preventNewPlugins)}
                    className={cn(
                      "w-full rounded-xl p-3 transition-all duration-200 border text-left",
                      form.preventNewPlugins
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            form.preventNewPlugins ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-medium",
                              form.preventNewPlugins ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            Prevent New Plugins
                          </p>
                          <p className="text-xs text-muted-foreground">No plugins can be added later</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "relative h-5 w-9 rounded-full transition-colors",
                          form.preventNewPlugins ? "bg-red-500" : "bg-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            form.preventNewPlugins ? "translate-x-4" : "translate-x-0.5"
                          )}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Nifty External Links */}
            {standard === "nifty" && !form.isCollectionNft && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">External Links</Label>
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={handleAddExternalLink}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add links to your website, social media, or other resources.
                </p>
                <div className="space-y-2">
                  {form.externalLinks.map((link, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 border border-border/50">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 grid grid-cols-[100px_1fr] gap-2">
                        <Input
                          value={link.name}
                          onChange={(e) => handleExternalLinkChange(index, "name", e.target.value)}
                          placeholder="Name"
                          className="h-10"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => handleExternalLinkChange(index, "url", e.target.value)}
                          placeholder="https://..."
                          className="h-10"
                        />
                      </div>
                      {form.externalLinks.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveExternalLink(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!form.isCreateMany && (
              <CustomKeypairSection
                customKeypair={form.customKeypair}
                error={errors.customKeypair}
                isValidating={isValidatingKeypair}
                onGenerate={handleGenerateKeypair}
                onUpload={handleUploadKeypair}
                onClear={handleClearKeypair}
                inputRef={keypairInputRef}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="pt-4">
        <Button
          type="button"
          className="w-full h-12"
          disabled={!isFormValid() || isSubmitting || !account || mintResult !== null}
          onClick={handleSubmit}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {mintResult && <CheckCircle2 className="h-4 w-4 mr-2" />}
          {getSubmitButtonText()}
        </Button>
        {!account && <p className="text-sm text-muted-foreground text-center mt-2">Connect wallet to create NFT</p>}
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {batchMintResult
                ? `${batchMintResult.successful} NFTs Created Successfully!`
                : "NFT Created Successfully!"}
            </DialogTitle>
            <DialogDescription>
              {batchMintResult ? (
                <>
                  Successfully minted {batchMintResult.successful}{" "}
                  {standard === "core" ? "Core Assets" : standard === "pnft" ? "pNFTs" : "Nifty Assets"}
                  {batchMintResult.failed > 0 && ` (${batchMintResult.failed} failed)`}.
                </>
              ) : (
                <>
                  Your {standard === "core" ? "Core Asset" : standard === "pnft" ? "pNFT" : "Nifty Asset"} has been
                  minted on Solana.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {batchMintResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Summary</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-green-500/10 p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{batchMintResult.successful}</div>
                    <div className="text-xs text-muted-foreground">Successful</div>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-3 text-center">
                    <div className="text-2xl font-bold text-destructive">{batchMintResult.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>
              </div>

              {batchMintResult.mintAddresses.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Mint Addresses ({batchMintResult.mintAddresses.length})
                  </Label>
                  <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/50">
                    {batchMintResult.mintAddresses.slice(0, 10).map((address, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b last:border-b-0">
                        <code className="text-xs font-mono truncate max-w-[200px]">{address}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(address)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {batchMintResult.mintAddresses.length > 10 && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                        +{batchMintResult.mintAddresses.length - 10} more
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => copyToClipboard(JSON.stringify(batchMintResult.mintAddresses, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Addresses as JSON
                  </Button>
                </div>
              )}
            </div>
          )}

          {mintResult && !batchMintResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mint Address</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                    {mintResult.mintAddress}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyToClipboard(mintResult.mintAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Transaction Signature</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                    {mintResult.signature.slice(0, 20)}...{mintResult.signature.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => copyToClipboard(mintResult.signature)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <a
                  href={`https://solscan.io/token/${mintResult.mintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
                    "ring-offset-background transition-all duration-200 ease-out-expo",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover",
                    "h-10 px-4 py-2 text-sm w-full"
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Solscan
                </a>
                <a
                  href={`https://solscan.io/tx/${mintResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
                    "ring-offset-background transition-all duration-200 ease-out-expo",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover",
                    "h-10 px-4 py-2 text-sm w-full"
                  )}
                >
                  <ExternalLink className="h-4 w-4" />
                  View Transaction
                </a>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" onClick={handleSuccessDialogClose} className="w-full">
              Create Another NFT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
