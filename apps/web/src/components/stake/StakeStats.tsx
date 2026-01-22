import { useAtomValue } from "jotai"
import { Layers, Gift } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { stakedNftCountAtom, totalPendingRewardsAtom, isLoadingAtom } from "@/stores/stake"

export function StakeStats() {
  const stakedCount = useAtomValue(stakedNftCountAtom)
  const totalPending = useAtomValue(totalPendingRewardsAtom)
  const isLoading = useAtomValue(isLoadingAtom)

  const formattedPending = formatRewardAmount(totalPending)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">NFTs Staked</p>
            {isLoading ? <Skeleton className="mt-1 h-7 w-16" /> : <p className="text-2xl font-bold">{stakedCount}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">Pending Rewards</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className="text-2xl font-bold">{formattedPending}</p>
            )}
          </div>
        </CardContent>
      </Card>
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
