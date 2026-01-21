import { useState } from "react"
import { Flame, X, Loader2, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import { useSolanaActions } from "@/hooks/use-solana-actions"
import { Button } from "@/components/ui/button"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-destructive">Burn NFTs</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Warning: This action is irreversible!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You are about to burn <span className="font-semibold text-foreground">{burnableCount}</span> NFT
            {burnableCount > 1 ? "s" : ""}. Burned NFTs cannot be recovered.
          </p>
          {compressedCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {compressedCount} compressed NFT{compressedCount > 1 ? "s" : ""} will be skipped (not yet supported)
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-border"
              disabled={burning}
            />
            <span className="text-sm">I understand that burning is permanent and I want to proceed</span>
          </label>
        </div>

        {burning && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {progress.completed} / {progress.total}
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

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={burning} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBurn}
            disabled={!confirmed || !isReady || burning || burnableCount === 0}
            className="flex-1"
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
        </div>
      </div>
    </div>
  )
}
