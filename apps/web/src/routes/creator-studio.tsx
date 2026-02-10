import { useState, useCallback } from "react"
import { useSearchParams } from "react-router"
import { Hammer, Plus, Pencil, Layers, Sparkles } from "lucide-react"
import { type TabValue, type AssetStandard, type NftPreviewData } from "@/lib/creator-studio"
import { NftPreviewCard, type BatchSummaryData } from "@/components/creator-studio/nft-preview-card"
import { CreateTabContent } from "@/components/creator-studio/create-tab-content"
import { UpdateTabContent } from "@/components/creator-studio/update-tab-content"
import { BatchTabContent } from "@/components/creator-studio/batch-tab-content"
import { cn } from "@/lib/utils"

const VALID_TABS: TabValue[] = ["create", "update", "batch"]
const VALID_STANDARDS: AssetStandard[] = ["core", "pnft", "nifty"]

function isValidTab(value: string | null): value is TabValue {
  return value !== null && VALID_TABS.includes(value as TabValue)
}

function isValidStandard(value: string | null): value is AssetStandard {
  return value !== null && VALID_STANDARDS.includes(value as AssetStandard)
}

const TAB_CONFIG = [
  {
    value: "create" as const,
    label: "Create",
    icon: Plus,
    description: "Mint new NFTs",
    gradient: "from-emerald-500/20 to-teal-500/20",
    activeGlow: "shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)]",
  },
  {
    value: "update" as const,
    label: "Update",
    icon: Pencil,
    description: "Modify existing",
    gradient: "from-blue-500/20 to-cyan-500/20",
    activeGlow: "shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]",
  },
  {
    value: "batch" as const,
    label: "Batch",
    icon: Layers,
    description: "Bulk operations",
    gradient: "from-violet-500/20 to-purple-500/20",
    activeGlow: "shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)]",
  },
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

  const [batchData, setBatchData] = useState<BatchSummaryData>({
    totalCount: 0,
    images: [],
  })

  const handleBatchDataUpdate = useCallback((data: BatchSummaryData) => {
    setBatchData(data)
  }, [])

  const handleTabChange = (value: TabValue) => {
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

  const activeConfig = TAB_CONFIG.find((t) => t.value === activeTab)

  return (
    <div className="min-h-full">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-card/80 to-transparent">
        {/* Animated background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -top-20 right-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-[80px]" />

        <div className="relative container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            {/* Title Section */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>NFT Creation Suite</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <Hammer className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
                  </div>
                </div>
                <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                  Creator Studio
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-md">
                Forge, modify, and manage your digital assets with precision tools
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/50 backdrop-blur-sm">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-1 px-5 py-3 rounded-xl transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? `bg-gradient-to-br ${tab.gradient} border border-white/10 ${tab.activeGlow}`
                        : "hover:bg-white/5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isActive ? "text-foreground" : "text-muted-foreground"
                      )}
                    />
                    <span className={cn("text-sm font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                      {tab.label}
                    </span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8">
          {/* Form Panel */}
          <div className="order-2 xl:order-1">
            <div
              className={cn(
                "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden",
                "shadow-xl shadow-black/5"
              )}
            >
              {/* Tab Header Bar */}
              <div className={cn("px-6 py-5 border-b border-border/30 bg-gradient-to-r", activeConfig?.gradient)}>
                <div className="flex items-center gap-4">
                  {activeConfig && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                      <activeConfig.icon className="h-5 w-5 text-foreground" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-display font-semibold text-xl tracking-tight">{activeConfig?.label}</h2>
                    <p className="text-sm text-foreground/60">{activeConfig?.description}</p>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "create" && (
                  <CreateTabContent
                    standard={activeStandard}
                    onStandardChange={handleStandardChange}
                    onPreviewUpdate={setPreviewData}
                  />
                )}
                {activeTab === "update" && <UpdateTabContent onPreviewUpdate={setPreviewData} />}
                {activeTab === "batch" && <BatchTabContent onBatchDataUpdate={handleBatchDataUpdate} />}
              </div>
            </div>
          </div>

          {/* Preview Panel - Sticky on desktop */}
          <div className="order-1 xl:order-2">
            <div className="xl:sticky xl:top-6">
              <NftPreviewCard data={previewData} mode={activeTab} batchData={batchData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
