import { useState, useRef, useCallback, useEffect } from "react"
import { Shield, Lock, Info, Loader2 } from "lucide-react"
import { useWallet, useKitTransactionSigner, useDisconnectWallet, useConnectWallet } from "@solana/connector/react"
import { useSetAtom, useAtomValue } from "jotai"
import { toast } from "sonner"
import type { Address, TransactionSigner } from "@solana/kit"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { refetchNftBatchAtom, type NFT } from "@/stores/nfts"
import { addVaultedMintsAtom } from "@/stores/vault"
import { linkedWalletsAtom } from "@/stores/linked-wallets"
import { skipAuthWalletSwitchAtom } from "@/stores/wallet-operations"
import { buildLockInstructions, createNoopSigner } from "@/lib/vault-transactions"
import { signWithMultipleWallets, type RequiredSigner } from "@/lib/multi-wallet-signing"
import { batchInstructionsBySize, type InstructionGroup } from "@/lib/transaction"

type FreezeType = "basic" | "secure"

type SigningState =
  | { status: "idle" }
  | { status: "building" }
  | { status: "waiting_for_wallet"; signer: RequiredSigner; index: number; total: number }
  | { status: "signing"; signer: RequiredSigner }
  | { status: "sending"; batchIndex?: number; batchTotal?: number }

interface VaultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nfts: NFT[]
  onSuccess: () => void
}

export function VaultDialog({ open, onOpenChange, nfts, onSuccess }: VaultDialogProps) {
  const [freezeType, setFreezeType] = useState<FreezeType>("basic")
  const [selectedDelegate, setSelectedDelegate] = useState<string | null>(null)
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

  const addVaultedMints = useSetAtom(addVaultedMintsAtom)
  const refetchNftBatch = useSetAtom(refetchNftBatchAtom)
  const linkedWallets = useAtomValue(linkedWalletsAtom)
  const setSkipAuthWalletSwitch = useSetAtom(skipAuthWalletSwitchAtom)

  const linkedWalletAddresses = linkedWallets.map((w) => w.publicKey)
  const hasLinkedWallets = linkedWallets.length > 0

  // Get unique owners from NFTs
  const nftOwners = new Set(nfts.map((nft) => nft.owner))
  const isConnectedWalletOwner = account ? nftOwners.has(account) : false

  // Owners that need to sign (excluding connected wallet)
  const otherOwners = Array.from(nftOwners).filter((o) => o !== account)
  const needsOwnerSwitch = otherOwners.length > 0

  // For delegate selection: show wallets that are NOT an NFT owner
  // This includes the connected wallet if it's not an owner
  const delegateOptions = linkedWalletAddresses.filter((w) => !nftOwners.has(w))
  const canSecureFreeze = delegateOptions.length > 0

  // Auto-select connected wallet as delegate if it's a linked wallet but not an owner
  useEffect(() => {
    if (freezeType === "secure" && !selectedDelegate && account && !isConnectedWalletOwner) {
      if (delegateOptions.includes(account)) {
        setSelectedDelegate(account)
      }
    }
  }, [freezeType, selectedDelegate, account, isConnectedWalletOwner, delegateOptions])

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

  const handleVault = async () => {
    if (!account || !signer || !ready) {
      toast.error("Wallet not connected")
      return
    }

    if (nfts.length === 0) {
      toast.error("No NFTs selected")
      return
    }

    abortControllerRef.current = new AbortController()
    setSigningState({ status: "building" })

    try {
      // Fetch fresh NFT data to get ruleSet for pNFTs
      const freshNfts = await refetchNftBatch(nfts.map((nft) => nft.mint))
      const nftsToUse = freshNfts.length > 0 ? freshNfts : nfts

      // For secure freeze, delegate is the selected wallet; for basic freeze, delegate = owner
      const isSecureFreeze = freezeType === "secure" && selectedDelegate
      const delegateAddress = isSecureFreeze ? (selectedDelegate as Address) : null

      // Collect all unique owners from the NFTs being vaulted
      const uniqueOwners = new Set(nftsToUse.map((nft) => nft.owner))

      // Build required signers list
      const requiredSigners: RequiredSigner[] = isSecureFreeze
        ? [
            ...Array.from(uniqueOwners).map((owner) => ({ address: owner as Address, label: "Owner" })),
            { address: delegateAddress as Address, label: "Delegate" },
          ]
        : Array.from(uniqueOwners).map((owner) => ({ address: owner as Address, label: "Owner" }))

      // Create noop signers map
      const noopSigners = new Map<string, TransactionSigner>()
      for (const { address } of requiredSigners) {
        noopSigners.set(address, createNoopSigner(address))
      }

      // Set skip auth wallet switch if needed
      if (isSecureFreeze || uniqueOwners.size > 1 || !uniqueOwners.has(account)) {
        setSkipAuthWalletSwitch(true)
      }

      // Build instructions for each NFT
      const nftInstructions: InstructionGroup<NFT>[] = await Promise.all(
        nftsToUse.map(async (nft) => ({
          item: nft,
          instructions: await buildLockInstructions({
            nft,
            owner: nft.owner as Address,
            delegate: isSecureFreeze ? (delegateAddress as Address) : (nft.owner as Address),
            signers: noopSigners,
          }),
        }))
      )

      // Batch instructions by transaction size
      const firstOwner = Array.from(uniqueOwners)[0]
      const noopSigner = noopSigners.get(firstOwner) as TransactionSigner
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

      addVaultedMints(successfulNfts.map((nft) => nft.mint))

      // Refetch in background to get updated frozen state from chain
      refetchNftBatch(successfulNfts.map((nft) => nft.mint))

      const txCount = batches.length
      toast.success(
        `Vaulted ${successfulNfts.length} NFT${successfulNfts.length === 1 ? "" : "s"}${txCount > 1 ? ` in ${txCount} transactions` : ""}`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Vault failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to vault NFTs")
    } finally {
      setSigningState({ status: "idle" })
      abortControllerRef.current = null
      setSkipAuthWalletSwitch(false)
    }
  }

  const isProcessing = signingState.status !== "idle"
  const isReady = !!account && !!signer && ready && nfts.length > 0
  const isVaultDisabled = !isReady || isProcessing || (freezeType === "secure" && !selectedDelegate)

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Vault {nfts.length} NFT{nfts.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Protect your NFTs by freezing them. Frozen NFTs cannot be transferred until unlocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {signingState.status === "building" && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-medium">Preparing transaction</p>
                  <p className="text-xs text-muted-foreground">Building lock instructions...</p>
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

          {signingState.status === "idle" && (
            <>
              <div className="space-y-3">
                <span className="text-sm font-medium">Freeze Type</span>

                <button
                  type="button"
                  onClick={() => setFreezeType("basic")}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    freezeType === "basic"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Lock
                      className={`h-5 w-5 mt-0.5 ${freezeType === "basic" ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">Basic Freeze</div>
                      <div className="text-sm text-muted-foreground">
                        Owner wallet retains unlock authority. You can unlock anytime with the owner wallet.
                      </div>
                      {needsOwnerSwitch && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                          <Info className="h-3.5 w-3.5" />
                          <span>
                            Requires signing with {otherOwners.length > 1 ? "owners" : "owner"}:{" "}
                            {otherOwners.map((o) => `${o.slice(0, 4)}...${o.slice(-4)}`).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => canSecureFreeze && setFreezeType("secure")}
                  disabled={!canSecureFreeze}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    freezeType === "secure"
                      ? "border-primary bg-primary/10"
                      : canSecureFreeze
                        ? "border-border hover:border-muted-foreground/50"
                        : "border-border opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Shield
                      className={`h-5 w-5 mt-0.5 ${freezeType === "secure" ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Secure Freeze</span>
                        <span className="text-xs text-amber-500">(recommended)</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Select a different linked wallet as unlock authority. More secure if your wallet is compromised.
                      </div>
                      {!hasLinkedWallets && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Info className="h-3.5 w-3.5" />
                          <span>Link additional wallets to enable secure freeze</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {freezeType === "secure" && canSecureFreeze && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Unlock Authority Wallet</span>
                  <Select value={selectedDelegate ?? ""} onValueChange={setSelectedDelegate}>
                    <SelectTrigger id="delegate-wallet">
                      <SelectValue placeholder="Select a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {delegateOptions.map((wallet) => (
                        <SelectItem key={wallet} value={wallet}>
                          {wallet.slice(0, 4)}...{wallet.slice(-4)}
                          {wallet === account && " (connected)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only this wallet will be able to unlock your NFTs. Requires signing with both owner and delegate.
                  </p>
                </div>
              )}

              {nfts.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    {nfts.length} NFT{nfts.length === 1 ? "" : "s"} to vault:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nfts.slice(0, 5).map((nft) => (
                      <div key={nft.mint} className="flex items-center gap-2 bg-background rounded px-2 py-1 text-xs">
                        <img src={nft.image} alt={nft.name} className="h-5 w-5 rounded object-cover" />
                        <span className="truncate max-w-[100px]">{nft.name}</span>
                      </div>
                    ))}
                    {nfts.length > 5 && (
                      <div className="flex items-center px-2 py-1 text-xs text-muted-foreground">
                        +{nfts.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleVault} disabled={isVaultDisabled}>
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
                <Shield className="mr-2 h-4 w-4" />
                Vault
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
