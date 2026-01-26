import { useState } from "react"
import { Flame, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useSolanaActions } from "@/hooks/use-solana-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import type { NFT } from "@/stores/nfts"

interface BulkBurnDialogProps {
  nfts: NFT[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkBurnDialog({ nfts, onClose, onSuccess }: BulkBurnDialogProps) {
  const [burning, setBurning] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const { burnNfts, isReady } = useSolanaActions()

  const compressedCount = nfts.filter((n) => n.compressed).length
  const burnableCount = nfts.length - compressedCount

  const handleBurn = async () => {
    if (!confirmed) {
      toast.error("Please confirm you want to burn these NFTs")
      return
    }

    setBurning(true)
    setProgress({ completed: 0, total: burnableCount })

    try {
      await burnNfts(nfts, (completed, total) => {
        setProgress({ completed, total })
      })
      toast.success(`Burned ${burnableCount} NFT${burnableCount > 1 ? "s" : ""} successfully`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to burn NFTs")
    } finally {
      setBurning(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !burning && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Flame className="h-5 w-5" />
            Burn NFTs
          </DialogTitle>
          <DialogDescription>Permanently destroy {burnableCount} NFTs. This cannot be undone.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Warning: This action is irreversible!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You are about to burn <span className="font-semibold text-foreground">{burnableCount}</span> NFT
                  {burnableCount > 1 ? "s" : ""}. Burned NFTs cannot be recovered.
                </p>
                {compressedCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {compressedCount} compressed NFT{compressedCount > 1 ? "s" : ""} will be skipped (not yet supported)
                  </p>
                )}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-border"
              disabled={burning}
            />
            <span className="text-sm">I understand that burning is permanent and I want to proceed</span>
          </label>

          {burning && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {progress.completed}/{progress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-destructive transition-all"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={burning}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBurn}
            disabled={!confirmed || !isReady || burning || burnableCount === 0}
          >
            {burning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Burning...
              </>
            ) : (
              <>
                <Flame className="mr-2 h-4 w-4" />
                Burn {burnableCount} NFT{burnableCount > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
