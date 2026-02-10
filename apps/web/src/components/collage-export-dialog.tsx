import { useState, useEffect, useRef } from "react"
import { X, Download, Loader2, Image } from "lucide-react"
import html2canvas from "html2canvas"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { API_BASE } from "@/lib/api"

interface CollageExportDialogProps {
  onClose: () => void
}

type QualityOption = "high" | "medium" | "low"

const qualitySettings: Record<QualityOption, { scale: number; quality: number; label: string; description: string }> = {
  high: { scale: 2, quality: 0.92, label: "High Quality", description: "Best quality, larger file" },
  medium: { scale: 1.5, quality: 0.85, label: "Medium", description: "Balanced quality and size" },
  low: { scale: 1, quality: 0.7, label: "Small File", description: "Smaller file, lower quality" },
}

async function fetchImageAsDataUrl(src: string): Promise<string> {
  const proxyUrl = `${API_BASE}/image-proxy?url=${encodeURIComponent(src)}`
  const response = await fetch(proxyUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function CollageExportDialog({ onClose }: CollageExportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("Initializing...")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<QualityOption>("medium")
  const [isExporting, setIsExporting] = useState(false)

  const gridDataRef = useRef<{
    gridElement: HTMLElement
    imageDataUrls: Map<string, string>
    gridHeight: number
  } | null>(null)

  useEffect(() => {
    prepareCollage()
  }, [])

  const prepareCollage = async () => {
    const container = document.getElementById("collage-grid-container")
    if (!container) {
      setError("Collage grid not found. Make sure you're in collage view.")
      setIsGenerating(false)
      return
    }

    try {
      setProgress(5)
      setProgressText("Finding grid...")

      const gridElement = container.querySelector(".muuri") as HTMLElement | null
      if (!gridElement) {
        setError("Grid element not found")
        setIsGenerating(false)
        return
      }

      setProgress(10)
      setProgressText("Finding images...")

      const images = gridElement.querySelectorAll("img")
      const totalImages = images.length

      if (totalImages === 0) {
        setError("No images found in the collage")
        setIsGenerating(false)
        return
      }

      setProgressText(`Loading ${totalImages} images...`)

      const imageDataUrls = new Map<string, string>()
      let loadedCount = 0

      await Promise.all(
        Array.from(images).map(async (img) => {
          const src = img.src
          if (!imageDataUrls.has(src)) {
            try {
              const dataUrl = await fetchImageAsDataUrl(src)
              imageDataUrls.set(src, dataUrl)
            } catch (err) {
              console.warn(`Failed to load image: ${src}`, err)
              imageDataUrls.set(src, src)
            }
          }
          loadedCount++
          const loadProgress = 10 + Math.floor((loadedCount / totalImages) * 60)
          setProgress(loadProgress)
          setProgressText(`Loading images (${loadedCount}/${totalImages})...`)
        })
      )

      setProgress(75)
      setProgressText("Calculating layout...")

      const originalItems = gridElement.querySelectorAll(".muuri-item")
      let gridHeight = 0
      originalItems.forEach((item) => {
        const el = item as HTMLElement
        const rect = el.getBoundingClientRect()
        const gridRect = gridElement.getBoundingClientRect()
        const bottom = rect.bottom - gridRect.top
        gridHeight = Math.max(gridHeight, bottom)
      })

      if (gridHeight === 0) {
        setError("Could not calculate grid height")
        setIsGenerating(false)
        return
      }

      gridDataRef.current = { gridElement, imageDataUrls, gridHeight }

      setProgress(85)
      setProgressText("Generating preview...")

      const preview = await generateImage(gridElement, imageDataUrls, gridHeight, 1.5, 0.85)
      setPreviewUrl(preview)
      setProgress(100)
      setProgressText("Ready!")
      setIsGenerating(false)
    } catch (err) {
      console.error("Failed to prepare collage:", err)
      setError(err instanceof Error ? err.message : "Failed to prepare collage")
      setIsGenerating(false)
    }
  }

  const generateImage = async (
    gridElement: HTMLElement,
    imageDataUrls: Map<string, string>,
    gridHeight: number,
    scale: number,
    quality: number
  ): Promise<string> => {
    const canvas = await html2canvas(gridElement, {
      backgroundColor: "#09090b",
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      height: gridHeight,
      onclone: (clonedDoc) => {
        const clonedGrid = clonedDoc.querySelector(".muuri") as HTMLElement | null
        if (clonedGrid) {
          clonedGrid.style.overflow = "visible"
          clonedGrid.style.height = `${gridHeight}px`

          const clonedImages = clonedGrid.querySelectorAll("img")
          clonedImages.forEach((img) => {
            const dataUrl = imageDataUrls.get(img.src)
            if (dataUrl && dataUrl.startsWith("data:")) {
              img.src = dataUrl
            }
          })
        }
      },
    })

    return canvas.toDataURL("image/jpeg", quality)
  }

  const handleDownload = async () => {
    if (!gridDataRef.current) return

    setIsExporting(true)
    const { gridElement, imageDataUrls, gridHeight } = gridDataRef.current
    const settings = qualitySettings[selectedQuality]

    try {
      const dataUrl = await generateImage(gridElement, imageDataUrls, gridHeight, settings.scale, settings.quality)
      const sizeKb = Math.round((dataUrl.length * 0.75) / 1024)
      logger.debug(`Export size: ~${sizeKb}KB (${selectedQuality})`)

      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `collage-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Collage</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="mb-4 text-sm text-muted-foreground">{progressText}</p>
              <div className="h-2 w-64 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{progress}%</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <Image className="mb-4 h-12 w-12 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          )}

          {!isGenerating && !error && previewUrl && (
            <div className="space-y-4">
              <div className="max-h-[50vh] overflow-auto rounded-lg border border-border bg-muted/50 p-2">
                <img src={previewUrl} alt="Collage preview" className="mx-auto max-w-full" />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Export Quality</p>
                <div className="flex gap-2">
                  {(Object.keys(qualitySettings) as QualityOption[]).map((key) => {
                    const option = qualitySettings[key]
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedQuality(key)}
                        className={cn(
                          "flex-1 rounded-lg border p-3 text-left transition-colors",
                          selectedQuality === key
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleDownload} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
