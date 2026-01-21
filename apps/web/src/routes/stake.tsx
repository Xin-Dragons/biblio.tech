import { useEffect } from "react"
import { useAtom, useSetAtom } from "jotai"
import { LockKeyhole } from "lucide-react"
import { StakeStats } from "@/components/stake/StakeStats"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  fetchStakeDataAtom,
  fetchUserStakeRecordsAtom,
  fetchPendingRewardsAtom,
  isLoadingAtom,
  errorAtom,
} from "@/stores/stake"

export function StakePage() {
  const { publicKey } = useWallet()
  const [isLoading] = useAtom(isLoadingAtom)
  const [error] = useAtom(errorAtom)
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const fetchPendingRewards = useSetAtom(fetchPendingRewardsAtom)

  useEffect(() => {
    fetchStakeData()
  }, [fetchStakeData])

  useEffect(() => {
    if (publicKey) {
      fetchUserStakeRecords(publicKey.toBase58())
      fetchPendingRewards(publicKey.toBase58())
    }
  }, [publicKey, fetchUserStakeRecords, fetchPendingRewards])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Stake</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!publicKey ? (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <LockKeyhole className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view staking</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <StakeStats />

          <div className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
              <LockKeyhole className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">{isLoading ? "Loading..." : "Staking"}</p>
              <p className="text-sm text-muted-foreground">Stake your Dandies NFTs to earn rewards</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
