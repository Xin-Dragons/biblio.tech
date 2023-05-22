import { FC, ReactElement, createContext, useContext, useEffect, useState } from "react"

type TransactionStatusContextProps = {
  transactions: TransactionStatus[]
  setTransactionInProgress: Function
  setTransactionErrors: Function
  setTransactionComplete: Function
  clearTransactions: Function
}

const initial = {
  transactions: [],
  setTransactionInProgress: () => {},
  setTransactionErrors: () => {},
  setTransactionComplete: () => {},
  clearTransactions: () => {},
}

export const TransactionStatusContext = createContext<TransactionStatusContextProps>(initial)

type TransactionStatusType = "burn" | "lock" | "unlock" | "send"

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

  useEffect(() => {
    console.log(transactions)
  }, [transactions])

  return (
    <TransactionStatusContext.Provider
      value={{
        transactions,
        setTransactionInProgress,
        setTransactionComplete,
        setTransactionErrors,
        clearTransactions,
      }}
    >
      {children}
    </TransactionStatusContext.Provider>
  )
}

export const useTransactionStatus = () => {
  return useContext(TransactionStatusContext)
}
