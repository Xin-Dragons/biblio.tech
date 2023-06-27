import { FC, ReactNode, createContext, useContext } from "react"
import { CitrusSdk, Collection, Loan, Status } from "@famousfoxfederation/citrus-sdk"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { noop, orderBy } from "lodash"
import { useDatabase } from "./database"
import { Nft } from "../db"
import { PublicKey } from "@solana/web3.js"

export const CitrusContext = createContext<{ getBestCitrusLoan: Function; takeCitrusLoan: Function }>({
  getBestCitrusLoan: noop,
  takeCitrusLoan: noop,
})

export const CitrusProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallet = useWallet()
  const { db } = useDatabase()
  const { connection } = useConnection()
  const sdk = new CitrusSdk(wallet as any, connection)

  async function getBestCitrusLoan(nft: Nft) {
    try {
      const nftCollection = await db.collections.get(nft.collectionIdentifier as string)
      const collections = await sdk.fetchCollections()
      const collection = collections.find((item) => item.name === nftCollection?.collectionName)
      if (!collection) {
        return null
      }

      const loans = await sdk.fetchCollectionLoans(new PublicKey(collection.id), Status.WaitingForBorrower)
      console.log(loans)

      const bestLoan = orderBy(
        loans.filter((l) => l.borrower === "11111111111111111111111111111111"),
        (l) => l.terms.principal,
        "desc"
      )[0]

      if (!bestLoan) {
        return null
      }

      return bestLoan
    } catch {
      return null
    }
  }

  async function takeCitrusLoan(loan: Loan, mint: string) {
    await sdk.borrowLoan(loan, new PublicKey(mint))
  }

  return <CitrusContext.Provider value={{ getBestCitrusLoan, takeCitrusLoan }}>{children}</CitrusContext.Provider>
}

export const useCitrus = () => {
  return useContext(CitrusContext)
}
