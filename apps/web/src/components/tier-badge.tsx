import { type ComponentType } from "react"
import { Shield, Medal, Crown, Gem, type LucideProps } from "lucide-react"
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

const tierStyles: Record<
  Exclude<Tier, Tier.Free>,
  { container: string; text: string; icon: ComponentType<LucideProps>; embossed: boolean }
> = {
  [Tier.Bronze]: {
    container: "border-[#cd7f32]/60 bg-[linear-gradient(to_right,#5c3d1e,#cd7f32,#8b5a2b,#cd7f32,#5c3d1e)]",
    text: "text-[#ffd699]",
    icon: Shield,
    embossed: true,
  },
  [Tier.Silver]: {
    container: "border-[#c0c0c0]/60 bg-[linear-gradient(to_right,#4a5568,#a0aec0,#718096,#a0aec0,#4a5568)]",
    text: "text-[#f0f0f0]",
    icon: Medal,
    embossed: true,
  },
  [Tier.Gold]: {
    container: "border-[#d4a84b]/60 bg-[linear-gradient(to_right,#7a5c1a,#d4a84b,#b8942b,#d4a84b,#7a5c1a)]",
    text: "text-[#ffe082]",
    icon: Crown,
    embossed: true,
  },
  [Tier.Diamond]: {
    container: "border-cyan-400/50 bg-gradient-to-r from-cyan-900/80 to-blue-900/60 animate-shimmer",
    text: "text-cyan-300",
    icon: Gem,
    embossed: false,
  },
}

const iconSizes = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
}

const embossedTextStyle = {
  textShadow: "0 -1px 0 rgba(0,0,0,0.3), -1px 0 0 rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.3)",
}

const embossedIconStyle = {
  filter:
    "drop-shadow(0 -1px 0 rgba(0,0,0,0.3)) drop-shadow(-1px 0 0 rgba(0,0,0,0.3)) drop-shadow(0 1px 0 rgba(255,255,255,0.3))",
}

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  if (tier === Tier.Free) return null

  const styles = tierStyles[tier]
  const Icon = styles.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-bold uppercase",
        sizeClasses[size],
        styles.container,
        styles.text
      )}
      style={styles.embossed ? embossedTextStyle : undefined}
    >
      <Icon className={iconSizes[size]} style={styles.embossed ? embossedIconStyle : undefined} />
      {tier}
    </span>
  )
}
