import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "react-router"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { generateKeyPairSigner, type Address, type TransactionSigner } from "@solana/kit"
import { toast } from "sonner"
import {
  Hammer,
  Plus,
  Pencil,
  Layers,
  Box,
  Shield,
  Sparkles,
  ImagePlus,
  X,
  Film,
  Music,
  Trash2,
  FolderOpen,
  AlertTriangle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Copy,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
import { prepareAndSendTransaction } from "@/lib/transaction"
import { mplCore } from "@biblio/solana-programs"

type TabValue = "create" | "update" | "batch"
type AssetStandard = "core" | "pnft" | "nifty"
type RuleSetOption = "metaplex" | "compatibility" | "none" | "custom"

type MultimediaCategory = "video" | "audio" | "vr"

const RULE_SET_ADDRESSES = {
  metaplex: "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9",
  compatibility: "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5",
} as const

interface Creator {
  address: string
  share: number
}

interface Attribute {
  traitType: string
  value: string
}

interface CreateFormState {
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
  isCollectionNft: boolean
  ruleSetOption: RuleSetOption
  customRuleSetAddress: string
}

interface CreateFormErrors {
  name?: string
  symbol?: string
  description?: string
  externalUrl?: string
  imageFile?: string
  multimediaFile?: string
  royaltiesPercent?: string
  creators?: string
  creatorAddresses?: Record<number, string>
  creatorShares?: Record<number, string>
  collectionAddress?: string
  customRuleSetAddress?: string
}

type TextFormField = Exclude<
  keyof CreateFormState,
  | "imageFile"
  | "multimediaFile"
  | "multimediaCategory"
  | "royaltiesPercent"
  | "creators"
  | "attributes"
  | "collectionAddress"
  | "isMutable"
  | "isCollectionNft"
  | "ruleSetOption"
  | "customRuleSetAddress"
>

type UploadStep = "idle" | "uploading-image" | "uploading-multimedia" | "uploading-metadata" | "minting" | "complete"

interface MintResult {
  mintAddress: string
  signature: string
}

interface UploadedUris {
  imageUri: string | null
  multimediaUri: string | null
  metadataUri: string | null
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"]
const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.gif"
const MAX_IMAGE_SIZE_MB = 20
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

const ACCEPTED_MULTIMEDIA_EXTENSIONS = ".mp4,.mov,.mp3,.flac,.wav,.glb,.gltf"
const MAX_MULTIMEDIA_SIZE_MB = 100
const MAX_MULTIMEDIA_SIZE_BYTES = MAX_MULTIMEDIA_SIZE_MB * 1024 * 1024

const VIDEO_EXTENSIONS = [".mp4", ".mov"]
const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav"]
const VR_EXTENSIONS = [".glb", ".gltf"]

function getMultimediaCategory(filename: string): MultimediaCategory | null {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  if (VIDEO_EXTENSIONS.includes(ext)) return "video"
  if (AUDIO_EXTENSIONS.includes(ext)) return "audio"
  if (VR_EXTENSIONS.includes(ext)) return "vr"
  return null
}

const MAX_NAME_LENGTH = 32
const MAX_SYMBOL_LENGTH = 10

function validateUrl(url: string): boolean {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false
  if (address.length < 32 || address.length > 44) return false
  for (const char of address) {
    if (!BASE58_CHARS.includes(char)) return false
  }
  return true
}

function validateCreators(creators: Creator[]): { isValid: boolean; errors: CreateFormErrors } {
  const errors: CreateFormErrors = {
    creatorAddresses: {},
    creatorShares: {},
  }

  let totalShare = 0
  let hasErrors = false

  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i]

    if (!creator.address.trim()) {
      errors.creatorAddresses![i] = "Address is required"
      hasErrors = true
    } else if (!isValidSolanaAddress(creator.address.trim())) {
      errors.creatorAddresses![i] = "Invalid Solana address"
      hasErrors = true
    }

    if (creator.share < 0 || creator.share > 100) {
      errors.creatorShares![i] = "Share must be 0-100"
      hasErrors = true
    }

    totalShare += creator.share
  }

  if (totalShare !== 100) {
    errors.creators = `Creator shares must sum to 100% (currently ${totalShare}%)`
    hasErrors = true
  }

  return { isValid: !hasErrors, errors }
}

const VALID_TABS: TabValue[] = ["create", "update", "batch"]
const VALID_STANDARDS: AssetStandard[] = ["core", "pnft", "nifty"]

interface NftPreviewData {
  name: string
  symbol: string
  description: string
  imagePreviewUrl: string | null
  attributes: Attribute[]
}

function isValidTab(value: string | null): value is TabValue {
  return value !== null && VALID_TABS.includes(value as TabValue)
}

function isValidStandard(value: string | null): value is AssetStandard {
  return value !== null && VALID_STANDARDS.includes(value as AssetStandard)
}

const ASSET_STANDARDS: Array<{ value: AssetStandard; label: string; icon: typeof Box }> = [
  { value: "core", label: "Core Asset", icon: Box },
  { value: "pnft", label: "pNFT (Metaplex)", icon: Shield },
  { value: "nifty", label: "Nifty Asset", icon: Sparkles },
]

export function CreatorStudioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const standardParam = searchParams.get("standard")
  const activeTab: TabValue = isValidTab(tabParam) ? tabParam : "create"
  const activeStandard: AssetStandard = isValidStandard(standardParam) ? standardParam : "core"

  const [previewData, setPreviewData] = useState<NftPreviewData>({
    name: "",
    symbol: "",
    description: "",
    imagePreviewUrl: null,
    attributes: [],
  })

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === "create") {
      newParams.delete("tab")
    } else {
      newParams.set("tab", value)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handleStandardChange = (value: AssetStandard) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === "core") {
      newParams.delete("standard")
    } else {
      newParams.set("standard", value)
    }
    setSearchParams(newParams, { replace: true })
  }

  const handlePreviewUpdate = useCallback((data: NftPreviewData) => {
    setPreviewData(data)
  }, [])

  return (
    <div className="h-full flex flex-col animate-fade-up">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10" />
            <Hammer className="relative h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Creator Studio</h1>
            <p className="text-sm text-muted-foreground">Create, update, and manage your NFTs</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="update" className="gap-2">
              <Pencil className="h-4 w-4" />
              Update
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Layers className="h-4 w-4" />
              Batch
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-full">
            <div className="min-h-0">
              <TabsContent value="create" className="mt-0 h-full">
                <CreateTabContent
                  standard={activeStandard}
                  onStandardChange={handleStandardChange}
                  onPreviewUpdate={handlePreviewUpdate}
                />
              </TabsContent>
              <TabsContent value="update" className="mt-0 h-full">
                <UpdateTabPlaceholder />
              </TabsContent>
              <TabsContent value="batch" className="mt-0 h-full">
                <BatchTabPlaceholder />
              </TabsContent>
            </div>
            <div className="hidden lg:block">
              <NftPreviewCard data={previewData} />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}

interface AssetStandardSelectorProps {
  value: AssetStandard
  onChange: (value: AssetStandard) => void
}

function AssetStandardSelector({ value, onChange }: AssetStandardSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">Asset Standard</label>
      <div className="inline-flex items-center rounded-lg bg-muted p-1 text-muted-foreground">
        {ASSET_STANDARDS.map(({ value: standardValue, label, icon: Icon }) => (
          <button
            key={standardValue}
            type="button"
            onClick={() => onChange(standardValue)}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === standardValue
                ? "bg-background text-foreground shadow-sm"
                : "hover:bg-background/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MintCoreAssetOptions {
  name: string
  uri: string
  collectionAddress?: string
  royaltiesPercent: number
  creators: Array<{ address: Address; percentage: number }>
  isCollectionNft: boolean
  feePayer: TransactionSigner
  account: string
}

async function mintCoreAsset({
  name,
  uri,
  collectionAddress,
  royaltiesPercent,
  creators,
  isCollectionNft,
  feePayer,
  account,
}: MintCoreAssetOptions): Promise<MintResult> {
  const assetSigner = await generateKeyPairSigner()

  const plugins: mplCore.PluginAuthorityPairArgs[] = []

  if (!isCollectionNft && royaltiesPercent > 0 && creators.length > 0) {
    plugins.push({
      plugin: {
        __kind: "Royalties",
        fields: [
          {
            basisPoints: Math.round(royaltiesPercent * 100),
            creators: creators,
            ruleSet: { __kind: "None" },
          },
        ],
      },
      authority: null,
    })
  }

  const createInstruction = mplCore.getCreateV1Instruction({
    asset: assetSigner,
    payer: feePayer,
    owner: account as Address,
    updateAuthority: account as Address,
    collection: collectionAddress ? (collectionAddress as Address) : undefined,
    dataState: mplCore.DataState.AccountState,
    name,
    uri,
    plugins: plugins.length > 0 ? plugins : null,
  })

  const signature = await prepareAndSendTransaction({
    instructions: [createInstruction],
    feePayer,
  })

  return {
    mintAddress: assetSigner.address,
    signature,
  }
}

interface CreateTabContentProps {
  standard: AssetStandard
  onStandardChange: (value: AssetStandard) => void
  onPreviewUpdate: (data: NftPreviewData) => void
}

function CreateTabContent({ standard, onStandardChange, onPreviewUpdate }: CreateTabContentProps) {
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
    collectionAddress: "",
    isMutable: true,
    isCollectionNft: false,
    ruleSetOption: "metaplex",
    customRuleSetAddress: "",
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
    collectionAddress: false,
    isMutable: false,
    isCollectionNft: false,
    ruleSetOption: false,
    customRuleSetAddress: false,
  })

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [multimediaPreviewUrl, setMultimediaPreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const multimediaInputRef = useRef<HTMLInputElement>(null)

  const [uploadStep, setUploadStep] = useState<UploadStep>("idle")
  const [uploadedUris, setUploadedUris] = useState<UploadedUris>({
    imageUri: null,
    multimediaUri: null,
    metadataUri: null,
  })
  const [mintResult, setMintResult] = useState<MintResult | null>(null)
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
      collectionAddress: true,
      isMutable: true,
      isCollectionNft: true,
      ruleSetOption: true,
      customRuleSetAddress: true,
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

      if (standard !== "core") {
        setUploadStep("complete")
        toast.success("Files uploaded successfully! Ready to mint.", { id: "upload-progress" })
        return
      }

      setUploadStep("minting")
      toast.loading("Minting NFT...", { id: "upload-progress" })

      const result = await mintCoreAsset({
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
      })

      setMintResult(result)
      setUploadStep("complete")
      toast.success("NFT created successfully!", { id: "upload-progress" })
      setShowSuccessDialog(true)
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
      case "complete":
        return mintResult ? "NFT Created!" : "Ready to mint"
      default:
        return "Create NFT"
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
      collectionAddress: "",
      isMutable: true,
      isCollectionNft: false,
      ruleSetOption: "metaplex",
      customRuleSetAddress: "",
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
      collectionAddress: false,
      isMutable: false,
      isCollectionNft: false,
      ruleSetOption: false,
      customRuleSetAddress: false,
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
    setUploadStep("idle")
    setUploadedUris({ imageUri: null, multimediaUri: null, metadataUri: null })
    setMintResult(null)
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

      <div className="space-y-4">
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
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed"
              onClick={() => multimediaInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Film className="h-8 w-8" />
                <span>Add Multimedia</span>
                <span className="text-xs">Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)</span>
              </div>
            </Button>
          )}
        </FormField>

        {!form.isCollectionNft && (
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
        )}

        {!form.isCollectionNft && (
          <AttributesSection
            attributes={form.attributes}
            onAttributeChange={handleAttributeChange}
            onAddAttribute={handleAddAttribute}
            onRemoveAttribute={handleRemoveAttribute}
          />
        )}

        <CollectionSection
          collectionAddress={form.collectionAddress}
          error={errors.collectionAddress}
          onChange={handleCollectionAddressChange}
          onBlur={handleCollectionAddressBlur}
        />

        <SettingsSection
          isMutable={form.isMutable}
          isCollectionNft={form.isCollectionNft}
          onMutableChange={handleMutableChange}
          onCollectionNftChange={handleCollectionNftChange}
        />

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

        <div className="pt-6 border-t">
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
          {uploadStep === "complete" && uploadedUris.metadataUri && !mintResult && standard !== "core" && (
            <div className="mt-4 rounded-lg bg-primary/10 p-4">
              <p className="text-sm font-medium text-primary mb-2">Metadata uploaded successfully!</p>
              <p className="text-xs text-muted-foreground break-all">URI: {uploadedUris.metadataUri}</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              NFT Created Successfully!
            </DialogTitle>
            <DialogDescription>Your Core Asset NFT has been minted on Solana.</DialogDescription>
          </DialogHeader>

          {mintResult && (
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

interface RoyaltiesCreatorsSectionProps {
  royaltiesPercent: number
  creators: Creator[]
  errors: CreateFormErrors
  onRoyaltiesChange: (value: number) => void
  onCreatorChange: (index: number, field: "address" | "share", value: string | number) => void
  onAddCreator: () => void
  onRemoveCreator: (index: number) => void
  onBlur: () => void
}

function RoyaltiesCreatorsSection({
  royaltiesPercent,
  creators,
  errors,
  onRoyaltiesChange,
  onCreatorChange,
  onAddCreator,
  onRemoveCreator,
  onBlur,
}: RoyaltiesCreatorsSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
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
          onChange={(e) => onRoyaltiesChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <p className="text-xs text-muted-foreground">Percentage of secondary sales you receive as royalties</p>
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
    </div>
  )
}

interface AttributesSectionProps {
  attributes: Attribute[]
  onAttributeChange: (index: number, field: "traitType" | "value", value: string) => void
  onAddAttribute: () => void
  onRemoveAttribute: (index: number) => void
}

function AttributesSection({
  attributes,
  onAttributeChange,
  onAddAttribute,
  onRemoveAttribute,
}: AttributesSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Attributes / Traits</Label>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddAttribute}>
            <Plus className="h-4 w-4 mr-1" />
            Add Attribute
          </Button>
        </div>

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

        <p className="text-xs text-muted-foreground">
          Add traits to describe your NFT. Attributes with empty trait types will be excluded.
        </p>
      </div>
    </div>
  )
}

interface CollectionSectionProps {
  collectionAddress: string
  error?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
}

function CollectionSection({ collectionAddress, error, onChange, onBlur }: CollectionSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
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
          <Button type="button" variant="outline" className="shrink-0" disabled>
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose Collection
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Optionally assign this NFT to a collection. Leave empty to create a standalone NFT.
        </p>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  isMutable: boolean
  isCollectionNft: boolean
  onMutableChange: (checked: boolean) => void
  onCollectionNftChange: (checked: boolean) => void
}

function SettingsSection({ isMutable, isCollectionNft, onMutableChange, onCollectionNftChange }: SettingsSectionProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
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
    <div className="space-y-4 pt-4 border-t">
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
          <Label className={cn(error && "text-destructive")}>Custom Rule Set Address</Label>
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

function UpdateTabPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Pencil className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Update Existing NFT</p>
        <p className="text-sm mt-1">Load an NFT to modify its metadata</p>
      </div>
    </div>
  )
}

function BatchTabPlaceholder() {
  return (
    <div className="rounded-lg border border-dashed p-8 h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Batch Operations</p>
        <p className="text-sm mt-1">Manage multiple NFTs at once</p>
      </div>
    </div>
  )
}

interface NftPreviewCardProps {
  data: NftPreviewData
}

function NftPreviewCard({ data }: NftPreviewCardProps) {
  const { name, symbol, description, imagePreviewUrl, attributes } = data
  const hasContent = name || symbol || description || imagePreviewUrl || attributes.length > 0

  return (
    <div className="rounded-lg border bg-card overflow-hidden sticky top-6 shadow-sm">
      <div className="aspect-square relative bg-muted">
        {imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt={name || "NFT Preview"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No image selected</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {hasContent ? (
          <>
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-lg leading-tight truncate">
                  {name || <span className="text-muted-foreground italic">Untitled</span>}
                </h3>
                {symbol && (
                  <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {symbol}
                  </span>
                )}
              </div>
              {description && <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>}
            </div>

            {attributes.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attributes</p>
                <div className="flex flex-wrap gap-1.5">
                  {attributes.map((attr, index) => (
                    <div key={index} className="inline-flex flex-col rounded-md border bg-muted/50 px-2 py-1 text-xs">
                      <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                        {attr.traitType}
                      </span>
                      <span className="font-medium">{attr.value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-2 text-muted-foreground">
            <p className="font-medium">NFT Preview</p>
            <p className="text-sm mt-1">Fill out the form to see a live preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
