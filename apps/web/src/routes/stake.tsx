import { useEffect, useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { LockKeyhole, Grid2X2, Grid3X3, LayoutGrid } from "lucide-react"
import { LockedDandiesGrid } from "@/components/membership/LockedDandiesGrid"
import { AvailableToLockGrid } from "@/components/membership/AvailableToLockGrid"
import { LockDialog } from "@/components/membership/LockDialog"
import { UnlockDialog } from "@/components/membership/UnlockDialog"
import { BulkLockDialog } from "@/components/membership/BulkLockDialog"
import { BulkUnlockDialog } from "@/components/membership/BulkUnlockDialog"
import { useWallet } from "@solana/connector/react"
import { cn } from "@/lib/utils"
import { fetchStakeDataAtom, fetchUserStakeRecordsAtom, errorAtom, type StakeRecordAccount } from "@/stores/stake"
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
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)
  const [stakeDialogNft, setStakeDialogNft] = useState<NFT | null>(null)
  const [unstakeTarget, setUnstakeTarget] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount } | null>(null)
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
    }
  }

  const handleBulkUnstakeDialogClose = () => {
    setBulkUnstakeItems(null)
  }

  const handleBulkUnstakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
    }
  }

  const handleStakeDialogClose = () => {
    setStakeDialogNft(null)
  }

  const handleStakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
    }
  }

  const handleUnstakeDialogClose = () => {
    setUnstakeTarget(null)
  }

  const handleUnstakeSuccess = () => {
    if (account) {
      fetchUserStakeRecords({ wallet: account, silent: true })
    }
  }

  useEffect(() => {
    fetchStakeData()
  }, [fetchStakeData])

  useEffect(() => {
    if (account) {
      fetchUserStakeRecords(account)
    }
  }, [account, fetchUserStakeRecords])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Stake</h1>
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
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
            <LockedDandiesGrid onUnlock={handleUnstake} onUnlockAll={handleUnstakeAll} />
            <AvailableToLockGrid onLock={handleStake} onLockAll={handleStakeAll} />
          </div>
        </div>
      )}

      {stakeDialogNft && (
        <LockDialog nft={stakeDialogNft} onClose={handleStakeDialogClose} onSuccess={handleStakeSuccess} />
      )}

      {unstakeTarget && (
        <UnlockDialog
          nft={unstakeTarget.nft}
          stakeRecord={unstakeTarget.stakeRecord}
          onClose={handleUnstakeDialogClose}
          onSuccess={handleUnstakeSuccess}
        />
      )}

      {bulkStakeNfts && (
        <BulkLockDialog nfts={bulkStakeNfts} onClose={handleBulkStakeDialogClose} onSuccess={handleBulkStakeSuccess} />
      )}

      {bulkUnstakeItems && (
        <BulkUnlockDialog
          items={bulkUnstakeItems}
          onClose={handleBulkUnstakeDialogClose}
          onSuccess={handleBulkUnstakeSuccess}
        />
      )}
    </div>
  )
}
