import { useState, type ComponentType } from "react"
import { User, Medal, Shield, Crown, Gem, Info, type LucideProps } from "lucide-react"
import { useAtomValue } from "jotai"
import { Tier, TIER_THRESHOLDS, TierBadge } from "@/components/tier-badge"
import { tierAtom } from "@/stores/tier"
import { MembershipInfoModal } from "./MembershipInfoModal"
import { cn } from "@/lib/utils"

const TIER_ORDER: Tier[] = [Tier.Free, Tier.Bronze, Tier.Silver, Tier.Gold, Tier.Diamond]

const tierColors: Record<
  Tier,
  { bg: string; border: string; text: string; glow: string; fill: string; icon: ComponentType<LucideProps> }
> = {
  [Tier.Free]: {
    bg: "bg-card",
    border: "border-border",
    text: "text-white/70",
    glow: "",
    fill: "bg-muted-foreground",
    icon: User,
  },
  [Tier.Bronze]: {
    bg: "bg-[linear-gradient(to_right,#5c3d1e,#cd7f32,#8b5a2b,#cd7f32,#5c3d1e)]",
    border: "border-[#cd7f32]/60",
    text: "text-[#ffd699]",
    glow: "shadow-[0_0_20px_-5px_rgba(205,127,50,0.4)]",
    fill: "bg-[#dea15e]",
    icon: Shield,
  },
  [Tier.Silver]: {
    bg: "bg-[linear-gradient(to_right,#4a5568,#a0aec0,#718096,#a0aec0,#4a5568)]",
    border: "border-[#c0c0c0]/60",
    text: "text-[#f0f0f0]",
    glow: "shadow-[0_0_20px_-5px_rgba(192,192,192,0.5)]",
    fill: "bg-[#d0d0d0]",
    icon: Medal,
  },
  [Tier.Gold]: {
    bg: "bg-[linear-gradient(to_right,#7a5c1a,#d4a84b,#b8942b,#d4a84b,#7a5c1a)]",
    border: "border-[#d4a84b]/60",
    text: "text-[#ffe082]",
    glow: "shadow-[0_0_20px_-5px_rgba(212,168,75,0.5)]",
    fill: "bg-[#e8c252]",
    icon: Crown,
  },
  [Tier.Diamond]: {
    bg: "bg-gradient-to-r from-cyan-900/80 to-blue-900/60",
    border: "border-cyan-400/50",
    text: "text-cyan-300",
    glow: "shadow-[0_0_25px_-5px_rgba(34,211,238,0.4)]",
    fill: "bg-cyan-300",
    icon: Gem,
  },
}

function getNextTier(currentTier: Tier): Tier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier)
  if (currentIndex === -1 || currentIndex === TIER_ORDER.length - 1) {
    return null
  }
  return TIER_ORDER[currentIndex + 1]
}

function getProgressToNextTier(count: number, currentTier: Tier): number {
  const nextTier = getNextTier(currentTier)
  if (!nextTier) return 100

  const currentThreshold = TIER_THRESHOLDS[currentTier]
  const nextThreshold = TIER_THRESHOLDS[nextTier]
  const range = nextThreshold - currentThreshold
  const progress = count - currentThreshold

  return Math.min(100, Math.max(0, (progress / range) * 100))
}

function getDandiesNeededForNextTier(count: number, currentTier: Tier): number {
  const nextTier = getNextTier(currentTier)
  if (!nextTier) return 0

  return TIER_THRESHOLDS[nextTier] - count
}

export function MembershipStatus() {
  const [showInfoModal, setShowInfoModal] = useState(false)
  const tierInfo = useAtomValue(tierAtom)
  const currentTier = tierInfo?.tier ?? Tier.Free
  const lockedCount = tierInfo?.stakedCount ?? 0
  const nextTier = getNextTier(currentTier)
  const progress = getProgressToNextTier(lockedCount, currentTier)
  const dandiesNeeded = getDandiesNeededForNextTier(lockedCount, currentTier)
  const colors = tierColors[currentTier]
  const currentIndex = TIER_ORDER.indexOf(currentTier)
  const TierIcon = colors.icon

  return (
    <>
      <MembershipInfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border px-4 py-3",
          colors.bg,
          colors.border,
          colors.glow
        )}
      >
        {/* Tier with info icon - clickable */}
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          title="View membership benefits"
        >
          <TierIcon
            className={cn("h-4 w-4", colors.text)}
            style={
              currentTier !== Tier.Free && currentTier !== Tier.Diamond
                ? {
                    filter:
                      "drop-shadow(0 -1px 0 rgba(0,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,0,0,0.3)) drop-shadow(0 1px 0 rgba(255,255,255,0.3))",
                  }
                : undefined
            }
          />
          <span
            className={cn("text-sm font-semibold uppercase tracking-wider", colors.text)}
            style={
              currentTier !== Tier.Free && currentTier !== Tier.Diamond
                ? { textShadow: "0 -1px 0 rgba(0,0,0,0.3), -1px 0 0 rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.3)" }
                : undefined
            }
          >
            {currentTier}
          </span>
          <Info className={cn("h-3.5 w-3.5 opacity-60", colors.text)} />
        </button>

        <div className="h-4 w-px bg-white/20" />

        {/* Dandy count */}
        <span className={cn("text-sm", colors.text)}>
          <span className="font-bold tabular-nums">{lockedCount}</span>
          <span className="ml-1">{lockedCount === 1 ? "Dandy" : "Dandies"}</span>
        </span>

        {/* Progress bar */}
        <div className="flex min-w-[140px] flex-1 items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                nextTier
                  ? colors.fill
                  : "animate-bar-sweep bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-[length:200%_100%]"
              )}
              style={{ width: nextTier ? `${progress}%` : "100%" }}
            />
          </div>
          {nextTier ? (
            <span className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs", colors.text)}>
              <span className="font-medium">{dandiesNeeded}</span> to <TierBadge tier={nextTier} size="sm" />
            </span>
          ) : (
            <span className={cn("whitespace-nowrap text-xs font-medium", colors.text)}>MAX</span>
          )}
        </div>

        {/* Tier dots - always visible */}
        <div className="flex items-center gap-1.5">
          {TIER_ORDER.map((tier, index) => {
            const isAchieved = index <= currentIndex
            const isCurrent = index === currentIndex

            return (
              <div
                key={tier}
                className={cn(
                  "h-2 w-2 rounded-full",
                  isAchieved ? "bg-white" : "bg-white/20",
                  isCurrent && "animate-ring-pulse"
                )}
                title={`${tier}: ${TIER_THRESHOLDS[tier]}+ Dandies`}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
