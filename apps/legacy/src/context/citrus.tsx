import { FC, ReactNode, createContext, useContext } from "react"
import { CitrusSdk, Collection, Loan, Status } from "@famousfoxfederation/citrus-sdk"
import { getBorrowTxn } from "@famousfoxfederation/citrus-sdk/lib/helpers/instructions"
import {
  AUTH_RULES_PROGRAM,
  getBorrowAuthority,
  getFromTokenAccount,
  getRulesAccount,
} from "@famousfoxfederation/citrus-sdk/lib/helpers/utils"
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import { noop, orderBy } from "lodash"
import { useDatabase } from "./database"
import { Nft } from "../db"
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"

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

const CIRTUS_PROGRAM_ID = new PublicKey("JCFRaPv7852ESRwJJGRy2mysUMydXZgVVhrMLmExvmVp")

import { IDL } from "../idls/citrus"
import { useMetaplex } from "./metaplex"
import axios from "axios"
import {
  fromWeb3JsInstruction,
  fromWeb3JsLegacyTransaction,
  toWeb3JsInstruction,
} from "@metaplex-foundation/umi-web3js-adapters"
import { useUmi } from "./umi"
import { publicKey, sol, transactionBuilder } from "@metaplex-foundation/umi"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { useAccess } from "./access"

export const CitrusProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const metaplex = useMetaplex()
  const umi = useUmi()
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const provider = new AnchorProvider(connection, wallet!, {
    commitment: "processed",
    preflightCommitment: "processed",
  })
  const program = new Program(IDL, CIRTUS_PROGRAM_ID, provider)
  const { db } = useDatabase()
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

  const mappings = {
    "SMB Gen2": "Solana Monkey Business",
  }

  async function getBestCitrusLoan(nft: Nft) {
    try {
      const nftCollection = await db.collections.get(nft.collectionIdentifier as string)
      const collections = await sdk.fetchCollections()
      const collection = collections.find(
        (item) =>
          item.name === (mappings[nftCollection?.collectionName as keyof object] || nftCollection?.collectionName)
      )
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

    const mint = new anchor.web3.PublicKey(loan.mint)
    const loanAccount = new anchor.web3.PublicKey(loan.loanAccount)
    const tokenAccount = await getFromTokenAccount(program.provider.connection, mint)
    const rules = await getRulesAccount(metaplex as any, mint)
    const tokenMetadataProgram = metaplex.programs().getTokenMetadata().address
    const instruction = await program.methods
      .repay()
      .accounts({
        loanAccount,
        borrowAuthority: getBorrowAuthority(new anchor.web3.PublicKey(loan.borrower), loanAccount),
        borrower: new anchor.web3.PublicKey(loan.borrower),
        treasury: new anchor.web3.PublicKey("7e7qhwnJuLVDGBiLAGjB9FxfpizsPhQjoBxkNA5wVCCc"),
        lender: new anchor.web3.PublicKey(loan.lender),
        mint: mint,
        tokenAccount: tokenAccount,
        masterEdition: metaplex.nfts().pdas().masterEdition({ mint }),
        metadata: metaplex.nfts().pdas().metadata({ mint }),
        tokenRecord: metaplex.nfts().pdas().tokenRecord({ mint, token: tokenAccount }),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenMetadataProgram: tokenMetadataProgram,
        sysvarInstructions: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        authorizationRulesProgram: AUTH_RULES_PROGRAM,
        rules: rules,
      })
      .instruction()

    let txn = transactionBuilder().add({
      instruction: fromWeb3JsInstruction(instruction),
      signers: [umi.identity],
      bytesCreatedOnChain: 0,
    })

    // if (!isAdmin) {
    //   txn = txn.add(
    //     transferSol(umi, {
    //       destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
    //       amount: sol((loan.terms.principal / LAMPORTS_PER_SOL) * 0.005),
    //     })
    //   )
    // }

    await txn.sendAndConfirm(umi)
  }

  async function extendCitrusLoan(loanId: string) {
    const loan = await sdk.fetchLoan(new PublicKey(loanId))
    const newLoan = await getBestLoan(loan.collectionConfig)

    if (!newLoan) {
      throw new Error("No new loan available")
    }

    const mint = new anchor.web3.PublicKey(loan.mint)
    const tokenAccount = await getFromTokenAccount(program.provider.connection, mint)
    const rules = await getRulesAccount(metaplex as any, mint)
    const { data } = await axios.post(`https://citrus.famousfoxes.com/citrus/getReborrowIxn`, {
      loan: loan.loanAccount,
      new_loan: newLoan.loanAccount,
      borrower: wallet?.publicKey.toBase58(),
      token: tokenAccount.toBase58(),
      rules: rules,
    })

    const tx = Transaction.from(data.ixn)

    const txns = [fromWeb3JsLegacyTransaction(tx)]

    // if (!isAdmin) {
    //   txns.push(
    //     await transferSol(umi, {
    //       destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
    //       amount: sol((loan.terms.principal / LAMPORTS_PER_SOL) * 0.005),
    //     }).buildWithLatestBlockhash(umi)
    //   )
    // }

    const signed = await umi.identity.signAllTransactions(txns)

    await Promise.all(
      signed.map(async (tx) => {
        const sig = await umi.rpc.sendTransaction(tx, { commitment: "processed" })
        const confirmed = await umi.rpc.confirmTransaction(sig, {
          strategy: {
            type: "blockhash",
            ...(await umi.rpc.getLatestBlockhash()),
          },
          commitment: "processed",
        })

        if (confirmed.value.err) {
          throw new Error("Error taking loan")
        }
      })
    )
  }

  async function takeCitrusLoan(loan: Loan, mint: string) {
    const tokenAccount = await getFromTokenAccount(program.provider.connection, new PublicKey(mint))
    const rules = await getRulesAccount(metaplex as any, new PublicKey(mint))
    const { data } = await axios.post(`https://citrus.famousfoxes.com/citrus/getBorrowIxn`, {
      loan: loan.loanAccount,
      borrower: wallet?.publicKey.toBase58(),
      mint: new PublicKey(mint),
      token: tokenAccount.toBase58(),
      rules: rules,
    })

    const tx = Transaction.from(data.ixn)

    const txns = [fromWeb3JsLegacyTransaction(tx)]

    // if (!isAdmin) {
    //   txns.push(
    //     await transferSol(umi, {
    //       destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
    //       amount: sol((loan.terms.principal / LAMPORTS_PER_SOL) * 0.005),
    //     }).buildWithLatestBlockhash(umi)
    //   )
    // }

    const signed = await umi.identity.signAllTransactions(txns)
    await Promise.all(
      signed.map(async (tx) => {
        const sig = await umi.rpc.sendTransaction(tx, { commitment: "processed" })
        const confirmed = await umi.rpc.confirmTransaction(sig, {
          strategy: {
            type: "blockhash",
            ...(await umi.rpc.getLatestBlockhash()),
          },
          commitment: "processed",
        })

        if (confirmed.value.err) {
          throw new Error("Error taking loan")
        }
      })
    )
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
