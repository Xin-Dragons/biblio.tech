import { aprToApy, apyToApr, aprToInterestRatio, interestRatioToApr } from "@sharkyfi/client"
import { createSharkyClient, createProvider, OrderBook, enabledOrderBooks } from "@sharkyfi/client"
import * as Sharky from "@sharkyfi/client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { findKey, flatten, noop, update } from "lodash"
import { FC, ReactNode, createContext, useContext } from "react"
import { toast } from "react-hot-toast"
import { useNfts } from "./nfts"
import { useUmi } from "./umi"
import { useTransactionStatus } from "./transactions"
import { Nft } from "../db"
import { useDatabase } from "./database"
import { sleep } from "../helpers/utils"
import axios from "axios"
import { useLiveQuery } from "dexie-react-hooks"

type SharkyContextProps = {
  repayLoan: Function
  getRepayLoanInstructions: Function
  getBestLoan: Function
  takeLoan: Function
  getOrderBook: Function
  extendLoan: Function
}

const inital = {
  repayLoan: noop,
  getRepayLoanInstructions: noop,
  getBestLoan: noop,
  takeLoan: noop,
  getOrderBook: noop,
  extendLoan: noop,
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
  const { db } = useDatabase()

  const dbOrderBooks = useLiveQuery(() => db.sharkyOrderBooks.toArray(), [], [])

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

  async function fetchOrderBooks() {
    const orderBooks = await sharkyClient.fetchAllOrderBooks({ program })
    const collectionNames = await sharkyClient.fetchAllNftLists({ program })

    const nftListPubKeyToNameMap = Object.fromEntries(
      collectionNames.map(({ pubKey, collectionName }) => [pubKey, collectionName])
    )

    const orderBooksByName = flatten(
      orderBooks.map((ob: OrderBook) => [
        {
          collectionId: nftListPubKeyToNameMap[ob.orderBookType.nftList!.listAccount.toString()],
          pubkey: ob.pubKey.toString(),
          enabled: enabledOrderBooks.includes(ob.pubKey.toString()),
        },
      ])
    )

    return orderBooksByName
  }

  async function getBestLoan(orderBook: OrderBook | null) {
    if (!orderBook) {
      throw new Error("Order book not found")
    }
    const bestLoan = await orderBook.fetchBestLoan(program)

    if (!bestLoan) {
      return null
    }

    const loan = bestLoan.offered

    const { interestRatio, interestWithFeeLamports, totalOwedLamports, apyAfterFee } = getRates(loan, orderBook)

    return {
      ...bestLoan.offered,
      interestRatio,
      interestWithFeeLamports,
      totalOwedLamports,
      apyAfterFee,
    }
  }

  function getRates(loan: Sharky.Loan, orderBook: OrderBook) {
    const apr = orderBook.apy.fixed!.apy / 1000

    const principalLamports = loan.data.principalLamports.toNumber()
    const feePermillicentage = orderBook.feePermillicentage
    const durationSeconds =
      loan.data.loanState.taken?.taken.terms.time?.duration.toNumber() ||
      loan.data.loanState.offer?.offer.termsSpec.time?.duration.toNumber()

    const interestRatio = aprToInterestRatio(apr, durationSeconds || 0)
    const interestWithFeeLamports = interestRatio * principalLamports
    const totalOwedLamports = principalLamports + interestWithFeeLamports
    const feeLamports = Math.floor((interestWithFeeLamports * feePermillicentage) / 100_000)
    const interestWithoutFeeLamports = interestWithFeeLamports - feeLamports
    const interestRatioAfterFee = interestWithoutFeeLamports / principalLamports
    const aprAfterFee = interestRatioToApr(interestRatioAfterFee, durationSeconds || 0)
    const apyAfterFee = aprToApy(aprAfterFee).toLocaleString(undefined, { maximumFractionDigits: 2 })

    return {
      interestRatio,
      interestWithFeeLamports,
      totalOwedLamports,
      apyAfterFee,
    }
  }

  async function getOrderBook(mint: string) {
    const { data } = await axios.get("/api/get-me-collection", { params: { mint } })
    const meCollection = data.collection

    const sharkyCollection = findKey(Sharky.magicEdenSymbols, (item) => item === meCollection)

    const orderBooks = dbOrderBooks.length ? dbOrderBooks : await fetchOrderBooks()

    const orderBookItem = orderBooks.find((ob) => ob.collectionId === sharkyCollection)

    if (!orderBookItem) {
      console.log("Order book item not found")
      return null
    }

    const { orderBook } = await sharkyClient.fetchOrderBook({
      program,
      orderBookPubKey: new PublicKey(orderBookItem.pubkey),
    })

    if (!orderBook) {
      return null
    }

    return orderBook
  }

  async function takeLoan(loan: Sharky.OfferedLoan, nftMint: string) {
    const { orderBook } = await sharkyClient.fetchOrderBook({ program, orderBookPubKey: loan.data.orderBook })
    if (!orderBook) {
      return
    }
    const nftList = await sharkyClient.fetchNftList({
      program,
      nftListPubKey: orderBook.orderBookType.nftList!.listAccount,
    })
    console.log(program.provider.connection.rpcEndpoint)
    if (!nftList) {
      throw Error(
        `NFTList ${orderBook.orderBookType.nftList!.listAccount.toString()} doesn't exist, or you're using the default solana public RPC which doesn't support some calls.`
      )
    }
    const nftListIndex = nftList.mints.map((pk) => pk.toString()).indexOf(nftMint)
    if (nftListIndex === -1) {
      throw Error("NFT mint not found in the NFTList's mints")
    }

    console.log("Fetching mint metadata")
    // Check if the loan can be frozen (escrow-less loan) or not (escrow loan)
    const metadata = (await sharkyClient.program.provider.connection.getParsedAccountInfo(
      new PublicKey(nftMint),
      "confirmed"
    )) as any
    const { freezeAuthority } = metadata?.value?.data?.parsed?.info
    const isFreezable = Boolean(freezeAuthority)

    // Execute the instruction
    const { takenLoan, sig } = await loan.take({
      program,
      nftMintPubKey: new PublicKey(nftMint),
      nftListIndex,
      skipFreezingCollateral: !isFreezable,
    })

    console.log(`Loan taken! Its pubkey is: ${takenLoan.pubKey.toString()}; tx sig: ${sig}`)
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

  async function extendLoan(mint: string) {
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
      throw new Error("Cannot find order book")
    }

    const newLoan = await getBestLoan(orderBook)

    if (!newLoan) {
      throw new Error("New loan not found")
    }

    await loan.extend({
      program,
      orderBook,
      newLoan,
    })

    setTransactionInProgress([mint], "repay")

    toast.success("Loan extended successfully!")
    await setTransactionComplete([mint])
    await sleep(2000)
    clearTransactions([mint])
    // await settleLoans([nft])
  }

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

  return (
    <SharkyContext.Provider
      value={{ repayLoan, getRepayLoanInstructions, getBestLoan, takeLoan, getOrderBook, extendLoan }}
    >
      {children}
    </SharkyContext.Provider>
  )
}

export const useSharky = () => {
  return useContext(SharkyContext)
}
