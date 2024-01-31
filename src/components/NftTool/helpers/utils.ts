import { TransactionBuilder, Umi, transactionBuilder, Transaction } from "@metaplex-foundation/umi"
import { chunkBy } from "chunkier"
import { findKey, get } from "lodash"
import { FEES } from "../constants"
import { toast } from "react-hot-toast"
import { getAnonUmi } from "./umi"

export type MultimediaCategory = "image" | "video" | "audio" | "vr"

export function getMultimediaType(ext: string): MultimediaCategory {
  const types = {
    image: ["jpg", "jpeg", "jpng", "gif"],
    video: ["mp4", "mov"],
    audio: ["mp3", "wav", "flac"],
    vr: ["glb", "gltf"],
  }
  return findKey(types, (items) => items.includes(ext)) as MultimediaCategory
}

export function getUmiChunks(umi: Umi, transactionBuilders: TransactionBuilder[]) {
  return chunkBy(transactionBuilders, (ch: TransactionBuilder[], i: number) => {
    if (!transactionBuilders[i + 1]) {
      return true
    }

    const t = transactionBuilder()
      .add(ch)
      .add(transactionBuilders[i + 1])

    return !t.fitsInOneTransaction(umi)
  }).reduce((txns, builders) => {
    return [...txns, builders.reduce((builder, item) => builder.add(item), transactionBuilder())]
  }, [])
}

type AccountType = "basic" | "advanced" | "pro" | "unlimited"

export function getLevel(dandies: number): AccountType {
  if (!dandies) {
    return "basic"
  }
  if (dandies >= 10) {
    return "unlimited"
  }
  if (dandies >= 5) {
    return "pro"
  }
  if (dandies >= 1) {
    return "advanced"
  }

  return "basic"
}

export function getFee(type: string, level: AccountType) {
  if (level === "unlimited") {
    return 0
  }

  return get(FEES, type)
}

export function shorten(address: string) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}

export async function sendBatches(batches: TransactionBuilder[][], signer: Umi) {
  const anonUmi = getAnonUmi(signer.identity.publicKey)
  return batches.reduce((promise, batch, index) => {
    return promise.then(async () => {
      async function processBatch() {
        const txns = await Promise.all(batch.map((item) => item.buildAndSign(anonUmi)))
        const signed = await signer.identity.signAllTransactions(txns)

        await Promise.all(
          signed.map(async (txn) => {
            try {
              const txnId = await signer.rpc.sendTransaction(txn, { skipPreflight: true })
              const conf = await signer.rpc.confirmTransaction(txnId, {
                strategy: {
                  type: "blockhash",
                  ...(await signer.rpc.getLatestBlockhash()),
                },
              })
            } catch (err) {
              console.log(err)
            }
          })
        )
      }

      const batchPromise = processBatch()

      toast.promise(batchPromise, {
        loading: `Batch ${index + 1} of ${batches.length}. Sending ${batch.length} transactions.`,
        success: `Finished batch ${index + 1} of ${batches.length}`,
        error: "Error updating",
      })

      await batchPromise
    })
  }, Promise.resolve())
}
