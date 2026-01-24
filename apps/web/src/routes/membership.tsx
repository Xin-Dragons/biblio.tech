import { useEffect, useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { LockKeyhole, Grid2X2, Grid3X3, LayoutGrid } from "lucide-react"
import { MembershipStatus } from "@/components/membership/MembershipStatus"
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
import { useStakeSubscription } from "@/hooks/use-stake-subscription"

const layoutOptions: { value: LayoutSize; icon: typeof Grid2X2; label: string }[] = [
  { value: "large", icon: Grid2X2, label: "Large" },
  { value: "medium", icon: Grid3X3, label: "Medium" },
  { value: "small", icon: LayoutGrid, label: "Small" },
]

export function MembershipPage() {
  const { account } = useWallet()
  const [error] = useAtom(errorAtom)
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)
  const fetchUserStakeRecords = useSetAtom(fetchUserStakeRecordsAtom)
  const [layoutSize, setLayoutSize] = useAtom(layoutSizeAtom)

  // Subscribe to real-time stake record changes via WebSocket
  useStakeSubscription()
  const [lockDialogNft, setLockDialogNft] = useState<NFT | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount } | null>(null)
  const [bulkLockNfts, setBulkLockNfts] = useState<NFT[] | null>(null)
  const [bulkUnlockItems, setBulkUnlockItems] = useState<{ nft: NFT; stakeRecord: StakeRecordAccount }[] | null>(null)

  const handleUnlock = (nft: NFT, stakeRecord: StakeRecordAccount) => {
    setUnlockTarget({ nft, stakeRecord })
  }

  const handleLock = (nft: NFT) => {
    setLockDialogNft(nft)
  }

  const handleLockAll = (nfts: NFT[]) => {
    setBulkLockNfts(nfts)
  }

  const handleUnlockAll = (items: { nft: NFT; stakeRecord: StakeRecordAccount }[]) => {
    setBulkUnlockItems(items)
  }

  const handleBulkLockDialogClose = () => {
    setBulkLockNfts(null)
  }

  const handleBulkUnlockDialogClose = () => {
    setBulkUnlockItems(null)
  }

  const handleLockDialogClose = () => {
    setLockDialogNft(null)
  }

  const handleUnlockDialogClose = () => {
    setUnlockTarget(null)
  }

  const handleSuccess = () => {
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
        <h1 className="text-xl font-bold">Membership</h1>
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
            <p className="text-sm text-muted-foreground">Connect your wallet to view membership</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <MembershipStatus />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
            <LockedDandiesGrid onUnlock={handleUnlock} onUnlockAll={handleUnlockAll} />
            <AvailableToLockGrid onLock={handleLock} onLockAll={handleLockAll} />
          </div>
        </div>
      )}

      {lockDialogNft && <LockDialog nft={lockDialogNft} onClose={handleLockDialogClose} onSuccess={handleSuccess} />}

      {unlockTarget && (
        <UnlockDialog
          nft={unlockTarget.nft}
          stakeRecord={unlockTarget.stakeRecord}
          onClose={handleUnlockDialogClose}
          onSuccess={handleSuccess}
        />
      )}

      {bulkLockNfts && (
        <BulkLockDialog nfts={bulkLockNfts} onClose={handleBulkLockDialogClose} onSuccess={handleSuccess} />
      )}

      {bulkUnlockItems && (
        <BulkUnlockDialog items={bulkUnlockItems} onClose={handleBulkUnlockDialogClose} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
