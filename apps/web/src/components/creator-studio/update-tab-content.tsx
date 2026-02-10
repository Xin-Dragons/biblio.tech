import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { type Address, type TransactionSigner } from "@solana/kit"
import { toast } from "sonner"
import {
  Box,
  Shield,
  Sparkles,
  ImagePlus,
  X,
  Film,
  FolderOpen,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Pencil,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
  type NftMetadataInput,
  type MultimediaCategory as IrysMultimediaCategory,
} from "@/lib/irys"
import {
  type AssetStandard,
  type MultimediaCategory,
  type Creator,
  type Attribute,
  type CreateFormErrors,
  type LoadedNftData,
  type NftPreviewData,
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
import { loadNft } from "@/lib/creator-studio/loading"
import { updateCoreAsset, updatePnft, updateNiftyAsset } from "@/lib/creator-studio/batch-operations"
import { validateCreators } from "@/lib/creator-studio/validation"
import { NftPickerModal } from "@/components/creator-studio/nft-picker-modal"
import { RoyaltiesCreatorsSection, AttributesSection } from "@/components/creator-studio/form-sections"
import { MultimediaPreview, MultimediaCategoryBadge } from "@/components/creator-studio/file-pickers"

const STANDARD_ICONS: Record<AssetStandard, typeof Box> = {
  core: Box,
  pnft: Shield,
  nifty: Sparkles,
}

const ASSET_STANDARDS_UI = ASSET_STANDARDS.map((standard) => ({
  ...standard,
  icon: STANDARD_ICONS[standard.value],
}))

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

function ModifiedBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-primary font-medium", className)}>
      <Pencil className="h-3 w-3" />
      Modified
    </span>
  )
}

interface UpdateFormState {
  name: string
  symbol: string
  description: string
  externalUrl: string
  imageFile: File | null
  multimediaFile: File | null
  multimediaCategory: MultimediaCategory | null
  royaltiesPercent: number
  creators: Creator[]
  attributes: Attribute[]
  collectionAddress: string
  isMutable: boolean
}

interface OriginalFormState {
  name: string
  symbol: string
  description: string
  externalUrl: string
  imageUrl: string | null
  royaltiesPercent: number
  creators: Creator[]
  attributes: Attribute[]
  collectionAddress: string
  isMutable: boolean
}

export interface UpdateTabContentProps {
  onPreviewUpdate: (data: NftPreviewData) => void
}

type UpdateStep = "idle" | "uploading-image" | "uploading-multimedia" | "uploading-metadata" | "updating" | "complete"

export function UpdateTabContent({ onPreviewUpdate }: UpdateTabContentProps) {
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenAddressError, setTokenAddressError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [loadedNft, setLoadedNft] = useState<LoadedNftData | null>(null)
  const [authorityError, setAuthorityError] = useState<string | undefined>()
  const [updateStep, setUpdateStep] = useState<UpdateStep>("idle")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [updateSignature, setUpdateSignature] = useState<string | null>(null)

  const [form, setForm] = useState<UpdateFormState>({
    name: "",
    symbol: "",
    description: "",
    externalUrl: "",
    imageFile: null,
    multimediaFile: null,
    multimediaCategory: null,
    royaltiesPercent: 0,
    creators: [],
    attributes: [{ traitType: "", value: "" }],
    collectionAddress: "",
    isMutable: true,
  })

  const [originalForm, setOriginalForm] = useState<OriginalFormState | null>(null)
  const [errors, setErrors] = useState<CreateFormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [multimediaPreviewUrl, setMultimediaPreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const multimediaInputRef = useRef<HTMLInputElement>(null)

  const validateField = useCallback((field: string, value: string): string | undefined => {
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

  const populateFormFromNft = useCallback(
    (nftData: LoadedNftData) => {
      const attrs = nftData.attributes.length > 0 ? nftData.attributes : [{ traitType: "", value: "" }]
      const creators = nftData.creators.length > 0 ? nftData.creators : [{ address: account || "", share: 100 }]

      setForm({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        externalUrl: nftData.externalUrl || "",
        imageFile: null,
        multimediaFile: null,
        multimediaCategory: null,
        royaltiesPercent: nftData.royaltiesPercent,
        creators,
        attributes: attrs,
        collectionAddress: nftData.collectionAddress || "",
        isMutable: nftData.isMutable,
      })

      setOriginalForm({
        name: nftData.name,
        symbol: nftData.symbol,
        description: nftData.description,
        externalUrl: nftData.externalUrl || "",
        imageUrl: nftData.imageUrl,
        royaltiesPercent: nftData.royaltiesPercent,
        creators,
        attributes: attrs,
        collectionAddress: nftData.collectionAddress || "",
        isMutable: nftData.isMutable,
      })

      if (nftData.imageUrl) {
        setImagePreviewUrl(nftData.imageUrl)
      }

      setErrors({})
      setTouched({})
    },
    [account]
  )

  const loadAndProcessNft = useCallback(
    async (mintAddress: string) => {
      setIsLoading(true)
      setTokenAddressError(undefined)
      setAuthorityError(undefined)
      setLoadedNft(null)

      try {
        const nftData = await loadNft(mintAddress)
        setLoadedNft(nftData)

        if (account && nftData.updateAuthority !== account) {
          setAuthorityError(
            `You are not the update authority. Update authority: ${nftData.updateAuthority.slice(0, 8)}...${nftData.updateAuthority.slice(-8)}`
          )
        }

        populateFormFromNft(nftData)

        onPreviewUpdate({
          name: nftData.name,
          symbol: nftData.symbol,
          description: nftData.description,
          imagePreviewUrl: nftData.imageUrl,
          attributes: nftData.attributes,
        })

        toast.success(`Loaded ${ASSET_STANDARDS.find((s) => s.value === nftData.standard)?.label || nftData.standard}`)
      } catch (err) {
        const message = getErrorMessage(err, "Failed to load NFT")
        setTokenAddressError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    },
    [account, onPreviewUpdate, populateFormFromNft]
  )

  const handleTokenAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setTokenAddress(value)
      setTokenAddressError(undefined)
      setAuthorityError(undefined)

      if (value && isValidSolanaAddress(value)) {
        loadAndProcessNft(value)
      }
    },
    [loadAndProcessNft]
  )

  const handleTokenAddressBlur = useCallback(() => {
    if (tokenAddress && !isValidSolanaAddress(tokenAddress)) {
      setTokenAddressError("Invalid Solana address")
    }
  }, [tokenAddress])

  const handleChange = useCallback(
    (field: "name" | "symbol" | "description" | "externalUrl") =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value
        setForm((prev) => ({ ...prev, [field]: value }))

        if (touched[field]) {
          setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
        }
      },
    [touched, validateField]
  )

  const handleBlur = useCallback(
    (field: "name" | "symbol" | "description" | "externalUrl") => () => {
      setTouched((prev) => ({ ...prev, [field]: true }))
      setErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }))
    },
    [form, validateField]
  )

  const handleRoyaltiesChange = useCallback((value: number) => {
    setForm((prev) => ({ ...prev, royaltiesPercent: value }))
  }, [])

  const handleCreatorChange = useCallback((index: number, field: "address" | "share", value: string | number) => {
    setForm((prev) => {
      const newCreators = [...prev.creators]
      newCreators[index] = { ...newCreators[index], [field]: value }
      return { ...prev, creators: newCreators }
    })
  }, [])

  const handleAddCreator = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      creators: [...prev.creators, { address: "", share: 0 }],
    }))
  }, [])

  const handleRemoveCreator = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      creators: prev.creators.filter((_, i) => i !== index),
    }))
  }, [])

  const handleAttributeChange = useCallback((index: number, field: "traitType" | "value", value: string) => {
    setForm((prev) => {
      const newAttributes = [...prev.attributes]
      newAttributes[index] = { ...newAttributes[index], [field]: value }
      return { ...prev, attributes: newAttributes }
    })
  }, [])

  const handleAddAttribute = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { traitType: "", value: "" }],
    }))
  }, [])

  const handleRemoveAttribute = useCallback((index: number) => {
    setForm((prev) => {
      const newAttributes = prev.attributes.filter((_, i) => i !== index)
      return { ...prev, attributes: newAttributes.length > 0 ? newAttributes : [{ traitType: "", value: "" }] }
    })
  }, [])

  const handleCollectionAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setForm((prev) => ({ ...prev, collectionAddress: value }))
  }, [])

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

  const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false)
  const [isNftPickerOpen, setIsNftPickerOpen] = useState(false)

  const handleSelectNftToUpdate = useCallback(
    (mintAddress: string) => {
      setTokenAddress(mintAddress)
      setIsNftPickerOpen(false)
      loadAndProcessNft(mintAddress)
    },
    [loadAndProcessNft]
  )

  const validateCreatorsOnBlur = useCallback(() => {
    const { errors: creatorErrors } = validateCreators(form.creators)
    setErrors((prev) => ({
      ...prev,
      creators: creatorErrors.creators,
      creatorAddresses: creatorErrors.creatorAddresses,
      creatorShares: creatorErrors.creatorShares,
    }))
  }, [form.creators])

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, imageFile: "Please select a valid image file (JPG, PNG, or GIF)" }))
      e.target.value = ""
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, imageFile: `Image must be ${MAX_IMAGE_SIZE_MB}MB or less` }))
      e.target.value = ""
      return
    }

    setForm((prev) => ({ ...prev, imageFile: file }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))

    const objectUrl = URL.createObjectURL(file)
    setImagePreviewUrl(objectUrl)
  }, [])

  const handleImageClear = useCallback(() => {
    setForm((prev) => ({ ...prev, imageFile: null }))
    setErrors((prev) => ({ ...prev, imageFile: undefined }))
    if (imagePreviewUrl && originalForm?.imageUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl(originalForm?.imageUrl || null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }, [imagePreviewUrl, originalForm?.imageUrl])

  const handleMultimediaSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const category = getMultimediaCategory(file.name)
    if (!category) {
      setErrors((prev) => ({
        ...prev,
        multimediaFile: "Please select a valid multimedia file (MP4, MOV, MP3, FLAC, WAV, GLB, or GLTF)",
      }))
      e.target.value = ""
      return
    }
    if (file.size > MAX_MULTIMEDIA_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, multimediaFile: `File must be ${MAX_MULTIMEDIA_SIZE_MB}MB or less` }))
      e.target.value = ""
      return
    }

    setForm((prev) => ({ ...prev, multimediaFile: file, multimediaCategory: category }))
    setErrors((prev) => ({ ...prev, multimediaFile: undefined }))

    const objectUrl = URL.createObjectURL(file)
    setMultimediaPreviewUrl(objectUrl)
  }, [])

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
      if (imagePreviewUrl && originalForm?.imageUrl !== imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
      if (multimediaPreviewUrl) {
        URL.revokeObjectURL(multimediaPreviewUrl)
      }
    }
  }, [imagePreviewUrl, multimediaPreviewUrl, originalForm?.imageUrl])

  useEffect(() => {
    if (loadedNft) {
      onPreviewUpdate({
        name: form.name,
        symbol: form.symbol,
        description: form.description,
        imagePreviewUrl,
        attributes: form.attributes.filter((attr) => attr.traitType.trim()),
      })
    }
  }, [form.name, form.symbol, form.description, imagePreviewUrl, form.attributes, loadedNft, onPreviewUpdate])

  const isFieldDirty = useCallback(
    (field: keyof OriginalFormState): boolean => {
      if (!originalForm) return false
      if (field === "creators" || field === "attributes") {
        return JSON.stringify(form[field]) !== JSON.stringify(originalForm[field])
      }
      return form[field as keyof UpdateFormState] !== originalForm[field]
    },
    [form, originalForm]
  )

  const isImageDirty = useMemo(() => {
    if (!originalForm) return false
    return form.imageFile !== null
  }, [form.imageFile, originalForm])

  const isFormDirty = useMemo(() => {
    if (!originalForm) return false
    return (
      form.name !== originalForm.name ||
      form.symbol !== originalForm.symbol ||
      form.description !== originalForm.description ||
      form.externalUrl !== originalForm.externalUrl ||
      form.imageFile !== null ||
      form.royaltiesPercent !== originalForm.royaltiesPercent ||
      form.collectionAddress !== originalForm.collectionAddress ||
      JSON.stringify(form.creators) !== JSON.stringify(originalForm.creators) ||
      JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes)
    )
  }, [form, originalForm])

  const handleCancel = useCallback(() => {
    if (!originalForm || !loadedNft) return

    if (imagePreviewUrl && originalForm.imageUrl !== imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    if (multimediaPreviewUrl) {
      URL.revokeObjectURL(multimediaPreviewUrl)
      setMultimediaPreviewUrl(null)
    }

    populateFormFromNft(loadedNft)
    toast.info("Changes discarded")
  }, [originalForm, loadedNft, imagePreviewUrl, multimediaPreviewUrl, populateFormFromNft])

  const handleUpdateSubmit = useCallback(async () => {
    if (!loadedNft || !account || !originalForm || !isFormDirty) return
    if (!signer || !capabilities?.canSignMessage) {
      toast.error("Please connect a wallet that can sign messages")
      return
    }

    const toastId = "update-nft"
    try {
      let imageUri = originalForm.imageUrl
      let multimediaUri: string | null = null

      const needsMetadataUpload =
        form.name !== originalForm.name ||
        form.symbol !== originalForm.symbol ||
        form.description !== originalForm.description ||
        form.externalUrl !== originalForm.externalUrl ||
        form.imageFile !== null ||
        form.multimediaFile !== null ||
        form.royaltiesPercent !== originalForm.royaltiesPercent ||
        JSON.stringify(form.creators) !== JSON.stringify(originalForm.creators) ||
        JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes)

      if (form.imageFile) {
        setUpdateStep("uploading-image")
        toast.loading("Uploading new image...", { id: toastId })
        const imageResult = await uploadToIrys(form.imageFile, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        imageUri = imageResult.uri
      }

      if (form.multimediaFile && form.multimediaCategory) {
        setUpdateStep("uploading-multimedia")
        toast.loading("Uploading multimedia...", { id: toastId })
        const multimediaResult = await uploadToIrys(form.multimediaFile, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        multimediaUri = multimediaResult.uri
      }

      let metadataUri = loadedNft.uri
      if (needsMetadataUpload) {
        setUpdateStep("uploading-metadata")
        toast.loading("Uploading metadata...", { id: toastId })

        const metadataInput: NftMetadataInput = {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          image: imageUri || "",
          externalUrl: form.externalUrl || undefined,
          attributes: form.attributes
            .filter((a) => a.traitType.trim())
            .map((a) => ({ trait_type: a.traitType, value: a.value })),
          sellerFeeBasisPoints: Math.round(form.royaltiesPercent * 100),
          creators: form.creators.map((c) => ({ address: c.address, share: c.share })),
        }

        if (multimediaUri && form.multimediaCategory) {
          metadataInput.animationUrl = multimediaUri
          metadataInput.multimediaCategory = form.multimediaCategory as IrysMultimediaCategory
        }

        if (imageUri) {
          metadataInput.imageType = form.imageFile?.type
        }

        const metadataResult = await uploadJsonMetadata(metadataInput, account, {
          signMessage: signer.signMessage?.bind(signer) as (message: Uint8Array) => Promise<Uint8Array>,
        })
        metadataUri = metadataResult.uri
      }

      setUpdateStep("updating")
      toast.loading("Updating NFT...", { id: toastId })

      const feePayer = signer as unknown as TransactionSigner
      let signature: string

      if (loadedNft.standard === "core") {
        signature = await updateCoreAsset({
          assetAddress: loadedNft.mintAddress as Address,
          newName: form.name !== originalForm.name ? form.name : undefined,
          newUri: metadataUri !== loadedNft.uri ? metadataUri : undefined,
          collectionAddress: form.collectionAddress || undefined,
          feePayer,
        })
      } else if (loadedNft.standard === "pnft") {
        const creators = form.creators.map((c) => ({
          address: c.address as Address,
          verified: c.address === account,
          share: c.share,
        }))

        signature = await updatePnft({
          mintAddress: loadedNft.mintAddress as Address,
          newName: form.name,
          newSymbol: form.symbol,
          newUri: metadataUri,
          sellerFeeBasisPoints: Math.round(form.royaltiesPercent * 100),
          creators,
          collectionAddress: form.collectionAddress || undefined,
          originalCollectionAddress: originalForm.collectionAddress || undefined,
          ruleSetAddress: loadedNft.ruleSetAddress ? (loadedNft.ruleSetAddress as Address) : null,
          feePayer,
          account,
        })
      } else {
        signature = await updateNiftyAsset({
          assetAddress: loadedNft.mintAddress as Address,
          newName: form.name !== originalForm.name ? form.name : undefined,
          newUri: metadataUri !== loadedNft.uri ? metadataUri : undefined,
          newSymbol: form.symbol !== originalForm.symbol ? form.symbol : undefined,
          newDescription: form.description !== originalForm.description ? form.description : undefined,
          attributes:
            JSON.stringify(form.attributes) !== JSON.stringify(originalForm.attributes) ? form.attributes : undefined,
          collectionAddress: form.collectionAddress || undefined,
          feePayer,
        })
      }

      setUpdateStep("complete")
      setUpdateSignature(signature)
      toast.success("NFT updated successfully!", { id: toastId })
      setShowSuccessDialog(true)

      const updatedNft = await loadNft(loadedNft.mintAddress)
      setLoadedNft(updatedNft)
      populateFormFromNft(updatedNft)

      onPreviewUpdate({
        name: updatedNft.name,
        symbol: updatedNft.symbol,
        description: updatedNft.description,
        imagePreviewUrl: updatedNft.imageUrl,
        attributes: updatedNft.attributes,
      })
    } catch (err) {
      console.error("Update failed:", err)
      toast.error(getErrorMessage(err, "Update failed"), {
        id: toastId,
        action: {
          label: "Retry",
          onClick: handleUpdateSubmit,
        },
      })
    } finally {
      setUpdateStep("idle")
    }
  }, [loadedNft, account, originalForm, isFormDirty, signer, capabilities, form, populateFormFromNft, onPreviewUpdate])

  const getStandardBadge = (standard: AssetStandard) => {
    const config = ASSET_STANDARDS_UI.find((s) => s.value === standard)
    if (!config) return null
    const Icon = config.icon
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    )
  }

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }, [])

  const canUpdate = loadedNft && account && loadedNft.updateAuthority === account && !authorityError

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className={cn(tokenAddressError && "text-destructive")}>Token Address</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={tokenAddress}
                onChange={handleTokenAddressChange}
                onBlur={handleTokenAddressBlur}
                placeholder="Paste NFT mint address"
                error={!!tokenAddressError}
                disabled={isLoading}
                className="pr-10"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNftPickerOpen(true)}
              disabled={isLoading || !account}
              className="shrink-0"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Choose
            </Button>
          </div>
          {tokenAddressError && <p className="text-sm text-destructive">{tokenAddressError}</p>}
          <p className="text-xs text-muted-foreground">
            Enter an address or choose from NFTs you have update authority for
          </p>
        </div>

        {loadedNft && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Loaded NFT</h3>
              {getStandardBadge(loadedNft.standard)}
            </div>

            {authorityError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">{authorityError}</p>
              </div>
            )}

            {!authorityError && account && loadedNft.updateAuthority === account && (
              <div className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">You are the update authority and can modify this NFT</p>
              </div>
            )}

            {canUpdate && (
              <div className="space-y-4 pt-4 border-t">
                <Accordion
                  type="multiple"
                  defaultValue={["details", "media", "attributes", "properties", "collection"]}
                >
                  {/* Details Section */}
                  <AccordionItem value="details" isComplete>
                    <AccordionTrigger step={1} isComplete>
                      Details
                      {(isFieldDirty("name") ||
                        isFieldDirty("symbol") ||
                        isFieldDirty("description") ||
                        isFieldDirty("externalUrl")) && <ModifiedBadge className="ml-2" />}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <UpdateFormField
                        label="Name"
                        required
                        error={errors.name}
                        counter={{ current: form.name.length, max: MAX_NAME_LENGTH }}
                        isDirty={isFieldDirty("name")}
                      >
                        <Input
                          value={form.name}
                          onChange={handleChange("name")}
                          onBlur={handleBlur("name")}
                          placeholder="NFT Name"
                          maxLength={MAX_NAME_LENGTH}
                          error={!!errors.name}
                        />
                      </UpdateFormField>

                      <UpdateFormField
                        label="Symbol"
                        required
                        error={errors.symbol}
                        counter={{ current: form.symbol.length, max: MAX_SYMBOL_LENGTH }}
                        isDirty={isFieldDirty("symbol")}
                      >
                        <Input
                          value={form.symbol}
                          onChange={handleChange("symbol")}
                          onBlur={handleBlur("symbol")}
                          placeholder="Symbol"
                          maxLength={MAX_SYMBOL_LENGTH}
                          error={!!errors.symbol}
                        />
                      </UpdateFormField>

                      <UpdateFormField
                        label="Description"
                        required
                        error={errors.description}
                        isDirty={isFieldDirty("description")}
                      >
                        <Textarea
                          value={form.description}
                          onChange={handleChange("description")}
                          onBlur={handleBlur("description")}
                          placeholder="Describe your NFT..."
                          rows={4}
                          error={!!errors.description}
                        />
                      </UpdateFormField>

                      <UpdateFormField
                        label="External URL / Website"
                        error={errors.externalUrl}
                        isDirty={isFieldDirty("externalUrl")}
                      >
                        <Input
                          type="url"
                          value={form.externalUrl}
                          onChange={handleChange("externalUrl")}
                          onBlur={handleBlur("externalUrl")}
                          placeholder="https://example.com"
                          error={!!errors.externalUrl}
                        />
                      </UpdateFormField>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Media Section */}
                  <AccordionItem value="media" isComplete>
                    <AccordionTrigger step={2} isComplete>
                      Media
                      {(isImageDirty || form.multimediaFile !== null) && <ModifiedBadge className="ml-2" />}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <UpdateFormField label="Image" error={errors.imageFile} isDirty={isImageDirty}>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept={ACCEPTED_IMAGE_EXTENSIONS}
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        {imagePreviewUrl ? (
                          <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
                            <img
                              src={imagePreviewUrl}
                              alt="Preview"
                              className="h-24 w-24 rounded-lg object-cover border"
                            />
                            <div className="flex-1 min-w-0">
                              {form.imageFile ? (
                                <>
                                  <p className="text-sm font-medium truncate">{form.imageFile.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(form.imageFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm text-muted-foreground">Current image</p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => imageInputRef.current?.click()}
                                >
                                  <ImagePlus className="h-4 w-4 mr-1" />
                                  Replace
                                </Button>
                                {form.imageFile && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={handleImageClear}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Revert
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-24 border-dashed"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ImagePlus className="h-8 w-8" />
                              <span>Select Image</span>
                              <span className="text-xs">JPG, PNG, or GIF (max {MAX_IMAGE_SIZE_MB}MB)</span>
                            </div>
                          </Button>
                        )}
                      </UpdateFormField>

                      <UpdateFormField
                        label="Multimedia (Optional)"
                        error={errors.multimediaFile}
                        isDirty={form.multimediaFile !== null}
                      >
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
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-24 border-dashed"
                            onClick={() => multimediaInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Film className="h-8 w-8" />
                              <span>Add Multimedia</span>
                              <span className="text-xs">
                                Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)
                              </span>
                            </div>
                          </Button>
                        )}
                      </UpdateFormField>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Attributes Section */}
                  <AccordionItem value="attributes" isComplete>
                    <AccordionTrigger step={3} isComplete>
                      Attributes
                      {isFieldDirty("attributes") && <ModifiedBadge className="ml-2" />}
                    </AccordionTrigger>
                    <AccordionContent>
                      <AttributesSection
                        attributes={form.attributes}
                        onAttributeChange={handleAttributeChange}
                        onAddAttribute={handleAddAttribute}
                        onRemoveAttribute={handleRemoveAttribute}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Royalties & Creators Section */}
                  <AccordionItem value="properties" isComplete>
                    <AccordionTrigger step={4} isComplete>
                      Royalties & Creators
                      {(isFieldDirty("royaltiesPercent") || isFieldDirty("creators")) && (
                        <ModifiedBadge className="ml-2" />
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      <RoyaltiesCreatorsSection
                        royaltiesPercent={form.royaltiesPercent}
                        creators={form.creators}
                        errors={errors}
                        onRoyaltiesChange={handleRoyaltiesChange}
                        onCreatorChange={handleCreatorChange}
                        onAddCreator={handleAddCreator}
                        onRemoveCreator={handleRemoveCreator}
                        onBlur={validateCreatorsOnBlur}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Collection Section */}
                  <AccordionItem value="collection" isComplete showConnector={false}>
                    <AccordionTrigger step={5} isComplete>
                      Collection
                      {isFieldDirty("collectionAddress") && <ModifiedBadge className="ml-2" />}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            value={form.collectionAddress}
                            onChange={handleCollectionAddressChange}
                            onBlur={handleCollectionAddressBlur}
                            placeholder="Collection address (optional)"
                            error={!!errors.collectionAddress}
                          />
                          {errors.collectionAddress && (
                            <p className="text-sm text-destructive mt-1">{errors.collectionAddress}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => setIsCollectionPickerOpen(true)}
                          disabled={!account}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Choose
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <NftPickerModal
                  open={isCollectionPickerOpen}
                  onClose={() => setIsCollectionPickerOpen(false)}
                  onSelect={handleSelectCollection}
                  account={account}
                  mode="collection"
                />

                <div className="pt-6 border-t flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={!isFormDirty || updateStep !== "idle"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!isFormDirty || updateStep !== "idle"}
                    onClick={handleUpdateSubmit}
                  >
                    {updateStep !== "idle" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {updateStep === "uploading-image" && "Uploading image..."}
                        {updateStep === "uploading-multimedia" && "Uploading multimedia..."}
                        {updateStep === "uploading-metadata" && "Uploading metadata..."}
                        {updateStep === "updating" && "Updating NFT..."}
                        {updateStep === "complete" && "Done!"}
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Update NFT
                      </>
                    )}
                  </Button>
                </div>

                {isFormDirty && updateStep === "idle" && (
                  <p className="text-xs text-center text-muted-foreground">
                    You have unsaved changes. Click Update NFT to apply them.
                  </p>
                )}
              </div>
            )}

            {!canUpdate && !authorityError && (
              <p className="text-sm text-muted-foreground">Connect your wallet to check update authority.</p>
            )}
          </div>
        )}

        {!loadedNft && !isLoading && (
          <div className="rounded-lg border border-dashed p-8 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Pencil className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Update Existing NFT</p>
              <p className="text-sm mt-1">Enter a token address or choose from your updatable NFTs</p>
            </div>
          </div>
        )}
      </div>

      <NftPickerModal
        open={isNftPickerOpen}
        onClose={() => setIsNftPickerOpen(false)}
        onSelect={handleSelectNftToUpdate}
        account={account}
        mode="updateAuthority"
      />

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              NFT Updated Successfully!
            </DialogTitle>
            <DialogDescription>
              Your {loadedNft ? ASSET_STANDARDS.find((s) => s.value === loadedNft.standard)?.label : "NFT"} has been
              updated on-chain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Token Address</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono truncate">
                  {loadedNft?.mintAddress}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => loadedNft && copyToClipboard(loadedNft.mintAddress)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {updateSignature && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Transaction Signature</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono truncate">
                    {updateSignature}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => updateSignature && copyToClipboard(updateSignature)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <a
              href={`https://solscan.io/token/${loadedNft?.mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on Solscan
            </a>
            <Button type="button" onClick={() => setShowSuccessDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface UpdateFormFieldProps {
  label: string
  required?: boolean
  error?: string
  counter?: { current: number; max: number }
  isDirty?: boolean
  children: React.ReactNode
}

function UpdateFormField({ label, required, error, counter, isDirty, children }: UpdateFormFieldProps) {
  return (
    <div className={cn("space-y-2", isDirty && "ring-2 ring-primary/20 rounded-lg p-3 -m-1")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className={cn(error && "text-destructive")}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          {isDirty && <ModifiedBadge />}
        </div>
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
