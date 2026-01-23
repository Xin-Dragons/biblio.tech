import { useAtomValue } from "jotai"
import { Check, Circle, Dot } from "lucide-react"
import { TierBadge, Tier, TIER_THRESHOLDS, getTierFromDandyCount } from "@/components/tier-badge"
import { stakedNftCountAtom } from "@/stores/stake"
import { cn } from "@/lib/utils"

const TIER_ORDER: Tier[] = [Tier.Free, Tier.Bronze, Tier.Silver, Tier.Gold, Tier.Diamond]

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

interface TierProgressionProps {
  currentTier: Tier
}

function TierProgression({ currentTier }: TierProgressionProps) {
  const currentIndex = TIER_ORDER.indexOf(currentTier)

  return (
    <div className="flex items-center justify-center gap-2">
      {TIER_ORDER.map((tier, index) => {
        const isAchieved = index < currentIndex
        const isCurrent = index === currentIndex
        const isLocked = index > currentIndex

        return (
          <div key={tier} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                isAchieved && "border-primary bg-primary text-primary-foreground",
                isCurrent && "border-primary bg-primary/20",
                isLocked && "border-muted-foreground/30 bg-transparent"
              )}
            >
              {isAchieved && <Check className="h-3 w-3" />}
              {isCurrent && <Dot className="h-4 w-4 text-primary" />}
              {isLocked && <Circle className="h-2 w-2 text-muted-foreground/30" />}
            </div>
            <span
              className={cn(
                "text-[10px]",
                isAchieved && "text-muted-foreground",
                isCurrent && "font-medium text-foreground",
                isLocked && "text-muted-foreground/50"
              )}
            >
              {tier}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function MembershipStatus() {
  const lockedCount = useAtomValue(stakedNftCountAtom)
  const currentTier = getTierFromDandyCount(lockedCount)
  const nextTier = getNextTier(currentTier)
  const progress = getProgressToNextTier(lockedCount, currentTier)
  const dandiesNeeded = getDandiesNeededForNextTier(lockedCount, currentTier)

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-card p-6">
      <TierBadge tier={currentTier} size="lg" />

      <div className="text-center">
        <p className="text-2xl font-bold">
          {lockedCount} {lockedCount === 1 ? "Dandy" : "Dandies"} Locked
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {nextTier ? `${dandiesNeeded} more for ${nextTier}` : "Max tier reached"}
        </p>
      </div>

      <TierProgression currentTier={currentTier} />
    </div>
  )
}
