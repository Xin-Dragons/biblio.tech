import { useAtomValue } from "jotai"
import { Layers, Gift } from "lucide-react"
import { stakedNftCountAtom, totalPendingRewardsAtom, isLoadingAtom } from "@/stores/stake"
import { cn } from "@/lib/utils"

function StatCard({
  icon: Icon,
  label,
  value,
  isLoading,
  accentColor = "primary",
}: {
  icon: typeof Layers
  label: string
  value: string
  isLoading: boolean
  accentColor?: "primary" | "emerald" | "amber"
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
  }

  return (
    <div className="stat-card p-4">
      <div className="flex items-center gap-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", colors[accentColor])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {isLoading ? (
            <div className="mt-1.5 h-7 w-20 rounded-md shimmer" />
          ) : (
            <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function StakeStats() {
  const stakedCount = useAtomValue(stakedNftCountAtom)
  const totalPending = useAtomValue(totalPendingRewardsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  const formattedPending = formatRewardAmount(totalPending)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        icon={Layers}
        label="NFTs Staked"
        value={stakedCount.toString()}
        isLoading={isLoading}
        accentColor="primary"
      />
      <StatCard
        icon={Gift}
        label="Pending Rewards"
        value={formattedPending}
        isLoading={isLoading}
        accentColor="emerald"
      />
    </div>
  )
}

const TOKEN_DECIMALS = 9

function formatRewardAmount(amount: bigint): string {
  if (amount === 0n) {
    return "0"
  }
  const humanReadable = Number(amount) / 10 ** TOKEN_DECIMALS
  if (humanReadable >= 1_000_000) {
    return `${(humanReadable / 1_000_000).toFixed(2)}M`
  }
  if (humanReadable >= 1_000) {
    return `${(humanReadable / 1_000).toFixed(2)}K`
  }
  return humanReadable.toFixed(2)
}
