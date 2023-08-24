"use client"
import { Transaction } from "@metaplex-foundation/umi"
import { FC, ReactElement, createContext, useContext, useEffect, useState } from "react"
import { useUmi } from "./umi"
import { sleep } from "../helpers/utils"
import { noop, uniq } from "lodash"
import { toast } from "react-hot-toast"
import { useNfts } from "./nfts.tsx"

type TransactionStatusContextProps = {
  transactions: TransactionStatus[]
  setTransactionInProgress: Function
  setTransactionErrors: Function
  setTransactionComplete: Function
  clearTransactions: Function
  sendSignedTransactions: Function
}

const initial = {
  transactions: [],
  setTransactionInProgress: noop,
  setTransactionErrors: noop,
  setTransactionComplete: noop,
  clearTransactions: noop,
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

  async function sendSignedTransactions(
    signedTransactions: Transaction[],
    txnMints: string[][],
    type: TransactionStatusType,
    onSuccess?: Function,
    recipient = ""
  ) {
    const blockhash = await umi.rpc.getLatestBlockhash()
    let errs: string[] = []
    let successes: string[] = []
    await Promise.all(
      signedTransactions.map(async (transaction, index) => {
        const mints = txnMints[index]
        try {
          setTransactionInProgress(mints, type)

          const signature = await umi.rpc.sendTransaction(transaction, { skipPreflight: true })
          const confirmed = await umi.rpc.confirmTransaction(signature, {
            strategy: {
              type: "blockhash",
              ...blockhash,
            },
          })
          if (confirmed.value.err) {
            setTransactionErrors(mints)
            await sleep(2000)

            clearTransactions(mints)
          } else {
            setTransactionComplete(mints)
            onSuccess &&
              (await onSuccess(
                nfts.filter((n) => mints.includes(n.nftMint)),
                recipient
              ))

            await sleep(2000)

            clearTransactions(mints)
          }
          successes = [...successes, ...mints]
        } catch (err) {
          console.error(err)
          setTransactionErrors(mints)
          errs = [...errs, ...mints]
          await sleep(2000)

          clearTransactions(mints)
        }
      })
    )

    return {
      errs: uniq(errs),
      successes: uniq(successes),
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

  function setTransactionErrors(nftMints: string[]) {
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
  }

  function setTransactionComplete(nftMints: string[]) {
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
        sendSignedTransactions,
      }}
    >
      {children}
    </TransactionStatusContext.Provider>
  )
}

export const useTransactionStatus = () => {
  const context = useContext(TransactionStatusContext)

  if (context === undefined) {
    throw new Error("useTransactionStatus must be used in a TransactionStatusProvider")
  }

  return context
}
