import { Link } from "react-router"
import { ArrowRight, Vote, User, Percent, Check, Lock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { TierBadge, Tier, getTierFromDandyCount } from "@/components/tier-badge"
import { cn } from "@/lib/utils"

const TIER_THRESHOLDS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 1,
  [Tier.Silver]: 5,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 50,
}

const VOTES_PER_DAY: Record<Tier, number> = {
  [Tier.Free]: 1,
  [Tier.Bronze]: 3,
  [Tier.Silver]: 7,
  [Tier.Gold]: 15,
  [Tier.Diamond]: 25,
}

const FEE_DISCOUNTS: Record<Tier, number> = {
  [Tier.Free]: 0,
  [Tier.Bronze]: 0.25,
  [Tier.Silver]: 0.5,
  [Tier.Gold]: 0.75,
  [Tier.Diamond]: 1,
}

const TIER_ORDER: Tier[] = [Tier.Free, Tier.Bronze, Tier.Silver, Tier.Gold, Tier.Diamond]

function getNextTier(currentTier: Tier): Tier | null {
  const currentIndex = TIER_ORDER.indexOf(currentTier)
  if (currentIndex === -1 || currentIndex === TIER_ORDER.length - 1) return null
  return TIER_ORDER[currentIndex + 1]
}

interface TierBenefitsCardProps {
  stakedCount: number
  className?: string
}

interface BenefitRowProps {
  icon: React.ReactNode
  label: string
  value: string
  unlocked: boolean
}

function BenefitRow({ icon, label, value, unlocked }: BenefitRowProps) {
  return (
    <div className={cn("flex items-center justify-between py-2", !unlocked && "opacity-50")}>
      <div className="flex items-center gap-2">
        {unlocked ? <Check className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </div>
      <span className={cn("font-medium", unlocked ? "text-foreground" : "text-muted-foreground")}>{value}</span>
    </div>
  )
}

export function TierBenefitsCard({ stakedCount, className }: TierBenefitsCardProps) {
  const currentTier = getTierFromDandyCount(stakedCount)
  const nextTier = getNextTier(currentTier)
  const nextTierThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null
  const dandiesNeeded = nextTierThreshold ? nextTierThreshold - stakedCount : 0

  const votesPerDay = VOTES_PER_DAY[currentTier]
  const feeDiscount = FEE_DISCOUNTS[currentTier]
  const hasVanityAccess = currentTier === Tier.Gold || currentTier === Tier.Diamond

  return (
    <Card variant="glass" className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Membership Benefits</CardTitle>
          <TierBadge tier={currentTier} size="lg" />
        </div>
        <p className="text-sm text-muted-foreground">
          {stakedCount} Dandy{stakedCount !== 1 ? "s" : ""} locked
          {nextTier && (
            <>
              {" · "}
              <span className="text-foreground">{dandiesNeeded}</span> more for{" "}
              <span className="text-foreground">{nextTier}</span>
            </>
          )}
        </p>
      </CardHeader>

      <CardContent className="space-y-1">
        <BenefitRow
          icon={<Vote className="h-4 w-4" />}
          label="Votes per day"
          value={`${votesPerDay}`}
          unlocked={true}
        />
        <BenefitRow
          icon={<User className="h-4 w-4" />}
          label="Vanity username"
          value={hasVanityAccess ? "Available" : "Gold+ required"}
          unlocked={hasVanityAccess}
        />
        <BenefitRow
          icon={<Percent className="h-4 w-4" />}
          label="Fee discount"
          value={feeDiscount === 1 ? "Free" : feeDiscount > 0 ? `${Math.round(feeDiscount * 100)}%` : "None"}
          unlocked={feeDiscount > 0}
        />
      </CardContent>

      <CardFooter>
        <Link
          to="/membership"
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
            "h-8 px-3 text-xs",
            "ring-offset-background transition-all duration-200 ease-out-expo",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-border-hover active:bg-accent/80"
          )}
        >
          {currentTier === Tier.Diamond ? "Manage Membership" : "Lock More Dandies"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  )
}
