import { useState } from "react"
import { Send, X, Loader2 } from "lucide-react"
import { isAddress } from "@solana/kit"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import { useSolanaActions } from "@/hooks/use-solana-actions"
import { Button } from "@/components/ui/button"
import type { NFT } from "@/stores/nfts"

interface BulkSendDialogProps {
  nfts: NFT[]
  onClose: () => void
  onSuccess: () => void
}

export function BulkSendDialog({ nfts, onClose, onSuccess }: BulkSendDialogProps) {
  const [recipient, setRecipient] = useState("")
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const { sendNfts, isReady } = useSolanaActions()

  const isValidAddress = recipient.length >= 32 && isAddress(recipient)

  const compressedCount = nfts.filter((n) => n.compressed).length
  const sendableCount = nfts.length - compressedCount

  const handleSend = async () => {
    if (!isValidAddress) {
      toast.error("Invalid recipient address")
      return
    }

    setSending(true)
    setProgress({ completed: 0, total: sendableCount })

    try {
      await sendNfts(nfts, recipient, (completed, total) => {
        setProgress({ completed, total })
      })
      toast.success(`Sent ${sendableCount} NFT${sendableCount > 1 ? "s" : ""} successfully`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Failed to send NFTs")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send NFTs</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-md bg-primary/10 p-3">
          <p className="text-sm">
            Sending <span className="font-semibold">{sendableCount}</span> NFT
            {sendableCount > 1 ? "s" : ""}
          </p>
          {compressedCount > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {compressedCount} compressed NFT{compressedCount > 1 ? "s" : ""} will be skipped (not yet supported)
            </p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter Solana address..."
            className={cn(
              "h-10 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1",
              recipient && !isValidAddress
                ? "border-destructive focus:ring-destructive"
                : "border-border focus:border-primary focus:ring-primary"
            )}
            disabled={sending}
          />
          {recipient && !isValidAddress && <p className="mt-1 text-xs text-destructive">Invalid Solana address</p>}
        </div>

        {sending && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Progress</span>
              <span>
                {progress.completed} / {progress.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!isValidAddress || !isReady || sending || sendableCount === 0}
            className="flex-1"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
