import { useRef, useCallback, useEffect, useState } from "react"
import { ImagePlus, X, Film, Music, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  ACCEPTED_MULTIMEDIA_EXTENSIONS,
  MAX_IMAGE_SIZE_MB,
  MAX_MULTIMEDIA_SIZE_MB,
  getMultimediaCategory,
  validateImageFile,
  validateMultimediaFile,
} from "@/lib/creator-studio/validation"
import type { MultimediaCategory } from "@/lib/creator-studio/types"

interface ImageFilePickerProps {
  imageFile: File | null
  imagePreviewUrl: string | null
  error?: string
  onSelect: (file: File) => void
  onClear: () => void
  onError: (error: string) => void
  existingImageUrl?: string | null
  showRevertButton?: boolean
}

export function ImageFilePicker({
  imageFile,
  imagePreviewUrl,
  error,
  onSelect,
  onClear,
  onError,
  existingImageUrl,
  showRevertButton = false,
}: ImageFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const validationError = validateImageFile(file)
      if (validationError) {
        onError(validationError)
        return
      }

      onSelect(file)
    },
    [onSelect, onError]
  )

  const displayUrl = imagePreviewUrl || existingImageUrl

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_EXTENSIONS} onChange={handleChange} className="hidden" />
      {displayUrl ? (
        <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
          <img src={displayUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover border" />
          <div className="flex-1 min-w-0">
            {imageFile ? (
              <>
                <p className="text-sm font-medium truncate">{imageFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(imageFile.size / 1024 / 1024).toFixed(2)} MB</p>
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
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Replace
              </Button>
              {showRevertButton && imageFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onClear}
                >
                  <X className="h-4 w-4 mr-1" />
                  Revert
                </Button>
              )}
              {!showRevertButton && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onClear}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
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
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="h-8 w-8" />
            <span>Select Image</span>
            <span className="text-xs">JPG, PNG, or GIF (max {MAX_IMAGE_SIZE_MB}MB)</span>
          </div>
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface MultimediaCategoryBadgeProps {
  category: MultimediaCategory | null
}

export function MultimediaCategoryBadge({ category }: MultimediaCategoryBadgeProps) {
  if (!category) return null

  const categoryConfig = {
    video: { icon: Film, label: "Video" },
    audio: { icon: Music, label: "Audio" },
    vr: { icon: Box, label: "3D/VR" },
  }

  const config = categoryConfig[category]
  const Icon = config.icon

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

interface MultimediaPreviewProps {
  category: MultimediaCategory | null
  previewUrl: string
}

export function MultimediaPreview({ category, previewUrl }: MultimediaPreviewProps) {
  if (category === "video") {
    return <video src={previewUrl} muted playsInline className="h-24 w-24 rounded-lg object-cover border bg-black" />
  }

  if (category === "audio") {
    return (
      <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
        <audio src={previewUrl} controls className="w-20" />
      </div>
    )
  }

  return (
    <div className="h-24 w-24 rounded-lg border bg-muted flex items-center justify-center">
      <Box className="h-8 w-8 text-muted-foreground" />
    </div>
  )
}

interface MultimediaFilePickerProps {
  multimediaFile: File | null
  multimediaCategory: MultimediaCategory | null
  multimediaPreviewUrl: string | null
  error?: string
  onSelect: (file: File, category: MultimediaCategory) => void
  onClear: () => void
  onError: (error: string) => void
}

export function MultimediaFilePicker({
  multimediaFile,
  multimediaCategory,
  multimediaPreviewUrl,
  error,
  onSelect,
  onClear,
  onError,
}: MultimediaFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const validationError = validateMultimediaFile(file)
      if (validationError) {
        onError(validationError)
        return
      }

      const category = getMultimediaCategory(file.name)
      if (!category) {
        onError("Unsupported file type")
        return
      }

      onSelect(file, category)
    },
    [onSelect, onError]
  )

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MULTIMEDIA_EXTENSIONS}
        onChange={handleChange}
        className="hidden"
      />
      {multimediaFile && multimediaPreviewUrl ? (
        <div className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4">
          <MultimediaPreview category={multimediaCategory} previewUrl={multimediaPreviewUrl} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{multimediaFile.name}</p>
              <MultimediaCategoryBadge category={multimediaCategory} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{(multimediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onClear}
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
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Film className="h-8 w-8" />
            <span>Add Multimedia</span>
            <span className="text-xs">Video, audio, or 3D model (max {MAX_MULTIMEDIA_SIZE_MB}MB)</span>
          </div>
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

interface UseFilePickerReturn {
  file: File | null
  previewUrl: string | null
  setFile: (file: File | null) => void
  clearFile: () => void
}

export function useFilePicker(): UseFilePickerReturn {
  const [file, setFileInternal] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  const setFile = useCallback((newFile: File | null) => {
    setFileInternal(newFile)
  }, [])

  const clearFile = useCallback(() => {
    setFileInternal(null)
  }, [])

  return { file, previewUrl, setFile, clearFile }
}
