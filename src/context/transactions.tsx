import { Transaction, publicKey } from "@metaplex-foundation/umi"
import { FC, ReactElement, createContext, useContext, useEffect, useState } from "react"
import { useUmi } from "./umi"
import { sleep } from "../helpers/utils"
import { noop, uniq } from "lodash"
import { toast } from "react-hot-toast"
import { useNfts } from "./nfts"
import { useConnection } from "@solana/wallet-adapter-react"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { niftyAsset } from "@nifty-oss/asset"

type TransactionStatusContextProps = {
  transactions: TransactionStatus[]
  setTransactionInProgress: Function
  setTransactionErrors: Function
  setTransactionComplete: Function
  clearTransactions: Function
  sendSignedTransactionsWithRetries: Function
  sendSignedTransactions: Function
}

const initial = {
  transactions: [],
  setTransactionInProgress: noop,
  setTransactionErrors: noop,
  setTransactionComplete: noop,
  clearTransactions: noop,
  sendSignedTransactionsWithRetries: noop,
  sendSignedTransactions: noop,
}

export const TransactionStatusContext = createContext<TransactionStatusContextProps>(initial)

type TransactionStatusType = "burn" | "lock" | "unlock" | "send" | "repay" | "list" | "delist"

type TransactionStatus = {
  nftMint: string
  status: string
  type: TransactionStatusType
}

type TransactionProviderProps = {
  children: ReactElement
}

export const TransactionStatusProvider: FC<TransactionProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<TransactionStatus[]>([])
  const umi = useUmi()
  const { nfts } = useNfts()
  const { connection } = useConnection()

  async function sendSignedTransactions(
    txs: Transaction[],
    type: TransactionStatusType,
    onSuccess?: Function,
    recipient = ""
  ) {
    const allNfts = nfts.map((n) => n.nftMint)

    let successes = 0
    let errors = 0

    let blockhash = await umi.rpc.getLatestBlockhash()

    await Promise.all(
      txs.map(async (tx) => {
        const mints = tx.message.accounts.filter((m) => allNfts.includes(m))
        try {
          setTransactionInProgress(mints, type)
          const sig = await umi.rpc.sendTransaction(tx, { skipPreflight: true, commitment: "processed" })
          const conf = await umi.rpc.confirmTransaction(sig, {
            commitment: "processed",
            strategy: {
              type: "blockhash",
              ...blockhash,
            },
          })

          if (conf.value.err) {
            errors += mints.length
            setTransactionErrors(mints)
          } else {
            successes += mints.length
            setTransactionComplete(mints)
            onSuccess &&
              (await onSuccess(
                nfts.filter((n) => mints.includes(publicKey(n.nftMint))),
                recipient
              ))

            await sleep(2000)

            clearTransactions(mints)
          }
        } catch (err) {
          setTransactionErrors(mints)
          errors += mints.length
          throw err
        }
      })
    )

    return {
      errors,
      successes,
    }
  }

  async function sendSignedTransactionsWithRetries(
    txs: Transaction[],
    type: TransactionStatusType,
    onSuccess?: Function,
    recipient = "",
    delay = 500
  ) {
    const allNfts = nfts.map((n) => n.nftMint)

    let successes = 0
    let errors = 0

    const lastValidBlockHeight = (await umi.rpc.getLatestBlockhash()).lastValidBlockHeight
    let blockheight = await connection.getBlockHeight("confirmed")
    let blockhash = await umi.rpc.getLatestBlockhash()

    await Promise.all(
      txs.map(async (tx) => {
        const mints = tx.message.accounts.filter((m) => allNfts.includes(m))
        try {
          setTransactionInProgress(mints, type)
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
              console.log("sending tx")
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
            errors += mints.length
            setTransactionErrors(mints)
          } else {
            successes += mints.length
            setTransactionComplete(mints)
            onSuccess &&
              (await onSuccess(
                nfts.filter((n) => mints.includes(publicKey(n.nftMint))),
                recipient
              ))

            await sleep(2000)

            clearTransactions(mints)
          }
        } catch (err) {
          setTransactionErrors(mints)
          errors += mints.length
          throw err
        }
      })
    )

    return {
      errors,
      successes,
    }
  }

  function setTransactionInProgress(nftMints: string[], type: TransactionStatusType) {
    setTransactions((prevState: TransactionStatus[]) => {
      return [
        ...prevState,
        ...nftMints.map((nftMint) => {
          return {
            nftMint,
            status: "pending",
            type,
          }
        }),
      ]
    })
  }

  async function setTransactionErrors(nftMints: string[]) {
    setTransactions((prevState: TransactionStatus[]) => {
      return prevState.map((item) => {
        if (nftMints.includes(item.nftMint)) {
          return {
            ...item,
            status: "error",
          }
        }
        return item
      })
    })
    await sleep(2000)

    clearTransactions(nftMints)
  }

  async function setTransactionComplete(nftMints: string[]) {
    setTransactions((prevState: TransactionStatus[]) => {
      return prevState.map((item) => {
        if (nftMints.includes(item.nftMint)) {
          return {
            ...item,
            status: "success",
          }
        }
        return item
      })
    })

    await sleep(2000)

    clearTransactions(nftMints)
  }

  function clearTransactions(nftMints: string[]) {
    setTransactions((prevState: TransactionStatus[]) => {
      return prevState.filter((item) => !nftMints.includes(item.nftMint))
    })
  }

  return (
    <TransactionStatusContext.Provider
      value={{
        transactions,
        setTransactionInProgress,
        setTransactionComplete,
        setTransactionErrors,
        clearTransactions,
        sendSignedTransactionsWithRetries,
        sendSignedTransactions,
      }}
    >
      {children}
    </TransactionStatusContext.Provider>
  )
}

export const useTransactionStatus = () => {
  return useContext(TransactionStatusContext)
}
