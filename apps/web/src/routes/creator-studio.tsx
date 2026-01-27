import { useState, useCallback, useRef, useEffect } from "react"
import { useSearchParams } from "react-router"
import { Hammer, Plus, Pencil, Layers, Box, Shield, Sparkles, ImagePlus, X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TabValue = "create" | "update" | "batch"
type AssetStandard = "core" | "pnft" | "nifty"

interface CreateFormState {
  name: string
  symbol: string
  description: string
  externalUrl: string
  imageFile: File | null
}

interface CreateFormErrors {
  name?: string
  symbol?: string
  description?: string
  externalUrl?: string
  imageFile?: string
}

type TextFormField = Exclude<keyof CreateFormState, "imageFile">

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif"]
const ACCEPTED_IMAGE_EXTENSIONS = ".jpg,.jpeg,.png,.gif"
const MAX_IMAGE_SIZE_MB = 20
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

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

const VALID_TABS: TabValue[] = ["create", "update", "batch"]
const VALID_STANDARDS: AssetStandard[] = ["core", "pnft", "nifty"]

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
                <CreateTabContent standard={activeStandard} onStandardChange={handleStandardChange} />
              </TabsContent>
              <TabsContent value="update" className="mt-0 h-full">
                <UpdateTabPlaceholder />
              </TabsContent>
              <TabsContent value="batch" className="mt-0 h-full">
                <BatchTabPlaceholder />
              </TabsContent>
            </div>
            <div className="hidden lg:block">
              <PreviewPlaceholder />
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

interface CreateTabContentProps {
  standard: AssetStandard
  onStandardChange: (value: AssetStandard) => void
}

function CreateTabContent({ standard, onStandardChange }: CreateTabContentProps) {
  const [form, setForm] = useState<CreateFormState>({
    name: "",
    symbol: "",
    description: "",
    externalUrl: "",
    imageFile: null,
  })

  const [errors, setErrors] = useState<CreateFormErrors>({})
  const [touched, setTouched] = useState<Record<keyof CreateFormState, boolean>>({
    name: false,
    symbol: false,
    description: false,
    externalUrl: false,
    imageFile: false,
  })

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

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

function PreviewPlaceholder() {
  return (
    <div className="rounded-lg border bg-muted/30 p-6 h-full flex items-center justify-center sticky top-6">
      <div className="text-center text-muted-foreground">
        <div className="w-32 h-32 rounded-lg bg-muted mx-auto mb-4" />
        <p className="font-medium">NFT Preview</p>
        <p className="text-sm mt-1">Live preview will appear here</p>
      </div>
    </div>
  )
}
