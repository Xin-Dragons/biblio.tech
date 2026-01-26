import { useState } from "react"
import { Send, Loader2 } from "lucide-react"
import { isAddress } from "@solana/kit"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
    <Dialog open onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send NFTs
          </DialogTitle>
          <DialogDescription>
            Send {sendableCount} NFT{sendableCount > 1 ? "s" : ""} to another wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Address</label>
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
            {recipient && !isValidAddress && <p className="text-xs text-destructive">Invalid Solana address</p>}
          </div>

          {sending && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {progress.completed}/{progress.total}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!isValidAddress || !isReady || sending || sendableCount === 0}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
