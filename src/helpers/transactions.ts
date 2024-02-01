import { Transaction, TransactionBuilder, Umi, transactionBuilder } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { flatten } from "lodash"
import { toast } from "react-hot-toast"
import { shorten, waitForWalletChange } from "./utils"
import { WalletContextState } from "@solana/wallet-adapter-react"

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
