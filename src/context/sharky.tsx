import { createSharkyClient, createProvider } from "@sharkyfi/client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { noop, update } from "lodash"
import { FC, ReactNode, createContext, useContext } from "react"
import { toast } from "react-hot-toast"
import { useNfts } from "./nfts"
import { useUmi } from "./umi"
import { useTransactionStatus } from "./transactions"
import { Nft } from "../db"
import { useDatabase } from "./database"
import { sleep } from "../helpers/utils"

type SharkyContextProps = {
  repayLoan: Function
  getRepayLoanInstructions: Function
}

const inital = {
  repayLoan: noop,
  getRepayLoanInstructions: noop,
}

export const SharkyContext = createContext<SharkyContextProps>(inital)

type SharkyProviderProps = {
  children: ReactNode
}

export const SharkyProvider: FC<SharkyProviderProps> = ({ children }) => {
  const { connection } = useConnection()
  const wallet = useWallet()
  const { settleLoans } = useDatabase()
  const provider = createProvider(connection, wallet as any)
  const sharkyClient = createSharkyClient(provider)
  const { nfts } = useNfts()
  const { setTransactionInProgress, setTransactionComplete, setTransactionErrors, clearTransactions } =
    useTransactionStatus()
  const umi = useUmi()

  const { program } = sharkyClient

  async function getLoanToRepay(loanPubKey: string) {
    const offeredOrTaken = await sharkyClient.fetchLoan({
      program,
      loanPubKey: new PublicKey(loanPubKey),
    })

    if (!offeredOrTaken) {
      throw new Error(`No loan found with pubkey ${loanPubKey}`)
    }

    if (!("taken" in offeredOrTaken!)) {
      throw new Error("Loan is not in a taken state so cannot be repaid")
    }

    const loan = offeredOrTaken.taken

    return loan
  }

  async function repayLoan(mint: string) {
    try {
      const nft = nfts.find((n) => n.nftMint === mint) as Nft
      const loanPubKey = nft.loan?.loanId
      if (!loanPubKey) {
        throw new Error("No loan foound")
      }
      const loan = await getLoanToRepay(loanPubKey)

      const { orderBook } = await sharkyClient.fetchOrderBook({
        program,
        orderBookPubKey: loan.data.orderBook,
      })

      if (!orderBook) {
        throw new Error("Order book not found")
      }

      setTransactionInProgress([mint], "repay")

      const { sig } = await loan.repay({
        program,
        orderBook,
      })

      toast.success("Loan repaid successfully!")
      await setTransactionComplete([mint])
      await sleep(2000)
      clearTransactions([mint])
      await settleLoans([nft])
    } catch (err: any) {
      toast.error(err.message)
      await setTransactionErrors([mint])
      await sleep(2000)
      clearTransactions([mint])
    } finally {
    }
  }

  // async function extendLoan(mint: string) {
  //   const nft = nfts.find((n) => n.nftMint === mint) as Nft
  //   const loanPubKey = nft.loan?.loanId
  //   if (!loanPubKey) {
  //     throw new Error("No loan foound")
  //   }
  //   const loan = await getLoanToRepay(loanPubKey)

  //   const { orderBook } = await sharkyClient.fetchOrderBook({
  //     program,
  //     orderBookPubKey: loan.data.orderBook,
  //   })

  //   if (!orderBook) {
  //     throw new Error("Order book not found")
  //   }

  //   setTransactionInProgress([mint], "extend")

  //   const { sig } = await loan.extend()
  // }

  async function getRepayLoanInstructions(selected: string[]) {
    const loans = selected.map((nftMint) => {
      const nft = nfts.find((n) => n.nftMint === nftMint)
      return {
        mint: nftMint,
        loanId: nft.loan.loanId,
      }
    })

    return Promise.all(
      loans.map(async (item) => {
        const loan = await getLoanToRepay(item.loanId)

        const { instructions } = await loan.createRepayInstruction({
          program,
          orderBookPubKey: loan.data.orderBook,
          feeAuthorityPubKey: wallet.publicKey!,
          valueMint: loan.data.valueTokenMint,
        })

        return {
          mint: item.mint,
          instructions: instructions,
        }
        // .map((instruction) => {
        //   return {
        //     instruction: fromWeb3JsInstruction(instruction),
        //     signers: [umi.identity],
        //     bytesCreatedOnChain: 0,
        //   }
        // }),
      })
    )
  }

  return <SharkyContext.Provider value={{ repayLoan, getRepayLoanInstructions }}>{children}</SharkyContext.Provider>
}

export const useSharky = () => {
  return useContext(SharkyContext)
}
