import { Transaction, TransactionBuilder, Umi, transactionBuilder } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { flatten } from "lodash"
import { toast } from "react-hot-toast"
import { shorten, sleep, waitForWalletChange } from "./utils"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Connection } from "@solana/web3.js"
import { MAX_TX_SIZE, PRIORITY_AND_COMPUTE_IXS_SIZE, PRIORITY_FEE_IX_SIZE, PriorityFees } from "../constants"
import { base58 } from "@metaplex-foundation/umi/serializers"
import { getPriorityFeesForTx } from "./helius"
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox"

export type InstructionSet = {
  instructions: TransactionBuilder
  mint: string
}

export function getUmiChunks(umi: Umi, instructionSets: InstructionSet[]) {
  return chunkBy(instructionSets, (ch: InstructionSet[], i: number) => {
    if (!instructionSets[i + 1]) {
      return true
    }

    const t = transactionBuilder()
      .add(ch.map((c) => c.instructions))
      .add(instructionSets[i + 1].instructions)

    return !t.fitsInOneTransaction(umi)
  })
}

export async function buildTransactions(umi: Umi, chunks: InstructionSet[][]) {
  return await Promise.all(
    chunks.map(async (builders) => {
      const txn = builders.reduce((t, item) => t.add(item.instructions), transactionBuilder())
      return {
        txn: await txn.buildWithLatestBlockhash(umi),
        signers: txn.getSigners(umi),
        mints: builders.map((b) => b.mint),
      }
    })
  )
}

export function notifyStatus(errs: string[], successes: string[], type: string, pastTense: string) {
  if (errs.length && !successes.length) {
    toast.error(
      `Failed to ${type} ${errs.length} item${errs.length === 1 ? "" : "s"}. Check the console for more details`
    )
  } else if (errs.length && successes.length) {
    toast(
      `${successes.length} item${successes.length === 1 ? "" : "s"} ${pastTense} successfully, ${
        errs.length
      } failed to ${type}. Check the console for more details`
    )
  } else if (successes.length && !errs.length) {
    toast.success(`${successes.length} item${successes.length === 1 ? "" : "s"} ${pastTense} successfully`)
  }
}

export async function signAllTransactions(
  wallet: WalletContextState,
  umi: Umi,
  txns: Transaction[],
  signers: string[]
) {
  return signers.reduce(async (promise, signer, index) => {
    return promise.then(async (transactions) => {
      if (wallet.publicKey?.toBase58() === signer) {
        const signedPromise = umi.identity.signAllTransactions(transactions)
        toast.promise(signedPromise, {
          loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
          success: "Signed",
          error: "Error signing",
        })
        const signed = await signedPromise
        return signed
      } else {
        const walletChangePromise = waitForWalletChange(signer)
        toast.promise(walletChangePromise, {
          loading: `Waiting for wallet change: ${shorten(signer)}`,
          success: "Wallet changed",
          error: "Error waiting for wallet change",
        })
        await walletChangePromise
        const signedPromise = umi.identity.signAllTransactions(transactions)
        toast.promise(signedPromise, {
          loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
          success: "Signed",
          error: "Error signing",
        })
        const signed = await signedPromise

        return signed
      }
    })
  }, Promise.resolve(txns))
}

export function unsafeSplitByTransactionSizeWithPriorityFees(
  umi: Umi,
  tx: TransactionBuilder,
  computeUnits: boolean
): TransactionBuilder[] {
  return tx.items.reduce(
    (builders, item) => {
      const lastBuilder = builders.pop() as TransactionBuilder
      const lastBuilderWithItem = lastBuilder.add(item)
      if (
        lastBuilderWithItem.getTransactionSize(umi) <=
        MAX_TX_SIZE - (computeUnits ? PRIORITY_AND_COMPUTE_IXS_SIZE : PRIORITY_FEE_IX_SIZE)
      ) {
        builders.push(lastBuilderWithItem)
      } else {
        builders.push(lastBuilder)
        builders.push(lastBuilder.empty().add(item))
      }
      return builders
    },
    [tx.empty()]
  )
}

export async function packTx(umi: Umi, tx: TransactionBuilder, feeLevel: PriorityFees, computeUnits?: number) {
  let chunks = unsafeSplitByTransactionSizeWithPriorityFees(umi, tx, !!computeUnits)

  const [encoded] = base58.deserialize(umi.transactions.serialize(await chunks[0].buildWithLatestBlockhash(umi)))
  const txFee = feeLevel && (await getPriorityFeesForTx(encoded, feeLevel))

  if (computeUnits) {
    chunks = chunks.map((ch) => ch.prepend(setComputeUnitLimit(umi, { units: computeUnits })))
  }

  if (txFee) {
    chunks = chunks.map((ch) => ch.prepend(setComputeUnitPrice(umi, { microLamports: txFee })))
  }
  return { chunks, txFee }
}

export function displayErrorFromLog(err: any, fallback: string = "Unable to perform action") {
  const errMessage = err.logs?.find((l: string) => l.includes("Error Message:"))?.split("Error Message: ")?.[1]
  return errMessage || err.message || fallback
}

export async function sendAllTxsWithRetries(
  umi: Umi,
  connection: Connection,
  signed: Transaction[],
  preIxs = 0,
  delay = 500
) {
  let successes = 0
  let errors = 0

  const lastValidBlockHeight = (await umi.rpc.getLatestBlockhash()).lastValidBlockHeight
  let blockheight = await connection.getBlockHeight("confirmed")
  let blockhash = await umi.rpc.getLatestBlockhash()

  await Promise.all(
    signed.map(async (tx) => {
      const sig = await umi.rpc.sendTransaction(tx)
      let resolved = false
      const confPromise = umi.rpc.confirmTransaction(sig, {
        strategy: {
          type: "blockhash",
          ...blockhash,
        },
        commitment: "confirmed",
      })

      while (blockheight < lastValidBlockHeight && !resolved) {
        try {
          console.log("Sending tx")
          await umi.rpc.sendTransaction(tx)
          await sleep(delay)
        } catch (err: any) {
          if (err.message.includes("This transaction has already been processed")) {
            resolved = true
          } else {
            console.error(displayErrorFromLog(err, err.message || "Error sending tx"))
          }
        }
        blockheight = await connection.getBlockHeight()
      }

      const conf = await confPromise

      if (conf.value.err) {
        errors += tx.message.instructions.length - preIxs
      } else {
        successes += tx.message.instructions.length - preIxs
      }
    })
  )

  return {
    successes,
    errors,
  }
}
