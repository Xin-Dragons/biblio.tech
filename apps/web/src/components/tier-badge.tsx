import { cn } from "@/lib/utils"

export enum Tier {
  Free = "Free",
  Bronze = "Bronze",
  Silver = "Silver",
  Gold = "Gold",
  Diamond = "Diamond",
}

export const TIER_THRESHOLDS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 1,
  [Tier.Silver]: 5,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 50,
}

export function getTierFromDandyCount(count: number): Tier {
  if (count >= TIER_THRESHOLDS[Tier.Diamond]) return Tier.Diamond
  if (count >= TIER_THRESHOLDS[Tier.Gold]) return Tier.Gold
  if (count >= TIER_THRESHOLDS[Tier.Silver]) return Tier.Silver
  if (count >= TIER_THRESHOLDS[Tier.Bronze]) return Tier.Bronze
  return Tier.Free
}

interface TierBadgeProps {
  tier: Tier
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
}

const tierStyles: Record<Exclude<Tier, Tier.Free>, { container: string; text: string }> = {
  [Tier.Bronze]: {
    container: "border-amber-600/40 bg-amber-900/30",
    text: "text-amber-400",
  },
  [Tier.Silver]: {
    container: "border-slate-400/40 bg-slate-600/30",
    text: "text-slate-300",
  },
  [Tier.Gold]: {
    container: "border-yellow-500/40 bg-yellow-900/30",
    text: "text-yellow-400",
  },
  [Tier.Diamond]: {
    container: "border-cyan-400/40 bg-cyan-900/30 animate-shimmer",
    text: "text-cyan-300",
  },
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  if (tier === Tier.Free) return null

  const styles = tierStyles[tier]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        sizeClasses[size],
        styles.container,
        styles.text
      )}
    >
      {tier}
    </span>
  )
}
