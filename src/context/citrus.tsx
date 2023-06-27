import { FC, ReactNode, createContext, useContext } from "react"
import { CitrusSdk, Collection, Loan, Status } from "@famousfoxfederation/citrus-sdk"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { noop, orderBy } from "lodash"
import { useDatabase } from "./database"
import { Nft } from "../db"
import { PublicKey } from "@solana/web3.js"

export const CitrusContext = createContext<{
  getBestCitrusLoan: Function
  takeCitrusLoan: Function
  repayCitrusLoan: Function
  extendCitrusLoan: Function
  getBestCitrusLoanFromLoan: Function
}>({
  getBestCitrusLoan: noop,
  takeCitrusLoan: noop,
  repayCitrusLoan: noop,
  extendCitrusLoan: noop,
  getBestCitrusLoanFromLoan: noop,
})

export const CitrusProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallet = useWallet()
  const { db } = useDatabase()
  const { connection } = useConnection()
  const sdk = new CitrusSdk(wallet as any, connection)

  async function getBestLoan(collection: string) {
    const loans = await sdk.fetchCollectionLoans(new PublicKey(collection), Status.WaitingForBorrower)

    const bestLoan = orderBy(
      loans.filter((l) => l.borrower === "11111111111111111111111111111111"),
      (l) => l.terms.principal,
      "desc"
    )[0]

    if (!bestLoan) {
      return null
    }

    return bestLoan
  }

  async function getBestCitrusLoan(nft: Nft) {
    try {
      const nftCollection = await db.collections.get(nft.collectionIdentifier as string)
      const collections = await sdk.fetchCollections()
      const collection = collections.find((item) => item.name === nftCollection?.collectionName)
      if (!collection) {
        return null
      }

      const bestLoan = await getBestLoan(collection.id)
      return bestLoan
    } catch {
      return null
    }
  }

  async function repayCitrusLoan(loanId: string) {
    const loan = await sdk.fetchLoan(new PublicKey(loanId))
    await sdk.repayLoan(loan)
  }

  async function extendCitrusLoan(loanId: string) {
    const loan = await sdk.fetchLoan(new PublicKey(loanId))
    const newLoan = await getBestLoan(loan.collectionConfig)
    if (!newLoan) {
      throw new Error("No new loan available")
    }
    await sdk.reborrow(loan, newLoan)
  }

  async function takeCitrusLoan(loan: Loan, mint: string) {
    await sdk.borrowLoan(loan, new PublicKey(mint))
  }

  async function getBestCitrusLoanFromLoan(loanId: string) {
    const loan = await sdk.fetchLoan(new PublicKey(loanId))
    const bestLoan = await getBestLoan(loan.collectionConfig)
    return bestLoan
  }

  return (
    <CitrusContext.Provider
      value={{ getBestCitrusLoan, takeCitrusLoan, repayCitrusLoan, extendCitrusLoan, getBestCitrusLoanFromLoan }}
    >
      {children}
    </CitrusContext.Provider>
  )
}

export const useCitrus = () => {
  return useContext(CitrusContext)
}
