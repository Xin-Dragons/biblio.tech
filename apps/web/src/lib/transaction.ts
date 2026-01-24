import {
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getBase64EncodedWireTransaction,
  pipe,
  type Signature,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit"
import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget"
import { decodeSimulationError } from "./errors"

const WS_PROXY_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/api/rpc/ws`

export const MAX_TX_SIZE = 1232
export const SIZE_BUFFER = 100

export async function getBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: bigint }> {
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
  const result = data.result?.value
  if (!result?.blockhash) throw new Error("Failed to get blockhash")
  return {
    blockhash: result.blockhash,
    lastValidBlockHeight: BigInt(result.lastValidBlockHeight),
  }
}

export async function simulateTransaction(
  encodedTransaction: string
): Promise<{ unitsConsumed: number; logs: string[] }> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "simulateTransaction",
      params: [encodedTransaction, { encoding: "base64" }],
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

export async function getPriorityFee(encodedTransaction: string): Promise<number> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "getPriorityFeeEstimate",
      params: [
        {
          transaction: encodedTransaction,
          options: { priorityLevel: "Medium" },
        },
      ],
    }),
  })
  const data = (await response.json()) as { result?: number }
  return data.result ?? 1000
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

interface PrepareAndSendOptions {
  instructions: Instruction[]
  feePayer: TransactionSigner
}

export async function prepareAndSendTransaction({ instructions, feePayer }: PrepareAndSendOptions): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await getBlockhash()

  // Build initial transaction for simulation (with high CU limit)
  const simulationMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0]["blockhash"],
          lastValidBlockHeight,
        },
        tx
      ),
    (tx) =>
      appendTransactionMessageInstructions(
        [getSetComputeUnitLimitInstruction({ units: 1_400_000 }), ...instructions],
        tx
      )
  )

  const simulationTx = await signTransactionMessageWithSigners(simulationMessage)
  const simulationEncoded = getBase64EncodedWireTransaction(simulationTx)
  const { unitsConsumed } = await simulateTransaction(simulationEncoded)
  const cuLimit = Math.ceil(unitsConsumed * 1.1)
  console.log(`Simulation used ${unitsConsumed} CUs, setting limit to ${cuLimit}`)

  const priorityFee = await getPriorityFee(simulationEncoded)
  console.log(`Priority fee estimate: ${priorityFee} microLamports`)

  // Build final transaction with proper CU limit and priority fee
  const finalMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0]["blockhash"],
          lastValidBlockHeight,
        },
        tx
      ),
    (tx) =>
      appendTransactionMessageInstructions(
        [
          getSetComputeUnitLimitInstruction({ units: cuLimit }),
          getSetComputeUnitPriceInstruction({ microLamports: BigInt(priorityFee) }),
          ...instructions,
        ],
        tx
      )
  )

  const signedTx = await signTransactionMessageWithSigners(finalMessage)
  const signedBase64 = getBase64EncodedWireTransaction(signedTx)

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

interface BuildTransactionOptions {
  instructions: Instruction[]
  feePayer: TransactionSigner
  blockhash: string
  lastValidBlockHeight: bigint
  cuLimit?: number
  priorityFee?: number
}

export function buildTransactionMessage({
  instructions,
  feePayer,
  blockhash,
  lastValidBlockHeight,
  cuLimit = 1_400_000,
  priorityFee,
}: BuildTransactionOptions) {
  const cuInstructions: Instruction[] = [getSetComputeUnitLimitInstruction({ units: cuLimit })]
  if (priorityFee !== undefined) {
    cuInstructions.push(getSetComputeUnitPriceInstruction({ microLamports: BigInt(priorityFee) }))
  }

  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: blockhash as Parameters<typeof setTransactionMessageLifetimeUsingBlockhash>[0]["blockhash"],
          lastValidBlockHeight,
        },
        tx
      ),
    (tx) => appendTransactionMessageInstructions([...cuInstructions, ...instructions], tx)
  )
}

export async function getEncodedTransactionSize(
  instructions: Instruction[],
  feePayer: TransactionSigner,
  blockhash: string,
  lastValidBlockHeight: bigint
): Promise<number> {
  const message = buildTransactionMessage({
    instructions,
    feePayer,
    blockhash,
    lastValidBlockHeight,
    cuLimit: 400_000,
  })
  const signedTx = await signTransactionMessageWithSigners(message)
  const encoded = getBase64EncodedWireTransaction(signedTx)
  return Math.ceil((encoded.length * 3) / 4)
}

interface PrepareSignedTransactionOptions {
  instructions: Instruction[]
  feePayer: TransactionSigner
  blockhash: string
  lastValidBlockHeight: bigint
}

export async function prepareSignedTransaction({
  instructions,
  feePayer,
  blockhash,
  lastValidBlockHeight,
}: PrepareSignedTransactionOptions): Promise<string> {
  const simulationMessage = buildTransactionMessage({
    instructions,
    feePayer,
    blockhash,
    lastValidBlockHeight,
    cuLimit: 1_400_000,
  })

  const simulationTx = await signTransactionMessageWithSigners(simulationMessage)
  const simulationEncoded = getBase64EncodedWireTransaction(simulationTx)
  const { unitsConsumed } = await simulateTransaction(simulationEncoded)
  const cuLimit = Math.ceil(unitsConsumed * 1.1)

  const priorityFee = await getPriorityFee(simulationEncoded)

  const finalMessage = buildTransactionMessage({
    instructions,
    feePayer,
    blockhash,
    lastValidBlockHeight,
    cuLimit,
    priorityFee,
  })

  const signedTx = await signTransactionMessageWithSigners(finalMessage)
  return getBase64EncodedWireTransaction(signedTx)
}
