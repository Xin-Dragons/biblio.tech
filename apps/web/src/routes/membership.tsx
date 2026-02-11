import { useEffect, useState } from "react"
import { useAtom, useSetAtom } from "jotai"
import { LockKeyhole } from "lucide-react"
import { MembershipStatus } from "@/components/membership/MembershipStatus"
import { LockedDandiesGrid } from "@/components/membership/LockedDandiesGrid"
import { AvailableToLockGrid } from "@/components/membership/AvailableToLockGrid"
import { BulkLockDialog } from "@/components/membership/BulkLockDialog"
import { BulkUnlockDialog } from "@/components/membership/BulkUnlockDialog"
import { LayoutControls } from "@/components/layout-controls"
import { useWallet } from "@solana/connector/react"
import { fetchStakeDataAtom, errorAtom } from "@/stores/stake"
import { type NFT } from "@/stores/nfts"
import { useLockDandy } from "@/hooks/use-lock-dandy"

export function MembershipPage() {
  const { account } = useWallet()
  const [error] = useAtom(errorAtom)
  const fetchStakeData = useSetAtom(fetchStakeDataAtom)

  const { lock, lockingMint } = useLockDandy()

  const [bulkLockNfts, setBulkLockNfts] = useState<NFT[] | null>(null)
  const [unlockNfts, setUnlockNfts] = useState<NFT[] | null>(null)

  const handleLockAll = (nfts: NFT[]) => {
    setBulkLockNfts(nfts)
  }

  const handleUnlock = (nft: NFT) => {
    setUnlockNfts([nft])
  }

  const handleUnlockAll = (nfts: NFT[]) => {
    setUnlockNfts(nfts)
  }

  const handleBulkLockDialogClose = () => {
    setBulkLockNfts(null)
  }

  const handleUnlockDialogClose = () => {
    setUnlockNfts(null)
  }

  useEffect(() => {
    fetchStakeData()
  }, [fetchStakeData])

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="text-xl font-bold">Membership</h1>
        <LayoutControls nfts={[]} supportsCollage={false} showSelectionControls={false} />
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
            <AvailableToLockGrid onLock={lock} lockingMint={lockingMint} onLockAll={handleLockAll} />
          </div>
        </div>
      )}

      {bulkLockNfts && <BulkLockDialog nfts={bulkLockNfts} onClose={handleBulkLockDialogClose} />}

      {unlockNfts && <BulkUnlockDialog nfts={unlockNfts} onClose={handleUnlockDialogClose} />}
    </div>
  )
}
