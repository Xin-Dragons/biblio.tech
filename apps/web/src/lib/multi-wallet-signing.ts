import {
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  getBase64EncodedWireTransaction,
  getTransactionEncoder,
  getTransactionDecoder,
  pipe,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit"
import { getSetComputeUnitLimitInstruction, getSetComputeUnitPriceInstruction } from "@solana-program/compute-budget"
import { getWallets } from "@wallet-standard/app"
import type { SolanaSignTransactionFeature } from "@solana/wallet-standard-features"
import {
  getBlockhash,
  simulateTransaction,
  getPriorityFee,
  sendTransaction,
  confirmTransactionViaWebSocket,
} from "./transaction"
import { logger } from "./logger"
import { API_BASE } from "@/lib/api"

const POLL_INTERVAL = 500
const WALLET_CHANGE_TIMEOUT = 120000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getPhantomAccount(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const phantom = (window as any).phantom?.solana
  if (!phantom?.request) return null
  try {
    const resp = await phantom.request({ method: "connect", params: { onlyIfTrusted: true } })
    return resp?.publicKey?.toString() ?? null
  } catch {
    return null
  }
}

type CompiledTransaction = ReturnType<typeof compileTransaction>

// Sign transaction using wallet standard directly, bypassing @solana/connector
// The wallet returns a new transaction with its signature properly added
async function signWithWalletStandard(
  transaction: CompiledTransaction,
  signerAddress: Address
): Promise<CompiledTransaction> {
  const { get } = getWallets()
  const wallets = get()

  // Find wallet that has this account
  const wallet = wallets.find((w) => w.accounts.some((a) => a.address === signerAddress))
  if (!wallet) {
    throw new Error(`No wallet found for address ${signerAddress}`)
  }

  const account = wallet.accounts.find((a) => a.address === signerAddress)
  if (!account) {
    throw new Error(`Account ${signerAddress} not found in wallet`)
  }

  // Get the signTransaction feature using proper wallet standard type
  const signFeature = wallet.features["solana:signTransaction"] as
    | SolanaSignTransactionFeature["solana:signTransaction"]
    | undefined

  if (!signFeature?.signTransaction) {
    throw new Error(`Wallet ${wallet.name} does not support signTransaction`)
  }

  // Serialize transaction to bytes
  const encoder = getTransactionEncoder()
  const txBytes = encoder.encode(transaction as Parameters<typeof encoder.encode>[0])

  // Sign with wallet standard - takes spread args, returns array
  const results = await signFeature.signTransaction({
    account,
    transaction: new Uint8Array(txBytes),
    chain: "solana:mainnet",
  })

  if (!results[0]?.signedTransaction) {
    throw new Error(`Wallet ${wallet.name} did not return a signed transaction`)
  }

  // Decode the signed transaction - this has the signature properly in place
  const decoder = getTransactionDecoder()
  const signedTx = decoder.decode(results[0].signedTransaction)

  // Preserve lifetimeConstraint from original transaction (decoder doesn't include it)
  const txWithLifetime = transaction as unknown as { lifetimeConstraint: unknown }
  return {
    ...signedTx,
    lifetimeConstraint: txWithLifetime.lifetimeConstraint,
  } as CompiledTransaction
}

export interface RequiredSigner {
  address: Address
  label: string
}

export interface WaitForSignerOptions {
  targetAddress: Address
  getConnectedSigner: () => TransactionSigner
  onPhantomAccountChange?: () => Promise<void>
  signal?: AbortSignal
}

export async function waitForSigner(options: WaitForSignerOptions): Promise<TransactionSigner> {
  const { targetAddress, getConnectedSigner, onPhantomAccountChange, signal } = options
  const startTime = Date.now()
  let lastPhantomAccount: string | null = null

  while (!signal?.aborted) {
    // Check if Phantom account changed (Phantom doesn't emit proper events)
    const phantomAccount = await getPhantomAccount()
    if (phantomAccount && phantomAccount !== lastPhantomAccount) {
      lastPhantomAccount = phantomAccount
      if (phantomAccount === targetAddress && onPhantomAccountChange) {
        // Phantom switched to our target - trigger reconnect to update connector state
        await onPhantomAccountChange()
        await sleep(100) // Brief delay for connector to update
      }
    }

    try {
      const signer = getConnectedSigner()
      if (signer?.address === targetAddress) {
        return signer
      }
    } catch {
      // Signer temporarily unavailable during wallet switch, keep polling
    }

    if (Date.now() - startTime > WALLET_CHANGE_TIMEOUT) {
      throw new Error(`Timeout waiting for wallet ${targetAddress.slice(0, 4)}...${targetAddress.slice(-4)}`)
    }

    await sleep(POLL_INTERVAL)
  }

  throw new Error("Wallet change aborted")
}

export interface MultiWalletSigningOptions {
  instructions: Instruction[]
  requiredSigners: RequiredSigner[]
  noopSigners: Map<string, TransactionSigner>
  getConnectedSigner: () => TransactionSigner
  onPhantomAccountChange?: () => Promise<void>
  onWaitingForWallet?: (signer: RequiredSigner, index: number, total: number) => void
  onSigning?: (signer: RequiredSigner) => void
  onSending?: () => void
  signal?: AbortSignal
}

export async function signWithMultipleWallets(options: MultiWalletSigningOptions): Promise<string> {
  const {
    instructions,
    requiredSigners,
    noopSigners,
    getConnectedSigner,
    onPhantomAccountChange,
    onWaitingForWallet,
    onSigning,
    onSending,
    signal,
  } = options

  if (signal?.aborted) throw new Error("Signing aborted")

  const uniqueSigners = requiredSigners.filter(
    (signer, index, self) => self.findIndex((s) => s.address === signer.address) === index
  )

  if (uniqueSigners.length === 0) {
    throw new Error("No signers provided")
  }

  const { blockhash, lastValidBlockHeight } = await getBlockhash()

  // Use the first signer as fee payer - get from the passed noopSigners map to ensure same instance
  const feePayerAddress = uniqueSigners[0].address
  const feePayerNoopSigner = noopSigners.get(feePayerAddress)
  if (!feePayerNoopSigner) {
    throw new Error(`No noop signer found for fee payer address: ${feePayerAddress}`)
  }

  // Simulate to get CU estimate - use noop signer (simulation uses sigVerify: false)
  const simulationMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayerNoopSigner, tx),
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

  const simulationTx = compileTransaction(simulationMessage)
  const simulationEncoded = getBase64EncodedWireTransaction(
    simulationTx as Parameters<typeof getBase64EncodedWireTransaction>[0]
  )
  const { unitsConsumed } = await simulateTransaction(simulationEncoded)
  const cuLimit = Math.ceil(unitsConsumed * 1.1)
  const priorityFee = await getPriorityFee(simulationEncoded)

  // Build the final transaction message with noop signers
  const finalMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayerNoopSigner, tx),
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

  // Compile to get the unsigned transaction
  let transaction: CompiledTransaction = compileTransaction(finalMessage)

  // Sign with each wallet sequentially - each wallet returns a new transaction with its signature added
  for (let i = 0; i < uniqueSigners.length; i++) {
    if (signal?.aborted) throw new Error("Signing aborted")

    const requiredSigner = uniqueSigners[i]

    // Wait for the correct wallet to be connected
    let currentSigner: TransactionSigner | null = null
    try {
      currentSigner = getConnectedSigner()
    } catch {
      // Signer temporarily unavailable
    }

    if (currentSigner?.address !== requiredSigner.address) {
      onWaitingForWallet?.(requiredSigner, i, uniqueSigners.length)
      await waitForSigner({
        targetAddress: requiredSigner.address,
        getConnectedSigner,
        onPhantomAccountChange,
        signal,
      })
    }

    onSigning?.(requiredSigner)
    logger.debug(`[MultiWalletSigning] Requesting signature from ${requiredSigner.label} (${requiredSigner.address})`)

    // Sign with wallet standard - returns new transaction with signature added
    transaction = await signWithWalletStandard(transaction, requiredSigner.address)

    // Verify signature was added
    const txWithSigs = transaction as unknown as { signatures: Record<string, Uint8Array | null> }
    const signature = txWithSigs.signatures[requiredSigner.address]

    if (!signature || signature.length !== 64) {
      throw new Error(`Failed to get signature from ${requiredSigner.label}`)
    }

    const isAllZeros = signature.every((b) => b === 0)
    if (isAllZeros) {
      throw new Error(`Wallet ${requiredSigner.label} returned empty signature`)
    }

    logger.debug(
      `[MultiWalletSigning] Got signature from ${requiredSigner.address}:`,
      Array.from(signature.slice(0, 8)).join(",") + "..."
    )
  }

  // Log final transaction state
  const finalTxWithSigs = transaction as unknown as { signatures: Record<string, Uint8Array | null> }
  logger.debug(
    `[MultiWalletSigning] Final transaction signatures:`,
    Object.entries(finalTxWithSigs.signatures).map(([k, v]) => ({
      address: k.slice(0, 8),
      len: v?.length ?? 0,
      firstBytes: v ? Array.from(v.slice(0, 4)).join(",") : "null",
    }))
  )

  // Verify all signatures are present before sending
  const signedBase64 = getBase64EncodedWireTransaction(
    transaction as Parameters<typeof getBase64EncodedWireTransaction>[0]
  )
  logger.debug("[MultiWalletSigning] Verifying signatures with simulation...")

  try {
    // Simulate with sigVerify: true to check signatures
    const verifyResponse = await fetch(`${API_BASE}/rpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "simulateTransaction",
        params: [signedBase64, { encoding: "base64", sigVerify: true }],
      }),
    })
    const verifyData = (await verifyResponse.json()) as {
      result?: { value: { err: unknown; logs: string[] } }
      error?: { message: string }
    }

    if (verifyData.error) {
      logger.error("[MultiWalletSigning] RPC error:", verifyData.error)
      throw new Error(`RPC error: ${verifyData.error.message}`)
    }

    if (verifyData.result?.value.err) {
      logger.error("[MultiWalletSigning] Simulation failed:", verifyData.result.value.err)
      logger.error("[MultiWalletSigning] Logs:", verifyData.result.value.logs)
      throw new Error(`Transaction verification failed: ${JSON.stringify(verifyData.result.value.err)}`)
    }

    logger.debug("[MultiWalletSigning] Signatures verified successfully")
  } catch (err) {
    if (err instanceof Error && err.message.includes("verification failed")) {
      throw err
    }
    logger.warn("[MultiWalletSigning] Signature verification skipped:", err)
  }

  // Send the fully signed transaction
  onSending?.()
  logger.debug("[MultiWalletSigning] Sending transaction...")
  const signature = await sendTransaction(signedBase64)
  logger.debug("[MultiWalletSigning] Transaction sent, signature:", signature)
  await confirmTransactionViaWebSocket(signature)
  logger.debug("[MultiWalletSigning] Transaction confirmed")
  return signature
}
