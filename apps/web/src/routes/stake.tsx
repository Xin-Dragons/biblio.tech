import { useEffect, useState } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { LockKeyhole, Gift, Grid2X2, Grid3X3, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StakeStats } from "@/components/stake/StakeStats"
import { StakedNftsGrid } from "@/components/stake/StakedNftsGrid"
import { AvailableToStakeGrid } from "@/components/stake/AvailableToStakeGrid"
import { StakeDialog } from "@/components/stake/StakeDialog"
import { UnstakeDialog } from "@/components/stake/UnstakeDialog"
import { ClaimDialog } from "@/components/stake/ClaimDialog"
import { BulkStakeDialog } from "@/components/stake/BulkStakeDialog"
import { BulkUnstakeDialog } from "@/components/stake/BulkUnstakeDialog"
import { useWallet } from "@solana/connector/react"
import { cn } from "@/lib/utils"
import {
  fetchStakeDataAtom,
  fetchUserStakeRecordsAtom,
  fetchPendingRewardsAtom,
  errorAtom,
  totalPendingRewardsAtom,
  type StakeRecordAccount,
} from "@/stores/stake"
import { type NFT } from "@/stores/nfts"
import { layoutSizeAtom, type LayoutSize } from "@/stores/ui"

const layoutOptions: { value: LayoutSize; icon: typeof Grid2X2; label: string }[] = [
  { value: "large", icon: Grid2X2, label: "Large" },
  { value: "medium", icon: Grid3X3, label: "Medium" },
  { value: "small", icon: LayoutGrid, label: "Small" },
]

export function StakePage() {
  const { account } = useWallet()
  const [error] = useAtom(errorAtom)
  const totalPending = useAtomValue(totalPendingRewardsAtom)
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const fetchPendingRewards = useSetAtom(fetchPendingRewardsAtom)
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)
  const [stakeDialogNft, setStakeDialogNft] = useState<NFT | null>(null)
  const [unstakeTarget, setUnstakeTarget] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount } | null>(null)
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [bulkStakeNfts, setBulkStakeNfts] = useState<NFT[] | null>(null)
  const [bulkUnstakeItems, setBulkUnstakeItems] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount }[] | null>(null)

  const handleUnstake = (nft: NFT, stakeRecord: StakeRecordAccount) => {
    setUnstakeTarget({ nft, stakeRecord })
  }

  const handleStake = (nft: NFT) => {
    setStakeDialogNft(nft)
  }

  const handleStakeAll = (nfts: NFT[]) => {
    setBulkStakeNfts(nfts)
  }

  const handleUnstakeAll = (items: { nft: NFT; stakeRecord: StakeRecordAccount }[]) => {
    setBulkUnstakeItems(items)
  }

  const handleBulkStakeDialogClose = () => {
    setBulkStakeNfts(null)
  }

  const handleBulkStakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
      fetchPendingRewards({ wallet: account, silent: true })
    }
  }

  const handleBulkUnstakeDialogClose = () => {
    setBulkUnstakeItems(null)
  }

  const handleBulkUnstakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
      fetchPendingRewards({ wallet: account, silent: true })
    }
  }

  const handleStakeDialogClose = () => {
    setStakeDialogNft(null)
  }

  const handleStakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
      fetchPendingRewards({ wallet: account, silent: true })
    }
  }

  const handleUnstakeDialogClose = () => {
    setUnstakeTarget(null)
  }

  const handleUnstakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
      fetchPendingRewards({ wallet: account, silent: true })
    }
  }

  const handleClaimDialogClose = () => {
    setShowClaimDialog(false)
  }

  const handleClaimSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
      fetchPendingRewards({ wallet: account, silent: true })
    }
  }

  useEffect(() => {
    fetchStakeData()
  }, [fetchStakeData])

  useEffect(() => {
    if (account) {
      fetchUserStakeRecords(account)
      fetchPendingRewards(account)
    }
  }, [account, fetchUserStakeRecords, fetchPendingRewards])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Stake</h1>
        <div className="flex items-center gap-4">
          <div className="flex overflow-hidden rounded-md border border-border">
            {layoutOptions.map((option) => {
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setLayoutSize(option.value)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center transition-colors",
                    layoutSize === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              )
            })}
          </div>
          {account && (
            <Button variant="outline" onClick={() => setShowClaimDialog(true)} disabled={totalPending === 0n}>
              <Gift className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Claim Rewards</span>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!account ? (
        <div className="min-h-0 flex-1">
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-border">
            <LockKeyhole className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">Connect your wallet to view staking</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <StakeStats />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
            <StakedNftsGrid onUnstake={handleUnstake} onUnstakeAll={handleUnstakeAll} />
            <AvailableToStakeGrid onStake={handleStake} onStakeAll={handleStakeAll} />
          </div>
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

      {bulkStakeNfts && (
        <BulkStakeDialog nfts={bulkStakeNfts} onClose={handleBulkStakeDialogClose} onSuccess={handleBulkStakeSuccess} />
      )}

      {bulkUnstakeItems && (
        <BulkUnstakeDialog
          items={bulkUnstakeItems}
          onClose={handleBulkUnstakeDialogClose}
          onSuccess={handleBulkUnstakeSuccess}
        />
      )}
    </div>
  )
}
