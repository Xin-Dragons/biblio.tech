import { PublicKey, Signer, Transaction, TransactionBuilder, Umi, transactionBuilder } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { flatten } from "lodash"
import { toast } from "react-hot-toast"
import { shorten, sleep, waitForWalletChange } from "./utils"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Connection, NONCE_ACCOUNT_LENGTH, NonceAccount, SystemProgram } from "@solana/web3.js"
import {
  MAX_TX_SIZE,
  NONCE_ADVANCE_IX_SIZE,
  PRIORITY_AND_COMPUTE_IXS_SIZE,
  PRIORITY_FEE_IX_SIZE,
  PriorityFees,
  RawTx,
  Tx,
  TxStatus,
} from "../constants"
import { base58 } from "@metaplex-foundation/umi/serializers"
import { getPriorityFeesForTx } from "./helius"
import { setComputeUnitLimit, setComputeUnitPrice } from "@metaplex-foundation/mpl-toolbox"
import { fromWeb3JsInstruction, toWeb3JsPublicKey, toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters"
import Bottleneck from "bottleneck"

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

export function notifyStatus(errs: number, successes: number, type: string, pastTense: string) {
  if (errs && !successes) {
    toast.error(`Failed to ${type} ${errs} item${errs === 1 ? "" : "s"}. Check the console for more details`)
  } else if (errs && successes) {
    toast(
      `${successes} item${
        successes === 1 ? "" : "s"
      } ${pastTense} successfully, ${errs} failed to ${type}. Check the console for more details`
    )
  } else if (successes && !errs) {
    toast.success(`${successes} item${successes === 1 ? "" : "s"} ${pastTense} successfully`)
  }
}

export async function signAllTransactions(
  wallet: WalletContextState,
  umi: Umi,
  txns: Transaction[],
  signers: Signer[]
) {
  return signers.reduce(async (promise, signer, index) => {
    return promise.then(async (transactions) => {
      if (wallet.publicKey?.toBase58() === signer.publicKey) {
        const signedPromise = umi.identity.signAllTransactions(transactions)
        toast.promise(signedPromise, {
          loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
          success: "Signed",
          error: "Error signing",
        })
        const signed = await signedPromise
        return signed
      } else {
        const walletChangePromise = waitForWalletChange(signer.publicKey)
        toast.promise(walletChangePromise, {
          loading: `Waiting for wallet change: ${shorten(signer.publicKey)}`,
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
  computeUnits: boolean,
  useNonce = false
): TransactionBuilder[] {
  return tx.items.reduce(
    (builders, item) => {
      const lastBuilder = builders.pop() as TransactionBuilder
      const lastBuilderWithItem = lastBuilder.add(item)
      if (
        lastBuilderWithItem.getTransactionSize(umi) <=
        MAX_TX_SIZE -
          (computeUnits ? PRIORITY_AND_COMPUTE_IXS_SIZE : PRIORITY_FEE_IX_SIZE) -
          (useNonce ? NONCE_ADVANCE_IX_SIZE : 0)
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

export async function simulateAndAddCus(umi: Umi, txs: TransactionBuilder[]) {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!)
  const web3tx = toWeb3JsTransaction(await txs[0].buildWithLatestBlockhash(umi))
  const simulation = await connection.simulateTransaction(web3tx, { replaceRecentBlockhash: true })
  const computeUnits = simulation.value.unitsConsumed ? simulation.value.unitsConsumed + 50_000 : 200_000
  return txs.map((tx) => tx.prepend(setComputeUnitLimit(umi, { units: computeUnits })))
}

export type NonceWithPubkey = NonceAccount & { pubkey: PublicKey }

export async function packTx(umi: Umi, tx: TransactionBuilder, feeLevel: PriorityFees, nonce?: NonceWithPubkey) {
  let chunks = unsafeSplitByTransactionSizeWithPriorityFees(umi, tx, true, !!nonce)

  chunks = !!nonce
    ? chunks.map((ch) =>
        ch.prepend({
          instruction: fromWeb3JsInstruction(
            SystemProgram.nonceAdvance({
              noncePubkey: toWeb3JsPublicKey(nonce.pubkey),
              authorizedPubkey: toWeb3JsPublicKey(umi.identity.publicKey),
            })
          ),
          bytesCreatedOnChain: 0,
          signers: [umi.identity],
        })
      )
    : chunks

  const encoded = !!nonce
    ? base58.deserialize(umi.transactions.serialize(chunks[0].setBlockhash(nonce.nonce).build(umi)))[0]
    : base58.deserialize(umi.transactions.serialize(await chunks[0].buildWithLatestBlockhash(umi)))[0]

  let txFee = feeLevel ? await getPriorityFeesForTx(encoded, feeLevel) : 10_000

  if (txFee < 10_000) {
    txFee = 10_000
  }

  chunks = await simulateAndAddCus(umi, chunks)

  chunks = chunks.map((ch) => ch.prepend(setComputeUnitPrice(umi, { microLamports: txFee || 5_000 })))
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
      })

      while (blockheight < lastValidBlockHeight && !resolved) {
        try {
          await umi.rpc.sendTransaction(tx)
          await sleep(delay)
        } catch (err: any) {
          if (err.message.includes("This transaction has already been processed")) {
            resolved = true
          } else {
            console.log(err)
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

export async function sendItem(umi: Umi, item: RawTx, type: string, onProgress: (tx: Partial<Tx>) => void) {
  try {
    const tx = umi.transactions.deserialize(base58.serialize(item.tx))
    const sig = await umi.rpc.sendTransaction(tx)
    const [base58Sig] = base58.deserialize(sig)

    const updatedItem = {
      id: item.id,
      sig: base58Sig,
      status: TxStatus.SENT,
    }
    onProgress(updatedItem)
  } catch (err: any) {
    // console.log("error", err)
    if (err.message.includes("Server responded with 429")) {
      await sleep(1_000)
      onProgress({ id: item.id })
    } else if (err.message.includes("Transaction simulation failed: Blockhash not found")) {
      onProgress({
        id: item.id,
        status: TxStatus.EXPIRED,
      })
    } else if (err.message.includes("custom program error")) {
      onProgress({
        id: item.id,
        status: TxStatus.ERROR,
      })
    } else if (err.message.includes("This transaction has already been processed")) {
      console.log("CONFIRMED", item.index)
      onProgress({
        id: item.id,
        status: TxStatus.CONFIRMED,
      })
    } else {
      return onProgress({ id: item.id })
    }
  }
}
