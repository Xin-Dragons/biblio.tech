import { useState } from "react"
import { Lock, X, Loader2 } from "lucide-react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { Transaction, PublicKey } from "@solana/web3.js"
import { useAtomValue, useSetAtom } from "jotai"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { stakerAtom, collectionsAtom, addStakeRecordAtom } from "@/stores/stake"
import { buildStakeInstructions } from "@/hooks/use-staking"
import { confirmTransactionViaWebSocket } from "@/lib/transaction"
import type { NFT } from "@/stores/nfts"

const ANCHOR_ERROR_CODES: Record<number, string> = {
  3000: "AccountDiscriminatorAlreadySet",
  3001: "AccountDiscriminatorNotFound",
  3002: "AccountDiscriminatorMismatch",
  3003: "AccountDidNotDeserialize",
  3004: "AccountDidNotSerialize",
  3005: "AccountNotEnoughKeys",
  3006: "AccountNotMutable",
  3007: "AccountOwnedByWrongProgram",
  3008: "InvalidProgramId",
  3009: "InvalidProgramExecutable",
  3010: "AccountNotSigner",
  3011: "AccountNotSystemOwned",
  3012: "AccountNotInitialized - A required account does not exist",
  3013: "AccountNotProgramData",
  3014: "AccountNotAssociatedTokenAccount",
  3015: "AccountSysvarMismatch",
}

function decodeSimulationError(err: { InstructionError?: [number, { Custom?: number }] }): string | null {
  if (!err.InstructionError) return null
  const [ixIndex, errDetail] = err.InstructionError
  if (typeof errDetail === "object" && errDetail.Custom !== undefined) {
    const code = errDetail.Custom
    const anchorMsg = ANCHOR_ERROR_CODES[code]
    if (anchorMsg) {
      return `Instruction ${ixIndex} failed: ${anchorMsg} (code ${code})`
    }
    return `Instruction ${ixIndex} failed with custom error: ${code}`
  }
  return `Instruction ${ixIndex} failed: ${JSON.stringify(errDetail)}`
}

interface StakeDialogProps {
  nft: NFT
  onClose: () => void
  onSuccess: () => void
}

export function StakeDialog({ nft, onClose, onSuccess }: StakeDialogProps) {
  const [staking, setStaking] = useState(false)
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()
  const staker = useAtomValue(stakerAtom)
  const collections = useAtomValue(collectionsAtom)
  const addStakeRecord = useSetAtom(addStakeRecordAtom)

  const collection = collections.find((c) => c.collectionMint === nft.collectionId)

  const getEmissionAddresses = (): string[] => {
    if (!collection) return []
    const emissions: string[] = []
    if (collection.tokenEmission.__option === "Some") emissions.push(collection.tokenEmission.value)
    if (collection.selectionEmission.__option === "Some") emissions.push(collection.selectionEmission.value)
    if (collection.pointsEmission.__option === "Some") emissions.push(collection.pointsEmission.value)
    if (collection.distributionEmission.__option === "Some") emissions.push(collection.distributionEmission.value)
    return emissions
  }

  const handleStake = async () => {
    if (!account || !signer || !capabilities.canSign || !staker || !collection) {
      toast.error("Wallet not connected or staking not available")
      return
    }

    setStaking(true)

    try {
      const ownerPubkey = new PublicKey(account)

      const instructions = buildStakeInstructions({
        nft,
        staker,
        collection,
        owner: account,
      })

      // Get blockhash via RPC proxy
      const blockhashResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      })
      const blockhashData = (await blockhashResponse.json()) as {
        result?: { value: { blockhash: string; lastValidBlockHeight: number } }
      }
      const blockhash = blockhashData.result?.value.blockhash
      if (!blockhash) throw new Error("Failed to get blockhash")

      const transaction = new Transaction()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = ownerPubkey
      transaction.add(...instructions)

      // Simulate transaction before sending to wallet
      const simResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "simulateTransaction",
          params: [transaction.serialize({ requireAllSignatures: false }).toString("base64"), { encoding: "base64" }],
        }),
      })
      const simData = (await simResponse.json()) as {
        result?: { value: { err: unknown; logs: string[] } }
      }

      if (simData.result?.value.err) {
        console.error("Stake simulation failed:", simData.result.value.err)
        console.error("Simulation logs:", simData.result.value.logs)
        const decodedError = decodeSimulationError(
          simData.result.value.err as { InstructionError?: [number, { Custom?: number }] }
        )
        throw new Error(decodedError || `Transaction simulation failed: ${JSON.stringify(simData.result.value.err)}`)
      }

      // Sign via connector
      const txBytes = transaction.serialize({ requireAllSignatures: false })
      const signedBytes = await signer.signTransaction(txBytes)

      // Send via RPC
      const sendResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "sendTransaction",
          params: [
            Buffer.from(signedBytes as Uint8Array).toString("base64"),
            { encoding: "base64", skipPreflight: true },
          ],
        }),
      })
      const sendResult = (await sendResponse.json()) as { result?: string; error?: { message: string } }

      if (sendResult.error) {
        throw new Error(sendResult.error.message || JSON.stringify(sendResult.error))
      }

      const signature = sendResult.result
      if (!signature) throw new Error("No signature returned")

      await confirmTransactionViaWebSocket(signature)

      addStakeRecord({
        nftMint: nft.mint,
        owner: account,
        staker: staker.address,
        emissions: getEmissionAddresses(),
      })

      toast.success(`Staked ${nft.name} successfully!`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error("Stake failed:", err)
      toast.error(err instanceof Error ? err.message : "Failed to stake NFT")
    } finally {
      setStaking(false)
    }
  }

  const isReady = !!account && !!signer && capabilities.canSign && !!staker && !!collection

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stake NFT</h2>
          <button
            onClick={onClose}
            disabled={staking}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 overflow-hidden rounded-lg border border-border">
          <div className="aspect-square overflow-hidden">
            <img src={nft.image} alt={nft.name} className="h-full w-full object-cover" />
          </div>
          <div className="p-3">
            <h3 className="truncate font-medium">{nft.name}</h3>
            <p className="text-sm text-muted-foreground">{nft.collectionName ?? "Dandies"}</p>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Are you sure you want to stake this NFT? You can unstake at any time.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={staking} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleStake} disabled={!isReady || staking} className="flex-1">
            {staking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Staking...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Stake
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
