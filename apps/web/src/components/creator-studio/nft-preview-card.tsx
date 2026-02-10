import { ImageIcon, Sparkles, Tag, Layers, Pencil } from "lucide-react"
import type { NftPreviewData, TabValue } from "@/lib/creator-studio"
import { cn } from "@/lib/utils"

export interface BatchSummaryData {
  totalCount: number
  images: string[]
}

interface NftPreviewCardProps {
  data: NftPreviewData
  mode?: TabValue
  batchData?: BatchSummaryData
}

const MODE_CONFIG = {
  create: {
    badge: "Live Preview",
    badgeIcon: Sparkles,
    emptyTitle: "Ready to Create",
    emptySubtitle: "Fill out the form to preview your NFT",
    imageEmptyTitle: "No image selected",
    imageEmptySubtitle: "Upload an image to see it here",
  },
  update: {
    badge: "Current NFT",
    badgeIcon: Pencil,
    emptyTitle: "Ready to Update",
    emptySubtitle: "Enter a mint address to load and modify an NFT",
    imageEmptyTitle: "No NFT loaded",
    imageEmptySubtitle: "Load an NFT to see it here",
  },
  batch: {
    badge: "Batch Selection",
    badgeIcon: Layers,
    emptyTitle: "Ready for Batch",
    emptySubtitle: "Load NFTs by collection, creator, or hashlist",
    imageEmptyTitle: "No NFTs loaded",
    imageEmptySubtitle: "Load NFTs to see them here",
  },
}

export function NftPreviewCard({ data, mode = "create", batchData }: NftPreviewCardProps) {
  const { name, symbol, description, imagePreviewUrl, attributes } = data
  const hasContent = name || symbol || description || imagePreviewUrl || attributes.length > 0
  const validAttributes = attributes.filter((a) => a.traitType.trim() && a.value.trim())
  const config = MODE_CONFIG[mode]

  // For batch mode, show special content
  const hasBatchContent = mode === "batch" && batchData && batchData.totalCount > 0
  const showGlow = mode === "batch" ? hasBatchContent : hasContent

  return (
    <div className="relative group">
      {/* Outer glow effect */}
      <div
        className={cn(
          "absolute -inset-1 rounded-3xl opacity-0 blur-xl transition-opacity duration-500",
          "bg-gradient-to-br from-primary/30 via-emerald-500/20 to-cyan-500/30",
          showGlow && "opacity-100"
        )}
      />

      {/* Main card */}
      <div className="relative rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/20">
        {/* Header badge */}
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90">
            <config.badgeIcon className="h-3 w-3 text-primary" />
            <span>{config.badge}</span>
            {hasBatchContent && (
              <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] font-bold">{batchData.totalCount}</span>
            )}
          </div>
        </div>

        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10 pointer-events-none" />

          {/* Batch mode - show grid of images */}
          {mode === "batch" && hasBatchContent ? (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60">
              <div className="grid grid-cols-3 gap-1 p-1 h-full">
                {batchData.images.slice(0, 9).map((img, index) => (
                  <div key={index} className="relative overflow-hidden rounded-lg bg-muted">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {batchData.images.length < 9 &&
                  Array.from({ length: 9 - batchData.images.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="relative overflow-hidden rounded-lg bg-muted/50 flex items-center justify-center"
                    >
                      <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                    </div>
                  ))}
              </div>
              {batchData.totalCount > 9 && (
                <div className="absolute bottom-2 right-2 z-20 px-2 py-1 rounded-md bg-black/70 text-xs font-medium text-white">
                  +{batchData.totalCount - 9} more
                </div>
              )}
            </div>
          ) : imagePreviewUrl ? (
            <>
              <img
                src={imagePreviewUrl}
                alt={name || "NFT Preview"}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
              {/* Animated grid pattern */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                   linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px",
                }}
              />

              <div className="relative text-center space-y-3 p-8">
                <div className="relative mx-auto w-fit">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <div className="relative p-4 rounded-2xl bg-gradient-to-br from-muted-foreground/10 to-transparent border border-white/5">
                    {mode === "create" ? (
                      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                    ) : (
                      <config.badgeIcon className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground/60">{config.imageEmptyTitle}</p>
                  <p className="text-xs text-muted-foreground/40">{config.imageEmptySubtitle}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="relative p-5 space-y-4">
          {/* Decorative top border */}
          <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Batch mode content */}
          {mode === "batch" ? (
            hasBatchContent ? (
              <div className="text-center py-2 space-y-2">
                <h3 className="font-display font-bold text-2xl">{batchData.totalCount}</h3>
                <p className="text-sm text-muted-foreground">NFTs selected for batch operation</p>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/50">
                  <config.badgeIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground/80">{config.emptyTitle}</p>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">{config.emptySubtitle}</p>
                </div>
              </div>
            )
          ) : hasContent ? (
            <>
              {/* Title & Symbol */}
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display font-bold text-xl leading-tight truncate min-w-0 flex-1">
                  {name || <span className="text-muted-foreground/50 font-normal italic">Untitled</span>}
                </h3>
                {symbol && (
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wide">
                    ${symbol}
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
              )}

              {/* Attributes */}
              {validAttributes.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Tag className="h-3 w-3" />
                    <span>Attributes</span>
                    <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{validAttributes.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {validAttributes.slice(0, 6).map((attr, index) => (
                      <div
                        key={index}
                        className="group/attr relative flex flex-col rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 px-3 py-2 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                          {attr.traitType}
                        </span>
                        <span className="text-sm font-semibold text-foreground/90 truncate max-w-[120px]">
                          {attr.value}
                        </span>
                      </div>
                    ))}
                    {validAttributes.length > 6 && (
                      <div className="flex items-center justify-center px-3 py-2 rounded-xl bg-muted/50 border border-border/30 text-xs text-muted-foreground font-medium">
                        +{validAttributes.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-2">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/50">
                <config.badgeIcon className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground/80">{config.emptyTitle}</p>
                <p className="text-sm text-muted-foreground/60 mt-0.5">{config.emptySubtitle}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom accent line */}
        <div className="h-1 bg-gradient-to-r from-primary/50 via-emerald-500/50 to-cyan-500/50" />
      </div>
    </div>
  )
}
