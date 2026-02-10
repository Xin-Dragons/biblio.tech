import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { Shield, Unlock, AlertTriangle, Loader2 } from "lucide-react"
import { useWallet, useKitTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { useAtomValue, useSetAtom } from "jotai"
import { toast } from "sonner"
import { address, type TransactionSigner } from "@solana/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { refetchNftAtom, type NFT } from "@/stores/nfts"
import { linkedWalletsAtom } from "@/stores/linked-wallets"
import { removeVaultedMintsAtom } from "@/stores/vault"
import { skipAuthWalletSwitchAtom } from "@/stores/wallet-operations"
import { buildUnlockInstructions, createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"
import { batchInstructionsBySize, type InstructionGroup } from "@/lib/transaction"
import { logger } from "@/lib/logger"

interface UnvaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSuccess: () => void
}

type SigningState =
  | { status: "idle" }
  | { status: "building" }
  | { status: "waiting_for_wallet"; signer: RequiredSigner; index: number; total: number }
  | { status: "signing"; signer: RequiredSigner }
  | { status: "sending"; batchIndex?: number; batchTotal?: number }

export function UnvaultDialog({ open, onOpenChange, nfts, onSuccess }: UnvaultDialogProps) {
  const [signingState, setSigningState] = useState<SigningState>({ status: "idle" })
  const abortControllerRef = useRef<AbortController | null>(null)

  const { account } = useWallet()
  const { signer, ready } = useKitTransactionSigner()
  const { disconnect } = useDisconnectWallet()
  const { connect } = useConnectWallet()
  const signerRef = useRef(signer)

  useEffect(() => {
    signerRef.current = signer
  }, [signer])
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const removeVaultedMints = useSetAtom(removeVaultedMintsAtom)
  const refetchNft = useSetAtom(refetchNftAtom)
  const setSkipAuthWalletSwitch = useSetAtom(skipAuthWalletSwitchAtom)

  const linkedAddresses = useMemo(() => {
    const addresses: string[] = linkedWallets.map((w) => w.publicKey)
    if (account) addresses.push(account)
    return new Set(addresses)
  }, [account, linkedWallets])

  const nftsWithAuthority = useMemo(() => {
    return nfts.map((nft) => {
      const delegate = nft.delegate ? address(nft.delegate) : null
      const owner = address(nft.owner)

      const hasDelegateAuthority = delegate ? linkedAddresses.has(delegate) : false
      const hasOwnerAuthority = linkedAddresses.has(owner)
      const canUnlock = hasDelegateAuthority && hasOwnerAuthority

      const requiredSigners: RequiredSigner[] = []
      if (delegate) {
        if (delegate !== owner) {
          requiredSigners.push({ address: delegate, label: "Delegate" })
          requiredSigners.push({ address: owner, label: "Owner" })
        } else {
          requiredSigners.push({ address: owner, label: "Owner" })
        }
      }

      return {
        nft,
        delegate,
        owner,
        hasDelegateAuthority,
        hasOwnerAuthority,
        canUnlock,
        requiredSigners,
      }
    })
  }, [nfts, linkedAddresses])

  const nftsWithoutAuthority = nftsWithAuthority.filter((item) => !item.canUnlock)
  const hasUnauthorizedNfts = nftsWithoutAuthority.length > 0
  const allUnauthorized = nftsWithoutAuthority.length === nfts.length

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setSigningState({ status: "idle" })
    onOpenChange(false)
  }

  const getConnectedSigner = useCallback(() => {
    if (!signerRef.current) throw new Error("No signer available")
    return signerRef.current
  }, [])

  const handlePhantomAccountChange = useCallback(async () => {
    await disconnect()
    await connect("wallet-standard:phantom" as Parameters<typeof connect>[0])
  }, [disconnect, connect])

  const handleUnvault = async () => {
    if (!account || !signer || !ready) {
      toast.error("Wallet not connected")
      return
    }

    if (nfts.length === 0) {
      toast.error("No NFTs selected")
      return
    }

    const nftsToUnvaultWithSigners = nftsWithAuthority.filter(
      (item): item is typeof item & { delegate: NonNullable<typeof item.delegate> } => item.canUnlock
    )

    if (nftsToUnvaultWithSigners.length === 0) {
      toast.error("No NFTs with unlock authority")
      return
    }

    abortControllerRef.current = new AbortController()
    setSigningState({ status: "building" })

    try {
      // Collect all required signers
      const requiredSignersMap = new Map<string, RequiredSigner>()
      for (const { nft, owner } of nftsToUnvaultWithSigners) {
        const delegate = nft.delegate ? address(nft.delegate) : null
        if (delegate && !requiredSignersMap.has(delegate)) {
          requiredSignersMap.set(delegate, { address: delegate, label: "Delegate" })
        }
        if (!requiredSignersMap.has(owner)) {
          requiredSignersMap.set(owner, { address: owner, label: "Owner" })
        }
      }

      // Reorder so connected wallet signs first (avoids unnecessary wallet switch prompts)
      const allSigners = Array.from(requiredSignersMap.values())
      const connectedFirst = allSigners.find((s) => s.address === account)
      const requiredSigners = connectedFirst
        ? [connectedFirst, ...allSigners.filter((s) => s.address !== account)]
        : allSigners

      // Only skip auth wallet switch if multiple wallets or non-connected wallet needed
      const needsWalletSwitch = requiredSigners.length > 1 || !requiredSigners.some((s) => s.address === account)
      if (needsWalletSwitch) {
        setSkipAuthWalletSwitch(true)
      }

      // Build instructions with noop signers for the structure
      const noopSigners = new Map<string, TransactionSigner>()
      for (const { address } of requiredSigners) {
        noopSigners.set(address, createNoopSigner(address))
      }

      // Build instructions for each NFT
      const nftInstructions: InstructionGroup<NFT>[] = await Promise.all(
        nftsToUnvaultWithSigners.map(async ({ nft, owner, delegate }) => ({
          item: nft,
          instructions: await buildUnlockInstructions({
            nft,
            owner,
            delegate,
            signers: noopSigners,
          }),
        }))
      )

      // Batch instructions by transaction size
      const firstSigner = requiredSigners[0]
      const noopSigner = noopSigners.get(firstSigner.address) as TransactionSigner
      const batches = await batchInstructionsBySize(nftInstructions, noopSigner)

      // Process each batch
      const successfulNfts: NFT[] = []
      for (let i = 0; i < batches.length; i++) {
        if (abortControllerRef.current.signal.aborted) break

        const batch = batches[i]
        await signWithMultipleWallets({
          instructions: batch.instructions,
          requiredSigners,
          noopSigners,
          getConnectedSigner,
          onPhantomAccountChange: handlePhantomAccountChange,
          onWaitingForWallet: (signerInfo, index, total) =>
            setSigningState({ status: "waiting_for_wallet", signer: signerInfo, index, total }),
          onSigning: (signerInfo) => setSigningState({ status: "signing", signer: signerInfo }),
          onSending: () => setSigningState({ status: "sending", batchIndex: i + 1, batchTotal: batches.length }),
          signal: abortControllerRef.current.signal,
        })
        successfulNfts.push(...batch.items)
      }

      removeVaultedMints(successfulNfts.map((nft) => nft.mint))

      // Refetch in background to get updated lock state (frozen: false)
      for (const nft of successfulNfts) {
        refetchNft(nft.mint)
      }

      const txCount = batches.length
      toast.success(
        `Unvaulted ${successfulNfts.length} NFT${successfulNfts.length === 1 ? "" : "s"}${txCount > 1 ? ` in ${txCount} transactions` : ""}`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      logger.error("Unvault failed:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to unvault NFTs"
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        toast.error("Network congestion, please try again")
      } else if (errorMessage.includes("insufficient") || errorMessage.includes("Insufficient")) {
        toast.error("Not enough SOL for transaction fees")
      } else if (errorMessage.includes("signature") || errorMessage.includes("Wallet") || errorMessage.includes("sign")) {
        toast.error("Wallet signing failed, please reconnect")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setSigningState({ status: "idle" })
      abortControllerRef.current = null
      setSkipAuthWalletSwitch(false)
    }
  }

  const isProcessing = signingState.status !== "idle"
  const isReady = !!account && !!signer && ready && nfts.length > 0
  const isUnvaultDisabled = !isReady || isProcessing || allUnauthorized

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Unvault {nfts.length} NFT{nfts.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Remove protection from your NFTs. Unvaulted NFTs can be transferred freely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {signingState.status === "building" && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Preparing transaction</p>
                  <p className="text-xs text-muted-foreground">Building unlock instructions...</p>
                </div>
              </div>
            </div>
          )}

          {signingState.status === "waiting_for_wallet" && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                <div>
                  <p className="text-sm font-medium">Switch to {signingState.signer.label} wallet</p>
                  <p className="text-xs text-muted-foreground">
                    {signingState.signer.address.slice(0, 4)}...{signingState.signer.address.slice(-4)} (
                    {signingState.index + 1} of {signingState.total})
                  </p>
                </div>
              </div>
            </div>
          )}

          {signingState.status === "signing" && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Approve in {signingState.signer.label} wallet</p>
                  <p className="text-xs text-muted-foreground">
                    {signingState.signer.address.slice(0, 4)}...{signingState.signer.address.slice(-4)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {signingState.status === "sending" && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Sending transaction
                    {signingState.batchTotal && signingState.batchTotal > 1
                      ? ` (${signingState.batchIndex}/${signingState.batchTotal})`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Waiting for confirmation...</p>
                </div>
              </div>
            </div>
          )}

          {signingState.status === "idle" && hasUnauthorizedNfts && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-amber-500">Authority Required</div>
                  <div className="text-xs text-muted-foreground">
                    {allUnauthorized ? (
                      <>
                        Your linked wallets do not have unlock authority for these NFTs. Each NFT requires both:
                        <ul className="mt-1 list-disc pl-4 space-y-0.5">
                          {nftsWithAuthority.some((n) => !n.hasDelegateAuthority && n.delegate) && (
                            <li>Delegate wallet (the vault key that locked the NFT)</li>
                          )}
                          {nftsWithAuthority.some((n) => !n.hasOwnerAuthority) && (
                            <li>Owner wallet (the NFT owner)</li>
                          )}
                        </ul>
                        Link the required wallets from your profile to unlock.
                      </>
                    ) : (
                      `${nftsWithoutAuthority.length} of ${nfts.length} NFT${nfts.length === 1 ? "" : "s"} cannot be unvaulted because your linked wallets do not have unlock authority.`
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-sm font-medium">NFTs to Unvault</span>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {nftsWithAuthority.map(({ nft, canUnlock, requiredSigners }) => (
                <div
                  key={nft.mint}
                  className={`flex items-center gap-3 p-2 rounded ${
                    canUnlock ? "bg-background" : "bg-background/50 opacity-60"
                  }`}
                >
                  <img src={nft.image} alt={nft.name} className="h-10 w-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{nft.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {requiredSigners.length > 0 ? (
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          {requiredSigners.map((s) => (
                            <span key={s.address}>
                              {s.label}: {s.address.slice(0, 4)}...{s.address.slice(-4)}
                            </span>
                          ))}
                          {canUnlock && <span className="text-primary">(ready)</span>}
                        </div>
                      ) : (
                        <span className="text-amber-500">No delegate set</span>
                      )}
                    </div>
                  </div>
                  {canUnlock ? (
                    <Shield className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleUnvault} disabled={isUnvaultDisabled}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {signingState.status === "building" && "Preparing..."}
                {signingState.status === "waiting_for_wallet" && "Waiting..."}
                {signingState.status === "signing" && "Signing..."}
                {signingState.status === "sending" && "Sending..."}
              </>
            ) : (
              <>
                <Unlock className="mr-2 h-4 w-4" />
                Unvault
                {!allUnauthorized && nftsWithoutAuthority.length > 0
                  ? ` (${nfts.length - nftsWithoutAuthority.length})`
                  : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
