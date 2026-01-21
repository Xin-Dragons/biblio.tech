import { LockKeyhole } from "lucide-react"

export function StakePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Stake</h1>
      </div>
      <div className="min-h-0 flex-1">
        <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
          <LockKeyhole className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">Staking</p>
          <p className="text-sm text-muted-foreground">Stake your Dandies NFTs to earn rewards</p>
        </div>
      </div>
    </div>
  )
}
