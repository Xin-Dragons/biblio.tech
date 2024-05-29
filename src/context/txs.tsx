import {
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  PublicKey,
  Transaction,
  TransactionBuilder,
  Umi,
  generateSigner,
  transactionBuilder,
} from "@metaplex-foundation/umi"
import { useConnection } from "@solana/wallet-adapter-react"
import Bottleneck from "bottleneck"
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { sleep } from "../helpers/utils"
import { chunk, flatten, groupBy, intersection, isEqual, partition } from "lodash"
import { useUmi } from "./umi"
import { Button, CircularProgress, Snackbar, SnackbarContent, Stack, Tooltip, Typography } from "@mui/material"
import { LinearProgressWithLabel } from "../components/LinearProgressWithLabel"
import toast from "react-hot-toast"
import { NonceWithPubkey, packTx, sendAllTxsWithRetries } from "../helpers/transactions"
import { usePriorityFees } from "./priority-fees"
import { v4 as uuid } from "uuid"
import { Queue } from "../helpers/queue"
import { useAccess } from "./access"
import { ACCOUNT_TYPE, MAX_BATCH_SIZES, TX_THROTTLE } from "../constants"
import { base58 } from "@metaplex-foundation/umi/serializers"
import { Info } from "@mui/icons-material"
import { usePrevious } from "../hooks/use-previous"
import { Connection, NONCE_ACCOUNT_LENGTH, NonceAccount, SystemProgram } from "@solana/web3.js"
import { createAccount } from "@metaplex-foundation/mpl-toolbox"
import {
  fromWeb3JsInstruction,
  fromWeb3JsPublicKey,
  toWeb3JsPublicKey,
  toWeb3JsTransaction,
} from "@metaplex-foundation/umi-web3js-adapters"

const Context = createContext<
  | {
      active: boolean
      process: (tx: TransactionBuilder, mints: PublicKey[]) => Promise<void>
      confirmedMints: PublicKey[]
      unsignedTxs: Tx[]
      confirmingTxs: Tx[]
      confirmedTxs: Tx[]
      errorTxs: Tx[]
      txs: Tx[]
      speed: number
      onSpeedChange: (speed: number) => void
      batchSize: number
      onBatchSizeChange: (batchSize: number) => void
      isComplete: boolean
      useNonce: boolean
      setUseNonce: Dispatch<SetStateAction<boolean>>
    }
  | undefined
>(undefined)

export enum TxStatus {
  UNSIGNED,
  SIGNED,
  SENT,
  CONFIRMED,
  EXPIRED,
  ERROR,
}

export enum WorkerAction {
  ITEM_PROCESSED,
  BATCH_DONE,
  TASK_COMPLETE,
}

export const CONFIRMING_STATUSES = [TxStatus.SENT, TxStatus.SIGNED, TxStatus.UNSIGNED]
export const COMPLETED_STATUSES = [TxStatus.CONFIRMED, TxStatus.EXPIRED, TxStatus.ERROR]
export const ERROR_STATUSES = [TxStatus.ERROR, TxStatus.EXPIRED]

export type Tx = {
  index: number
  id: string
  sig?: string
  status: TxStatus
  promise?: Promise<any>
  tx: TransactionBuilder
  mints: PublicKey[]
  blockhash?: BlockhashWithExpiryBlockHeight
  slot?: number
}

export type RawTx = {
  index: number
  id: string
  tx: string
  sig?: string
}

const connection = new Connection(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })

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

export function TxsProvider({ children }: PropsWithChildren) {
  const [txs, setTxs] = useState<Tx[]>([])
  const [autoRetry, setAutoRetry] = useState(false)
  const [sendWorker, setSendWorker] = useState<Worker | null>(null)
  const [confirmWorker, setConfirmWorker] = useState<Worker | null>(null)
  const { account } = useAccess()
  const [signQueue, setSignQueue] = useState<Queue<Tx>>(new Queue())
  const [active, setActive] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [batchSize, setBatchSize] = useState(MAX_BATCH_SIZES[ACCOUNT_TYPE.basic])
  const { feeLevel } = usePriorityFees()
  const [progressShowing, setProgressShowing] = useState(false)
  const [speed, setSpeed] = useState(1000 / TX_THROTTLE[account])
  const [processed, setProcessed] = useState(0)
  const [tick, setTick] = useState(Date.now())
  const prevTick = usePrevious(tick)
  const [nonce, setNonce] = useState<NonceWithPubkey | null>(null)
  const [useNonce, setUseNonce] = useState(false)
  const umi = useUmi()

  const { connection } = useConnection()

  useEffect(() => {
    setSpeed(1000 / TX_THROTTLE[account])
  }, [account])

  function onSpeedChange(speed: number) {
    const maxSpeed = 1000 / TX_THROTTLE[account]

    if (speed <= maxSpeed) {
      setSpeed(speed)
    }
  }

  // useEffect(() => {
  //   console.log(processed)
  // }, [processed])

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setTick(Date.now())
  //     setProcessed(0)
  //   }, 100)
  //   return () => {
  //     clearInterval(interval)
  //   }
  // }, [])

  useEffect(() => {
    setBatchSize(MAX_BATCH_SIZES[account])
  }, [account])

  function onBatchSizeChange(batchSize: number) {
    const maxBatch = MAX_BATCH_SIZES[account]
    if (batchSize <= maxBatch) {
      setBatchSize(batchSize)
    }
  }

  useEffect(() => {
    if (confirmWorker) {
      confirmWorker.onmessage = async (event) => {
        const type: WorkerAction = event.data.type
        switch (type) {
          case WorkerAction.ITEM_PROCESSED:
            setProcessed((item) => item + 1)
            break
          case WorkerAction.BATCH_DONE:
            const { reruns, minTime, batchSize }: { reruns: RawTx[]; minTime: number; batchSize: number } = event.data
            if (reruns.length) {
              confirmTxs(reruns, minTime, batchSize)
            }
            break
        }
      }
    }
  }, [confirmWorker])

  useEffect(() => {
    const toSign = txs.filter((tx) => tx.status === TxStatus.UNSIGNED)
    const signed = txs.filter((tx) => tx.status === TxStatus.SIGNED)
    const sending = txs.filter((tx) => tx.status === TxStatus.SENT)
    const expired = txs.filter((tx) => tx.status === TxStatus.EXPIRED)

    // allow signing right away if nonce present
    if (toSign.length && (nonce || (!signed.length && !sending.length && active))) {
      signBatch()
    }

    const allCompleted = txs.every((tx) => COMPLETED_STATUSES.includes(tx.status))

    if (autoRetry && allCompleted && expired.length) {
      retryFails()
    }
  }, [txs, active, autoRetry])

  useEffect(() => {
    if (sendWorker) {
      sendWorker.onmessage = async (event) => {
        const { type } = event.data

        switch (type) {
          case WorkerAction.ITEM_PROCESSED:
            setProcessed((item) => item + 1)
            const { item }: { item: Partial<Tx> } = event.data
            setTxs((txs) =>
              txs.map((tx) => {
                if (tx.id === item.id) {
                  // dont update if already complete
                  if (item.status !== TxStatus.EXPIRED || CONFIRMING_STATUSES.includes(tx.status)) {
                    return {
                      ...tx,
                      ...item,
                    }
                  }
                }
                return tx
              })
            )

            break
          case WorkerAction.BATCH_DONE:
            const txs: RawTx[] = event.data.done
            const minTime = event.data.minTime
            const batchSize = event.data.batchSize

            if (txs.length) {
              confirmTxs(txs, minTime, batchSize)
            }

            break
        }
      }
    }
  }, [sendWorker])

  function pause() {
    signQueue.stop()
    confirmWorker?.terminate()
    sendWorker?.terminate()
    setConfirmWorker(null)
    setSendWorker(null)
    setActive(false)
    toast("Tx sending paused, submitted txs will continue to confirm/timeout.")
  }

  function resume() {
    const toResign = txs.filter((t) => [TxStatus.UNSIGNED, TxStatus.SIGNED].includes(t.status))

    if (toResign.length) {
      signTxs(toResign)
    }
    setActive(true)
  }

  async function retryFails() {
    try {
      const fails = txs
        .filter((tx) => tx.status === TxStatus.EXPIRED)
        .map((tx) => {
          return {
            ...tx,
            sig: undefined,
            promise: undefined,
            status: TxStatus.UNSIGNED,
          }
        })
      if (!fails.length) {
        return
      }
      setActive(true)

      setTxs((txs) => {
        return txs.map((tx) => {
          const fail = fails.find((f) => f.id === tx.id)
          if (fail) {
            return fail
          }
          return tx
        })
      })

      signTxs(fails)
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    const toUpdate = txs.filter((t) => !t.promise && t.sig && t.blockhash)
    if (!toUpdate.length) {
      return
    }

    ;(async () => {
      await Promise.all(
        toUpdate.map(async (tx) => {
          const sig = base58.serialize(tx.sig!)
          const confirmPromise = umi.rpc.confirmTransaction(sig, {
            strategy: nonce
              ? {
                  type: "durableNonce",
                  nonceAccountPubkey: nonce.pubkey,
                  nonceValue: nonce.nonce,
                  minContextSlot: tx.slot || 0,
                }
              : {
                  type: "blockhash",
                  ...tx.blockhash!,
                  lastValidBlockHeight: tx.blockhash!.lastValidBlockHeight - 160,
                },
          })

          setTxs((txs) => {
            return txs.map((t) => {
              if (isEqual(t.sig, tx.sig)) {
                return {
                  ...t,
                  promise: confirmPromise,
                }
              }
              return t
            })
          })

          try {
            const conf = await confirmPromise
            if (!conf) {
              return
            }
            setTxs((txs) => {
              return txs.map((t) => {
                if (isEqual(t.sig, tx.sig)) {
                  return {
                    ...t,
                    status: conf.value.err ? TxStatus.ERROR : TxStatus.CONFIRMED,
                  }
                }
                return t
              })
            })
          } catch (err) {
            setTxs((txs) => {
              return txs.map((t) => {
                if (isEqual(t.sig, tx.sig)) {
                  return {
                    ...t,
                    status: TxStatus.EXPIRED,
                  }
                }
                return t
              })
            })
          }
        })
      )
    })()
  }, [txs])

  function dismiss() {
    if (!txs.find((t) => t.status === TxStatus.SENT)) {
      setTxs([])
    }
    setIsComplete(true)
    setProgressShowing(false)
  }

  async function createNonce() {
    const promise = Promise.resolve().then(async () => {
      const nonceKp = generateSigner(umi)

      const tx = transactionBuilder()
        .add(
          createAccount(umi, {
            newAccount: nonceKp,
            space: NONCE_ACCOUNT_LENGTH,
            lamports: await umi.rpc.getRent(NONCE_ACCOUNT_LENGTH),
            programId: fromWeb3JsPublicKey(SystemProgram.programId),
            payer: umi.identity,
          })
        )
        .add({
          instruction: fromWeb3JsInstruction(
            SystemProgram.nonceInitialize({
              noncePubkey: toWeb3JsPublicKey(nonceKp.publicKey),
              authorizedPubkey: toWeb3JsPublicKey(umi.identity.publicKey),
            })
          ),
          bytesCreatedOnChain: 0,
          signers: [nonceKp, umi.identity],
        })

      const signed = await tx.buildAndSign(umi)

      await sendAllTxsWithRetries(umi, connection, [signed])

      let accountInfo = await connection.getAccountInfo(toWeb3JsPublicKey(nonceKp.publicKey), {
        commitment: "processed",
      })

      if (!accountInfo) {
        throw new Error("Error creating nonce account")
      }
      let nonceAccount = NonceAccount.fromAccountData(accountInfo.data)
      const nonceAccountWithPubkey = { ...nonceAccount, pubkey: nonceKp.publicKey }

      return nonceAccountWithPubkey
    })

    toast.promise(promise, {
      loading: "Creating durable nonce",
      success: "Nonce account created successfully",
      error: "Error creating nonce account",
    })

    const nonce = await promise
    setNonce(nonce)
    return nonce
  }

  async function process(tx: TransactionBuilder, allMints: PublicKey[]) {
    const nonceAccount = useNonce ? await createNonce() : undefined

    const { chunks } = await packTx(umi, tx, feeLevel, nonceAccount)
    let index = 0
    setActive(true)
    const txs = chunks.map((tx) => {
      const keys = flatten(tx.items.map((item) => item.instruction.keys.map((k) => k.pubkey)))
      const mints = intersection(keys, allMints)
      return {
        index: index++,
        id: uuid(),
        tx,
        status: TxStatus.UNSIGNED,
        mints,
      }
    })
    setTxs(txs)
    signTxs(txs)
  }

  async function signAndUpdate(batch: Tx[]) {
    try {
      const slot = await umi.rpc.getSlot({ commitment: "processed" })
      const blockhash = await umi.rpc.getLatestBlockhash()
      const built =
        useNonce && nonce
          ? batch.map((item) => item.tx.setBlockhash(nonce.nonce).build(umi))
          : batch.map((item) => item.tx.setBlockhash(blockhash).build(umi))

      async function errorAfterTimeout() {
        await sleep(30_000)
        throw new Error("Timeout waiting for wallet adapter")
      }

      async function signAll() {
        try {
          return await umi.identity.signAllTransactions(built)
        } catch (err: any) {
          console.log(err)
          if (err.message.includes("transaction rejected")) {
            pause()
            throw err
          }
        }
      }

      const signedTxs = (await Promise.race([signAll(), errorAfterTimeout()]))?.map(
        (tx: Transaction, index: number) => {
          const item = batch[index]
          return {
            id: item.id,
            index: item.index,
            tx: base58.deserialize(umi.transactions.serialize(tx))[0],
          }
        }
      )

      if (!signedTxs) {
        pause()
        return
      }

      const updates = batch
        .map((tx) => {
          const index = batch.findIndex((item) => item.id === tx.id)
          if (index > -1) {
            return {
              ...tx,
              status: TxStatus.SIGNED,
              blockhash,
              slot,
            }
          }
        })
        .filter(Boolean) as Tx[]

      setTxs((txs) => {
        return txs.map((tx) => {
          const update = updates.find((u) => u.id === tx.id)
          if (update) {
            return update
          }
          return tx
        })
      })
      sendTxs(signedTxs)
    } catch (err: any) {
      if (err.message.includes("Transaction rejected")) {
        pause()
      } else if (err.message.includes("Timeout waiting for wallet adapter")) {
        toast.error("Signature not received in time, pausing execution")
        signQueue.prioritiseAll(batch)
        pause()
      }
    }
  }

  async function signBatch() {
    if (signQueue.isActive()) {
      return
    }
    signQueue.start()
    const batch = signQueue.take(batchSize)
    if (batch.length) {
      await signAndUpdate(batch)
    }
    signQueue.stop()
  }

  async function signTxs(batch: Tx[]) {
    signQueue.enqueueAll(batch)
    signBatch()
  }

  async function confirmTxs(batch: RawTx[], minTime: number, batchSize: number) {
    let worker = confirmWorker

    if (!worker) {
      worker = new Worker(new URL("/public/send-txs.worker.ts", import.meta.url))
      setConfirmWorker(worker)
    }

    worker.postMessage({ txs: batch, batchSize, minTime })
  }

  async function sendTxs(batch: RawTx[]) {
    let worker = sendWorker

    if (!worker) {
      worker = new Worker(new URL("/public/send-txs.worker.ts", import.meta.url))
      setSendWorker(worker)
    }
    console.log(nonce)
    worker.postMessage({ txs: batch, batchSize, minTime: 1000 / speed })
  }

  useEffect(() => {
    if (txs.length) {
      setProgressShowing(true)
    } else {
      setProgressShowing(false)
    }
  }, [txs.length])

  const groupedTxs = groupBy(txs, (tx) => tx.status)

  const unsignedTxs = groupedTxs[TxStatus.UNSIGNED] || []
  const signedTxs = groupedTxs[TxStatus.SIGNED] || []
  const confirmingTxs = groupedTxs[TxStatus.SENT] || []
  const confirmedTxs = groupedTxs[TxStatus.CONFIRMED] || []
  const errorTxs = groupedTxs[TxStatus.ERROR] || []
  const timeoutTxs = groupedTxs[TxStatus.EXPIRED] || []
  const confirmedMints = flatten(confirmedTxs.map((c) => c.mints))
  const unconfirmedTxs = [...unsignedTxs, ...signedTxs, ...confirmingTxs]

  useEffect(() => {
    if (active) {
      const a = !!txs.find((t) => CONFIRMING_STATUSES.includes(t.status))
      setActive(a)
    }
  }, [txs])

  return (
    <Context.Provider
      value={{
        txs,
        active,
        confirmedMints,
        unsignedTxs,
        confirmingTxs,
        confirmedTxs,
        errorTxs,
        process,
        speed,
        onSpeedChange,
        batchSize,
        onBatchSizeChange,
        isComplete,
        useNonce,
        setUseNonce,
      }}
    >
      {children}
      {txs.length > 0 && (
        <Snackbar open={true}>
          <SnackbarContent
            sx={{ width: "100%", backgroundColor: "background.default", color: "white" }}
            message={
              progressShowing ? (
                <Stack sx={{ width: 350 }} spacing={2}>
                  <Stack justifyContent="space-between" direction="row">
                    <Typography variant="h6">Transaction summary</Typography>
                    {active && <CircularProgress size="2em" />}
                  </Stack>

                  {/* <Typography>{txSpeed}</Typography> */}

                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Stack justifyContent="space-between">
                      <Typography fontWeight="bold" fontSize={32} textAlign="center">
                        {unsignedTxs.length + signedTxs.length}
                      </Typography>
                      <Typography fontWeight="bold" textAlign="center">
                        Queue
                      </Typography>
                    </Stack>

                    <Stack justifyContent="space-between">
                      <Typography fontWeight="bold" fontSize={32} textAlign="center" color="primary">
                        {confirmingTxs.length}
                      </Typography>
                      <Typography fontWeight="bold" textAlign="center">
                        Confirming
                      </Typography>
                    </Stack>

                    <Stack justifyContent="space-between">
                      <Typography fontWeight="bold" color="error" fontSize={32} textAlign="center">
                        {timeoutTxs.length + errorTxs.length}
                      </Typography>
                      <Typography fontWeight="bold" textAlign="center">
                        Failed
                      </Typography>
                    </Stack>
                    <Stack justifyContent="space-between">
                      <Typography fontWeight="bold" sx={{ color: "success.main" }} fontSize={32} textAlign="center">
                        {confirmedTxs.length}
                      </Typography>
                      <Typography fontWeight="bold" textAlign="center">
                        Confirmed
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack spacing={1}>
                    <hr />
                    <Stack direction="row" spacing={2} justifyContent="space-between">
                      <Typography>Signed: </Typography>
                      <Typography fontWeight="bold">
                        Batches: {Math.ceil((txs.length - unsignedTxs.length) / batchSize)} /{" "}
                        {Math.ceil(txs.length / batchSize)}{" "}
                      </Typography>
                    </Stack>
                    <LinearProgressWithLabel
                      value={((txs.length - unsignedTxs.length) / txs.length) * 100}
                      sx={{ borderRadius: 2 }}
                    />
                    <hr />
                    <Stack direction="row" spacing={2} justifyContent="space-between">
                      <Typography>Sent: </Typography>
                      <Typography fontWeight="bold">
                        Txs: {txs.length - unsignedTxs.length - signedTxs.length} / {txs.length}
                      </Typography>
                    </Stack>
                    <LinearProgressWithLabel
                      value={((txs.length - unsignedTxs.length - signedTxs.length) / txs.length) * 100}
                      sx={{ borderRadius: 2 }}
                    />
                    <hr />
                    <Stack direction="row" spacing={2} justifyContent="space-between">
                      <Typography fontWeight="bold">Progress: </Typography>
                      <Typography fontWeight="bold">
                        NFTs: {flatten(confirmedTxs.map((m) => m.mints)).length} /{" "}
                        {flatten(txs.map((t) => t.mints)).length}
                      </Typography>
                    </Stack>
                    <LinearProgressWithLabel
                      value={(confirmedTxs.length / txs.length) * 100}
                      sx={{ height: "1em", borderRadius: 2 }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2} gap={2}>
                    <Button
                      onClick={dismiss}
                      disabled={active}
                      fullWidth
                      variant="contained"
                      color={timeoutTxs.length ? "error" : "success"}
                    >
                      {timeoutTxs.length ? "Abort" : "Done"}
                    </Button>

                    {unconfirmedTxs.length ? (
                      <Button onClick={active ? pause : resume} variant="contained" color={"primary"} fullWidth>
                        {active ? "Pause" : "Resume"}
                        {active && (
                          <Tooltip
                            title={
                              <Typography variant="body2">
                                Pause to update settings such as speed, priority fees, or batch size. Your progress will
                                not be lost. <br />
                                <br />
                                Pause and resume if your wallet adapter is not triggered once "Confirming" count reaches
                                0
                              </Typography>
                            }
                          >
                            <Info sx={{ ml: 1, cursor: "help" }} />
                          </Tooltip>
                        )}
                      </Button>
                    ) : (
                      !!timeoutTxs.length && (
                        <Button onClick={retryFails} variant="contained" fullWidth>
                          Retry fails
                        </Button>
                      )
                    )}
                  </Stack>
                </Stack>
              ) : (
                <Button onClick={() => setProgressShowing(true)}>Txs active</Button>
              )
            }
          />
        </Snackbar>
      )}
    </Context.Provider>
  )
}

export const useTxs = () => {
  const context = useContext(Context)

  if (context === undefined) {
    throw new Error("useTxs must be used in a TxProvider")
  }

  return context
}
