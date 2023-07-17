import { aprToApy, apyToApr, aprToInterestRatio, interestRatioToApr } from "@sharkyfi/client"
import { createSharkyClient, createProvider, OrderBook, enabledOrderBooks } from "@sharkyfi/client"
import * as Sharky from "@sharkyfi/client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
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
import { useAccess } from "./access"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { lamports, publicKey, sol, transactionBuilder } from "@metaplex-foundation/umi"
import {
  fromWeb3JsInstruction,
  fromWeb3JsLegacyTransaction,
  fromWeb3JsTransaction,
} from "@metaplex-foundation/umi-web3js-adapters"

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
  const { settleLoans, updateCollection } = useDatabase()
  const provider = createProvider(connection, wallet as any)
  const sharkyClient = createSharkyClient(provider)
  const { nfts } = useNfts()
  const { isAdmin } = useAccess()
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

    console.log({ orderBooksByName })

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

  async function getOrderBook(nft: Nft) {
    const collection = await db.collections.get(nft.collectionIdentifier!)

    if (!collection) {
      console.log("Collection not found")
      return null
    }

    let meIdentifier = collection.meIdentifier
    if (!meIdentifier) {
      const { data } = await axios.get("/api/get-me-collection", { params: { mint: nft.nftMint } })
      meIdentifier = data.collection
      if (meIdentifier) {
        await updateCollection(collection.id, { meIdentifier })
      } else {
        console.log("ME collection unavailable")
        return null
      }
    }

    const sharkyCollection = findKey(Sharky.magicEdenSymbols, (item) => item === meIdentifier)

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

    const { transaction } = await loan.createTakeTransaction({
      program,
      nftMintPubKey: new PublicKey(nftMint),
      nftListIndex,
      skipFreezingCollateral: !isFreezable,
    })

    const transactions = []

    if (!isAdmin) {
      const amount = sol(Number(BigInt(loan.data.principalLamports.toString()) / BigInt(LAMPORTS_PER_SOL)) * 0.005)
      transactions.push(
        await transferSol(umi, {
          destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
          amount,
        }).buildWithLatestBlockhash(umi)
      )
    }

    transactions.unshift(fromWeb3JsLegacyTransaction(transaction))

    const signed = await umi.identity.signAllTransactions(transactions)
    await Promise.all(
      signed.map(async (tx) => {
        const sig = await umi.rpc.sendTransaction(tx, { commitment: "processed" })
        const result = await umi.rpc.confirmTransaction(sig, {
          commitment: "processed",
          strategy: {
            type: "blockhash",
            ...(await umi.rpc.getLatestBlockhash()),
          },
        })
      })
    )

    console.log(`Loan taken!`)
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

      const { instructions } = await loan.createRepayInstruction({
        program,
        orderBookPubKey: orderBook.pubKey,
        feeAuthorityPubKey: orderBook.feeAuthority,
        valueMint: loan.data.valueTokenMint,
      })

      let tx = transactionBuilder().add(
        instructions.map((instruction) => ({
          instruction: fromWeb3JsInstruction(instruction),
          signers: [umi.identity],
          bytesCreatedOnChain: 0,
        }))
      )

      if (!isAdmin) {
        // 0.5%
        const amount = sol(Number(BigInt(loan.data.principalLamports.toString()) / BigInt(LAMPORTS_PER_SOL)) * 0.005)
        tx = tx.add(
          transferSol(umi, {
            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
            amount: amount,
          })
        )
      }

      const conf = await tx.sendAndConfirm(umi)

      if (conf.result.value.err) {
        throw new Error("Error repaying loan")
      }

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

    const { instructions } = await loan.createExtendInstruction({
      program,
      orderBookPubKey: orderBook.pubKey,
      valueMint: loan.data.valueTokenMint,
      feeAuthorityPubKey: orderBook.feeAuthority,
      newLoan,
    })

    let tx = transactionBuilder().add(
      instructions.map((instruction) => ({
        instruction: fromWeb3JsInstruction(instruction),
        signers: [umi.identity],
        bytesCreatedOnChain: 0,
      }))
    )

    if (!isAdmin) {
      // 0.5%
      const amount = sol(Number(BigInt(newLoan.data.principalLamports.toString()) / BigInt(LAMPORTS_PER_SOL)) * 0.005)
      console.log(amount)
      tx = tx.add(
        transferSol(umi, {
          destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
          amount: amount,
        })
      )
    }

    const conf = await tx.sendAndConfirm(umi)

    if (conf.result.value.err) {
      throw new Error("Error repaying loan")
    }

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
