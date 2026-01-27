import type { Instruction, TransactionSigner } from "@solana/kit"
import {
  batchInstructionsBySize,
  getBlockhash,
  prepareSignedTransaction,
  sendTransaction,
  confirmTransactionViaWebSocket,
  type InstructionGroup,
  type BatchOptions,
} from "./transaction"

const MAX_CONCURRENT_TRANSACTIONS = 50

export interface BatchExecuteProgress {
  completed: number
  total: number
  failed: number
  currentBatch: number
  totalBatches: number
}

export interface BatchExecuteResult {
  successful: number
  failed: number
  errors: Error[]
  signatures: string[]
}

export interface BatchExecuteOptions extends BatchOptions {
  onProgress?: (progress: BatchExecuteProgress) => void
  onBatchComplete?: (batchIndex: number, signatures: string[]) => void
}

/**
 * Executes batch transactions efficiently with concurrent processing and progress tracking.
 *
 * @param instructionGroups - Array of instruction groups, each containing an item and its instructions
 * @param feePayer - Transaction signer to use as fee payer
 * @param options - Optional configuration for batching and progress callbacks
 * @returns Summary of execution with successful/failed counts and any errors
 */
export async function batchExecute<T>(
  instructionGroups: InstructionGroup<T>[],
  feePayer: TransactionSigner,
  options?: BatchExecuteOptions
): Promise<BatchExecuteResult> {
  if (instructionGroups.length === 0) {
    return { successful: 0, failed: 0, errors: [], signatures: [] }
  }

  const batches = await batchInstructionsBySize(instructionGroups, feePayer, options)
  const totalBatches = batches.length
  const totalItems = instructionGroups.length

  const result: BatchExecuteResult = {
    successful: 0,
    failed: 0,
    errors: [],
    signatures: [],
  }

  const reportProgress = () => {
    options?.onProgress?.({
      completed: result.successful + result.failed,
      total: totalItems,
      failed: result.failed,
      currentBatch: Math.min(result.signatures.length + result.errors.length, totalBatches),
      totalBatches,
    })
  }

  // Process batches in chunks of MAX_CONCURRENT_TRANSACTIONS
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_TRANSACTIONS) {
    const batchChunk = batches.slice(i, i + MAX_CONCURRENT_TRANSACTIONS)
    const { blockhash, lastValidBlockHeight } = await getBlockhash()

    // Prepare and sign all transactions in this chunk
    const signedTransactions = await Promise.allSettled(
      batchChunk.map((batch) =>
        prepareSignedTransaction({
          instructions: batch.instructions,
          feePayer,
          blockhash,
          lastValidBlockHeight,
        })
      )
    )

    // Track which batches were successfully signed
    const signedTxData: Array<{ signedTx: string; batch: (typeof batches)[0]; batchIndex: number }> = []

    signedTransactions.forEach((txResult, idx) => {
      const batchIndex = i + idx
      if (txResult.status === "fulfilled") {
        signedTxData.push({ signedTx: txResult.value, batch: batchChunk[idx], batchIndex })
      } else {
        const error = txResult.reason instanceof Error ? txResult.reason : new Error(String(txResult.reason))
        result.errors.push(error)
        result.failed += batchChunk[idx].items.length
        console.error(`Batch ${batchIndex + 1} signing failed:`, error)
        reportProgress()
      }
    })

    // Send all successfully signed transactions
    const sendResults = await Promise.allSettled(signedTxData.map(({ signedTx }) => sendTransaction(signedTx)))

    // Track which transactions were sent successfully
    const sentTxData: Array<{ signature: string; batch: (typeof batches)[0]; batchIndex: number }> = []

    sendResults.forEach((sendResult, idx) => {
      const { batch, batchIndex } = signedTxData[idx]
      if (sendResult.status === "fulfilled") {
        sentTxData.push({ signature: sendResult.value, batch, batchIndex })
      } else {
        const error = sendResult.reason instanceof Error ? sendResult.reason : new Error(String(sendResult.reason))
        result.errors.push(error)
        result.failed += batch.items.length
        console.error(`Batch ${batchIndex + 1} send failed:`, error)
        reportProgress()
      }
    })

    // Confirm all sent transactions
    const confirmResults = await Promise.allSettled(
      sentTxData.map(({ signature }) => confirmTransactionViaWebSocket(signature, { timeout: 60000 }))
    )

    const chunkSignatures: string[] = []
    confirmResults.forEach((confirmResult, idx) => {
      const { signature, batch, batchIndex } = sentTxData[idx]
      if (confirmResult.status === "fulfilled") {
        result.successful += batch.items.length
        result.signatures.push(signature)
        chunkSignatures.push(signature)
        console.log(`Batch ${batchIndex + 1} confirmed: ${signature}`)
      } else {
        const error =
          confirmResult.reason instanceof Error ? confirmResult.reason : new Error(String(confirmResult.reason))
        result.errors.push(error)
        result.failed += batch.items.length
        console.error(`Batch ${batchIndex + 1} confirmation failed:`, error)
      }
      reportProgress()
    })

    if (chunkSignatures.length > 0) {
      options?.onBatchComplete?.(i, chunkSignatures)
    }
  }

  return result
}

/**
 * Helper to create instruction groups from items and a function that generates instructions for each item.
 *
 * @param items - Array of items to process
 * @param getInstructions - Function that returns instructions for a single item
 * @returns Array of instruction groups ready for batchExecute
 */
export function createInstructionGroups<T>(
  items: T[],
  getInstructions: (item: T) => Instruction[]
): InstructionGroup<T>[] {
  return items.map((item) => ({
    item,
    instructions: getInstructions(item),
  }))
}

/**
 * Simple wrapper for executing batch operations on items with a single instruction per item.
 *
 * @param items - Array of items to process
 * @param getInstructions - Function that returns instructions for a single item
 * @param feePayer - Transaction signer to use as fee payer
 * @param options - Optional configuration for batching and progress callbacks
 * @returns Summary of execution with successful/failed counts and any errors
 */
export async function batchExecuteItems<T>(
  items: T[],
  getInstructions: (item: T) => Instruction[],
  feePayer: TransactionSigner,
  options?: BatchExecuteOptions
): Promise<BatchExecuteResult> {
  const groups = createInstructionGroups(items, getInstructions)
  return batchExecute(groups, feePayer, options)
}
