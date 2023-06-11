import { AnchorProvider, BN, Wallet } from "@project-serum/anchor"
import { LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from "@solana/web3.js"
import { TensorSwapSDK, TensorWhitelistSDK, castPoolConfigAnchor, findWhitelistPDA } from "@tensor-oss/tensorswap-sdk"
import * as Tensor from "@tensor-oss/tensorswap-sdk"
import { FC, ReactNode, createContext, useContext } from "react"
import { useUmi } from "./umi"
import {
  fromWeb3JsInstruction,
  fromWeb3JsLegacyTransaction,
  fromWeb3JsPublicKey,
  fromWeb3JsTransaction,
  toWeb3JsInstruction,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters"
import { PublicKey } from "@solana/web3.js"
import {
  createAssociatedToken,
  findAssociatedTokenPda,
  initializeMint,
  initializeToken,
} from "@metaplex-foundation/mpl-essentials"
import { Instruction, base58PublicKey, publicKey, transactionBuilder, unwrapSome } from "@metaplex-foundation/umi"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { flatten, groupBy, noop } from "lodash"
import { toast } from "react-hot-toast"
import { useTransactionStatus } from "./transactions"
import { useDatabase } from "./database"
import { Nft } from "../db"
import { useNfts } from "./nfts"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { InstructionSet, buildTransactions, getUmiChunks, notifyStatus } from "../helpers/transactions"
import axios, { AxiosError } from "axios"

export const TensorContext = createContext({ delist: noop, list: noop, sellNow: noop, buy: noop })

export const TensorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const umi = useUmi()
  const { sendSignedTransactions } = useTransactionStatus()
  const { nftsDelisted, nftsListed, nftsSold, nftsBought } = useDatabase()
  const wallet = useWallet()
  const { connection } = useConnection()
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  })
  const { nfts } = useNfts()
  const swapSdk = new TensorSwapSDK({ provider })
  const wlSdk = new TensorWhitelistSDK({ provider })

  async function getDelistInstructions(mints: string[]) {
    return (
      await Promise.all(
        mints.map(async (mint) => {
          const nft = nfts.find((n) => n.nftMint === mint) as Nft
          if (nft.listing?.marketplace === "TensorSwap") {
            const data = await swapSdk.delist({
              owner: wallet.publicKey!,
              nftMint: new PublicKey(mint),
              nftDest: toWeb3JsPublicKey(
                findAssociatedTokenPda(umi, {
                  owner: umi.identity.publicKey,
                  mint: publicKey(mint),
                })
              ),
            })

            const instructions = data.tx.ixs.map((instruction) => {
              return transactionBuilder().add({
                instruction: fromWeb3JsInstruction(instruction),
                bytesCreatedOnChain: 0,
                signers: [createSignerFromWalletAdapter(wallet)],
              })
            })

            return {
              instructions,
              mint,
            }
          } else {
            toast.error("Marketplace action not supported yet!")
          }
        })
      )
    ).filter(Boolean)
  }

  type ListingItem = {
    mint: string
    price: number
  }

  async function getListInstructions(items: ListingItem[]) {
    return await Promise.all(
      items.map(async (item) => {
        const data = await swapSdk.list({
          owner: wallet.publicKey!,
          nftMint: new PublicKey(item.mint),
          nftSource: toWeb3JsPublicKey(
            findAssociatedTokenPda(umi, {
              owner: umi.identity.publicKey,
              mint: publicKey(item.mint),
            })
          ),
          price: new BN(item.price * LAMPORTS_PER_SOL),
        })

        const instructions = data.tx.ixs.map((instruction) => {
          return transactionBuilder().add({
            instruction: fromWeb3JsInstruction(instruction),
            bytesCreatedOnChain: 0,
            signers: [createSignerFromWalletAdapter(wallet)],
          })
        })

        return {
          instructions,
          mint: item.mint,
        }
      })
    )
  }

  type SellItem = {
    pool: string
    mint: string
    price: number
    id: string
    type: "trade" | "token"
    royalties: boolean
    slug: string
  }

  type BuyItem = {
    maxPrice: number
    mint: string
    owner: string
    royalties: boolean
    marketplace: string
  }

  async function getBuyInstructions(items: BuyItem[]) {
    const blockhash = await umi.rpc.getLatestBlockhash()
    return flatten(
      await Promise.all(
        items.map(async (item) => {
          if (item.marketplace === "TensorSwap") {
            const { data } = await axios.post("/api/get-tensor-buy-txn", {
              buyer: base58PublicKey(umi.identity.publicKey),
              maxPrice: `${item.maxPrice}`,
              mint: item.mint,
              owner: item.owner,
              royalties: item.royalties,
            })

            const transactions = data.txs.map((t: any) => {
              if (t.txV0) {
                const txn = VersionedTransaction.deserialize(t.txV0.data)
                txn.message.recentBlockhash = blockhash.blockhash
                return fromWeb3JsTransaction(txn)
              } else {
                const txn = Transaction.from(t.tx.data)
                txn.recentBlockhash = blockhash.blockhash
                return fromWeb3JsLegacyTransaction(txn)
              }
            })

            return transactions.map((transaction: any) => {
              return {
                transaction,
                mint: item.mint,
              }
            })
          } else if (item.marketplace === "MEv2") {
            const { data } = await axios.post("/api/get-me-buy-txn", {
              buyer: base58PublicKey(umi.identity.publicKey),
              seller: item.owner,
              tokenMint: item.mint,
              royalties: item.royalties,
            })
            const transaction = fromWeb3JsTransaction(VersionedTransaction.deserialize(data.v0.txSigned.data))

            return {
              transaction,
              mint: item.mint,
            }
          } else {
            throw new Error("Marketplace not supported")
          }
        })
      )
    )
  }

  async function getSellInstructions(items: SellItem[]) {
    const blockhash = await umi.rpc.getLatestBlockhash()
    return flatten(
      await Promise.all(
        items.map(async (item) => {
          const { data } = await axios.post("/api/get-tensor-sell-txn", {
            seller: wallet.publicKey?.toBase58(),
            minPriceLamports: item.price,
            pool: item.pool,
            mint: item.mint,
            royalties: item.royalties,
          })

          const transactions = data.txs.map((t: any) => {
            if (t.txV0) {
              const txn = VersionedTransaction.deserialize(t.txV0.data)
              txn.message.recentBlockhash = blockhash.blockhash
              return fromWeb3JsTransaction(txn)
            } else {
              const txn = Transaction.from(t.tx.data)
              txn.recentBlockhash = blockhash.blockhash
              return fromWeb3JsLegacyTransaction(txn)
            }
          })

          return transactions.map((transaction: any) => {
            return {
              transaction,
              mint: item.mint,
            }
          })
        })
      )
    )
  }

  // async function getSellInstructions(items: SellItem[]) {
  //   console.log(items.filter((i) => i.type === "trade").length)
  //   return await Promise.all(
  //     items.map(async (item) => {
  //       const uuid = TensorWhitelistSDK.nameToBuffer(item.id.replaceAll("-", ""))
  //       const wlAddr = findWhitelistPDA({ uuid })[0]
  //       const wl = await wlSdk.fetchWhitelist(wlAddr)
  //       if (JSON.stringify(wl.rootHash) !== JSON.stringify(Array(32).fill(0))) {
  //         // todo
  //       }
  //       const nft = nfts.find((n) => n.nftMint === item.mint) as Nft
  //       const pool = await swapSdk.fetchPool(new PublicKey(item.pool))
  //       const data = await swapSdk.sellNft({
  //         type: item.type,
  //         whitelist: wlAddr,
  //         nftMint: new PublicKey(item.mint),
  //         owner: pool.owner,
  //         seller: wallet.publicKey!,
  //         config: pool.config,
  //         nftSellerAcc: toWeb3JsPublicKey(
  //           findAssociatedTokenPda(umi, {
  //             owner: umi.identity.publicKey,
  //             mint: publicKey(item.mint),
  //           })
  //         ),
  //         minPrice: new BN(item.price),
  //         optionalRoyaltyPct: item.royalties ? 100 : null,
  //         metaCreators: {
  //           metadata: toWeb3JsPublicKey(nft.metadata.publicKey),
  //           creators: unwrapSome(nft.metadata.creators)?.map((creator) => toWeb3JsPublicKey(creator.address))!,
  //         },
  //       })

  //       const instructions = data.tx.ixs.map((instruction) => {
  //         return transactionBuilder().add({
  //           instruction: fromWeb3JsInstruction(instruction),
  //           bytesCreatedOnChain: 0,
  //           signers: [createSignerFromWalletAdapter(wallet)],
  //         })
  //       })

  //       return {
  //         instructions,
  //         mint: item.mint,
  //       }
  //     })
  //   )
  // }

  // async function sellNow(items: SellItem[]) {
  //   try {
  //     const instructionGroups = await getSellInstructions(items)
  //     // const txns = await buildTransactions(
  //     //   umi,
  //     //   instructionGroups.map((item) => [item])
  //     // )

  //     const txns = await buildTransactions(
  //       umi,
  //       instructionGroups.map((group) => [group])
  //     )

  //     const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

  //     const { errs, successes } = await sendSignedTransactions(
  //       signedTransactions,
  //       txns.map((txn) => txn.mints),
  //       "sell",
  //       () => {}
  //     )
  //   } catch (err) {
  //     console.log(err)
  //   }
  // }

  async function sellNow(items: SellItem[]) {
    try {
      const txns = await getSellInstructions(items)

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.transaction))
      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((txn) => [txn.mint]),
        "sell",
        nftsSold
      )

      notifyStatus(errs, successes, "sell", "sold")
    } catch (err: any) {
      if (err instanceof AxiosError) {
        const message = err.response?.data
        if (message === "no active tswap pool found with address") {
          toast.error("Tensor pool data stale, refresh and try again")
        } else {
          toast.error(message)
        }
      } else {
        console.error(err)
        toast.error(err.message || "Error selling")
      }
    }
  }

  async function buy(items: BuyItem[]) {
    const txns = await getBuyInstructions(items)

    const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.transaction))
    const { errs, successes } = await sendSignedTransactions(
      signedTransactions,
      txns.map((txn) => [txn.mint]),
      "buy",
      nftsBought
    )

    notifyStatus(errs, successes, "buy", "bought")
  }

  async function delist(mints: string[]) {
    try {
      const byMarketplace = groupBy(mints, (mint) => {
        const nft = nfts.find((nft) => nft.nftMint === mint) as Nft
        return nft.listing?.marketplace
      })

      let txns: any[] = []

      if (byMarketplace.TensorSwap) {
        const instructionGroups = (await getDelistInstructions(byMarketplace.TensorSwap)) as InstructionSet[]
        // const chunks = getUmiChunks(umi, instructionGroups)

        const tensorTxns = await buildTransactions(
          umi,
          instructionGroups.map((group) => [group])
        )

        txns = [...txns, ...tensorTxns]
      }

      if (byMarketplace.MEv2) {
        const meTxns = await Promise.all(
          byMarketplace.MEv2.map(async (mint) => {
            const { data } = await axios.post("/api/get-me-delist-txn", {
              tokenMint: mint,
              seller: wallet.publicKey?.toBase58(),
            })

            const txn = fromWeb3JsTransaction(VersionedTransaction.deserialize(data.v0.txSigned.data))

            return {
              txn: txn,
              mints: [mint],
            }
          })
        )

        txns = [...txns, ...meTxns]
      }

      const signedTransactions = await umi.identity.signAllTransactions(flatten(txns.map((t) => t.txn)))
      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((txn) => txn.mints),
        "delist",
        nftsDelisted
      )

      notifyStatus(errs, successes, "delist", "delisted")
    } catch (err: any) {
      console.log(err)
      toast.error(err.message || "Error delisting")
    }
  }

  async function list(items: ListingItem[], marketplace = "tensor") {
    const listPromise = Promise.resolve().then(async () => {
      if (marketplace === "tensor") {
        const instructionGroups = await getListInstructions(items)
        // const chunks = getUmiChunks(umi, instructionGroups)

        const txns = await buildTransactions(
          umi,
          instructionGroups.map((group) => [group])
        )

        const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))
        const { errs, successes } = await sendSignedTransactions(
          signedTransactions,
          txns.map((txn) => txn.mints),
          "list",
          (mints: string[]) => nftsListed(mints, "TensorSwap")
        )
        notifyStatus(errs, successes, "list", "listed")
      } else if (marketplace === "me") {
        const txns = await Promise.all(
          items.map(async (item) => {
            const { data } = await axios.post("/api/get-me-list-txn", {
              tokenMint: item.mint,
              price: item.price,
              seller: wallet.publicKey?.toBase58(),
              tokenAccount: base58PublicKey(
                findAssociatedTokenPda(umi, {
                  mint: publicKey(item.mint),
                  owner: umi.identity.publicKey,
                })
              ),
            })

            const txn = fromWeb3JsTransaction(VersionedTransaction.deserialize(data.v0.txSigned.data))

            return {
              txn: txn,
              mints: [item.mint],
            }
          })
        )

        const signedTransactions = await umi.identity.signAllTransactions(flatten(txns.map((t) => t.txn)))
        const { errs, successes } = await sendSignedTransactions(
          signedTransactions,
          txns.map((txn) => txn.mints),
          "list",
          (mints: string[]) => nftsListed(mints, "MEv2")
        )

        notifyStatus(errs, successes, "list", "listed")
      } else {
        throw new Error("Marketplace not supported")
      }
    })

    toast.promise(listPromise, {
      loading: `Listing ${items.length} item${items.length === 1 ? "" : "s"}`,
      success: `Done`,
      error: "Error listing",
    })

    await listPromise
  }

  return <TensorContext.Provider value={{ delist, list, sellNow, buy }}>{children}</TensorContext.Provider>
}

export const useTensor = () => {
  return useContext(TensorContext)
}
