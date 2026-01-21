import { useEffect, useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { LockKeyhole, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StakeStats } from "@/components/stake/StakeStats"
import { StakedNftsGrid } from "@/components/stake/StakedNftsGrid"
import { AvailableToStakeGrid } from "@/components/stake/AvailableToStakeGrid"
import { StakeDialog } from "@/components/stake/StakeDialog"
import { UnstakeDialog } from "@/components/stake/UnstakeDialog"
import { ClaimDialog } from "@/components/stake/ClaimDialog"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  fetchStakeDataAtom,
  fetchUserStakeRecordsAtom,
  fetchPendingRewardsAtom,
  errorAtom,
  totalPendingRewardsAtom,
  type StakeRecordAccount,
} from "@/stores/stake"
import { type NFT } from "@/stores/nfts"

export function StakePage() {
  const { publicKey } = useWallet()
  const [error] = useAtom(errorAtom)
  const totalPending = useAtomValue(totalPendingRewardsAtom)
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const fetchPendingRewards = useSetAtom(fetchPendingRewardsAtom)
  const [stakeDialogNft, setStakeDialogNft] = useState<NFT | null>(null)
  const [unstakeTarget, setUnstakeTarget] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount } | null>(null)
  const [showClaimDialog, setShowClaimDialog] = useState(false)

  const handleUnstake = (nft: NFT, stakeRecord: StakeRecordAccount) => {
    setUnstakeTarget({ nft, stakeRecord })
  }

  const handleStake = (nft: NFT) => {
    setStakeDialogNft(nft)
  }

  const handleStakeDialogClose = () => {
    setStakeDialogNft(null)
  }

  const handleStakeSuccess = () => {
    if (publicKey) {
      fetchUserStakeRecords(publicKey.toBase58())
      fetchPendingRewards(publicKey.toBase58())
    }
  }

  const handleUnstakeDialogClose = () => {
    setUnstakeTarget(null)
  }

  const handleUnstakeSuccess = () => {
    if (publicKey) {
      fetchUserStakeRecords(publicKey.toBase58())
      fetchPendingRewards(publicKey.toBase58())
    }
  }

  const handleClaimDialogClose = () => {
    setShowClaimDialog(false)
  }

  const handleClaimSuccess = () => {
    if (publicKey) {
      fetchUserStakeRecords(publicKey.toBase58())
      fetchPendingRewards(publicKey.toBase58())
    }
  }

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
        {publicKey && (
          <Button variant="outline" onClick={() => setShowClaimDialog(true)} disabled={totalPending === 0n}>
            <Gift className="mr-2 h-4 w-4" />
            Claim Rewards
          </Button>
        )}
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
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
          <StakeStats />
          <StakedNftsGrid onUnstake={handleUnstake} />
          <AvailableToStakeGrid onStake={handleStake} />
        </div>
      )}

      {stakeDialogNft && (
        <StakeDialog nft={stakeDialogNft} onClose={handleStakeDialogClose} onSuccess={handleStakeSuccess} />
      )}

      {unstakeTarget && (
        <UnstakeDialog
          nft={unstakeTarget.nft}
          stakeRecord={unstakeTarget.stakeRecord}
          onClose={handleUnstakeDialogClose}
          onSuccess={handleUnstakeSuccess}
        />
      )}

      {showClaimDialog && <ClaimDialog onClose={handleClaimDialogClose} onSuccess={handleClaimSuccess} />}
    </div>
  )
}
