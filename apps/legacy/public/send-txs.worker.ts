import { Connection } from "@solana/web3.js"
import { isEqual } from "lodash"
import { Queue } from "../src/helpers/queue"
import { sleep } from "../src/helpers/utils"
import Bottleneck from "bottleneck"
import { umi } from "../src/helpers/umi"
import { sendItem } from "../src/helpers/transactions"
import { CONFIRMING_STATUSES, RawTx, Tx, WorkerAction } from "../src/constants"

const queue = new Queue<RawTx>()

self.addEventListener("message", async (event) => {
  try {
    const { txs, batchSize, minTime }: { txs: RawTx[]; batchSize: number; minTime: number } = event.data

    console.log("SENDING with ", minTime, "speed")

    const limiter = new Bottleneck({
      minTime,
    })

    async function run(txs: RawTx[]) {
      queue.enqueueAll(txs)

      if (!queue.isActive()) {
        queue.processBatches(batchSize, processSendBatch)
      }
    }

    async function processSendBatch(batch: RawTx[]) {
      const reruns: RawTx[] = []
      const done: RawTx[] = []

      const wrappedSend = limiter.wrap((item: RawTx) =>
        sendItem(umi, item, "confirm", (partial: Partial<Tx>) => {
          if (CONFIRMING_STATUSES.includes(partial.status!)) {
            reruns.push(item)
          }
          done.push(item)
          self.postMessage({ type: WorkerAction.ITEM_PROCESSED, item: partial, queueSize: queue.size() })
        })
      )

      await Promise.all(batch.map(wrappedSend))
      self.postMessage({ type: WorkerAction.BATCH_DONE, done, reruns, minTime, batchSize })

      if (!queue.size()) {
        self.postMessage({ type: WorkerAction.TASK_COMPLETE })
      }
    }

    run(txs)
  } catch (err: any) {
    console.log("ERR", err)
    self.postMessage({ ok: false })
  }
})
