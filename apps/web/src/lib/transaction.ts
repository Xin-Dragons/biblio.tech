import { createSolanaRpcSubscriptions } from "@solana/kit"
import type { Signature } from "@solana/kit"
import { Transaction, ComputeBudgetProgram, PublicKey, TransactionInstruction } from "@solana/web3.js"
import { decodeSimulationError } from "./errors"

const WS_PROXY_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/rpc/ws`

export const MAX_TX_SIZE = 1232
export const SIZE_BUFFER = 100

export function getTransactionSize(tx: Transaction): number {
  try {
    return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length
  } catch {
    return Infinity
  }
}

export async function getBlockhash(): Promise<string> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "getLatestBlockhash",
      params: [{ commitment: "finalized" }],
    }),
  })
  const data = (await response.json()) as {
    result?: { value: { blockhash: string; lastValidBlockHeight: number } }
  }
  const blockhash = data.result?.value.blockhash
  if (!blockhash) throw new Error("Failed to get blockhash")
  return blockhash
}

export async function simulateTransaction(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  blockhash: string
): Promise<{ unitsConsumed: number; logs: string[] }> {
  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = feePayer
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }))
  tx.add(...instructions)

  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "simulateTransaction",
      params: [tx.serialize({ requireAllSignatures: false }).toString("base64"), { encoding: "base64" }],
    }),
  })
  const data = (await response.json()) as {
    result?: { value: { err: unknown; logs: string[]; unitsConsumed: number } }
  }

  if (data.result?.value.err) {
    console.error("Simulation failed:", data.result.value.err)
    console.error("Simulation logs:", data.result.value.logs)
    const decodedError = decodeSimulationError(
      data.result.value.err as { InstructionError?: [number, { Custom?: number }] }
    )
    throw new Error(decodedError || `Simulation failed: ${JSON.stringify(data.result.value.err)}`)
  }

  return {
    unitsConsumed: data.result?.value.unitsConsumed ?? 200_000,
    logs: data.result?.value.logs ?? [],
  }
}

export async function getPriorityFee(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  blockhash: string,
  cuLimit: number
): Promise<number> {
  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = feePayer
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
  tx.add(...instructions)

  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "getPriorityFeeEstimate",
      params: [
        {
          transaction: tx.serialize({ requireAllSignatures: false }).toString("base64"),
          options: { priorityLevel: "Medium" },
        },
      ],
    }),
  })
  const data = (await response.json()) as { result?: number }
  return data.result ?? 1000
}

export function buildTransaction(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  blockhash: string,
  cuLimit: number,
  priorityFee: number
): Transaction {
  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = feePayer
  tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: cuLimit }))
  tx.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
  tx.add(...instructions)
  return tx
}

export async function sendTransaction(signedTxBase64: string): Promise<string> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "sendTransaction",
      params: [signedTxBase64, { encoding: "base64", skipPreflight: true }],
    }),
  })
  const data = (await response.json()) as { result?: string; error?: { message: string } }

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }
  if (!data.result) {
    throw new Error("No signature returned from sendTransaction")
  }
  return data.result
}

interface TransactionSigner {
  signTransaction: (txBytes: Uint8Array) => Promise<Uint8Array>
}

export async function prepareAndSendTransaction(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  signer: TransactionSigner
): Promise<string> {
  const blockhash = await getBlockhash()

  const { unitsConsumed } = await simulateTransaction(instructions, feePayer, blockhash)
  const cuLimit = Math.ceil(unitsConsumed * 1.1)
  console.log(`Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

  const priorityFee = await getPriorityFee(instructions, feePayer, blockhash, cuLimit)
  console.log(`Priority fee estimate: ${priorityFee} microLamports`)

  const tx = buildTransaction(instructions, feePayer, blockhash, cuLimit, priorityFee)

  const txBytes = new Uint8Array(tx.serialize({ requireAllSignatures: false }))
  const signedBytes = await signer.signTransaction(txBytes)
  const signedBase64 = Buffer.from(signedBytes).toString("base64")

  const signature = await sendTransaction(signedBase64)
  console.log(`Transaction sent: ${signature}`)

  await confirmTransactionViaWebSocket(signature)
  return signature
}

export async function confirmTransactionViaWebSocket(
  signature: string,
  options: { timeout?: number; commitment?: "confirmed" | "finalized" } = {}
): Promise<void> {
  const { timeout = 60000, commitment = "confirmed" } = options

  console.log(`[WS] Confirming signature: ${signature}`)
  console.log(`[WS] Connecting to: ${WS_PROXY_URL}`)
  console.log(`[WS] Commitment: ${commitment}`)

  const rpcSubscriptions = createSolanaRpcSubscriptions(WS_PROXY_URL)

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log(`[WS] Timeout reached after ${timeout}ms, aborting`)
    abortController.abort()
  }, timeout)

  try {
    console.log("[WS] Subscribing to signatureNotifications...")
    const notifications = await rpcSubscriptions
      .signatureNotifications(signature as Signature, { commitment })
      .subscribe({ abortSignal: abortController.signal })

    console.log("[WS] Subscription established, waiting for notifications...")

    for await (const notification of notifications) {
      console.log("[WS] Received notification:", notification)
      if ("err" in notification && notification.err !== null) {
        throw new Error(`Transaction failed: ${JSON.stringify(notification.err)}`)
      }
      console.log("[WS] Transaction confirmed!")
      return
    }

    console.log("[WS] Notification iterator ended without confirmation")
  } catch (err) {
    console.error("[WS] Error:", err)
    if (abortController.signal.aborted) {
      throw new Error(`Transaction confirmation timeout after ${timeout / 1000} seconds`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
    abortController.abort()
  }
}

export async function confirmMultipleTransactionsViaWebSocket(
  signatures: string[],
  options: { timeout?: number; commitment?: "confirmed" | "finalized" } = {}
): Promise<void> {
  await Promise.all(signatures.map((sig) => confirmTransactionViaWebSocket(sig, options)))
}
