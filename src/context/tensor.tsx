"use client"
import { AnchorProvider, BN, Wallet } from "@project-serum/anchor"
import { LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from "@solana/web3.js"
import { TensorSwapSDK } from "@tensor-oss/tensorswap-sdk"
import { TCompSDK } from "@tensor-oss/tcomp-sdk"
import * as Tcomp from "@tensor-oss/tcomp-sdk"
import { FC, ReactNode, createContext, useContext } from "react"
import { useUmi } from "./umi"
import { ConcurrentMerkleTreeAccount } from "@solana/spl-account-compression"
import {
  fromWeb3JsInstruction,
  fromWeb3JsLegacyTransaction,
  fromWeb3JsPublicKey,
  fromWeb3JsTransaction,
  toWeb3JsPublicKey,
} from "@metaplex-foundation/umi-web3js-adapters"
import { PublicKey } from "@solana/web3.js"
import { findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { publicKey, transactionBuilder, unwrapOption, Transaction as UmiTransaction } from "@metaplex-foundation/umi"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { flatten, groupBy, noop, uniq } from "lodash"
import { toast } from "react-hot-toast"
import { useTransactionStatus } from "./transactions"
import { Nft } from "../db"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { InstructionSet, buildTransactions, getUmiChunks, notifyStatus } from "../helpers/transactions"
import axios, { AxiosError } from "axios"
import { fetchAllDigitalAsset, fetchDigitalAsset, transferV1 } from "@metaplex-foundation/mpl-token-metadata"
import { NftListingStatus } from "@hellomoon/api"
import { DigitalAsset } from "@/app/models/DigitalAsset"
import { DAS } from "helius-sdk"
import { fetchAllDigitalAssetProofsByIds } from "@/helpers/digital-assets"
import {
  MerkleTree,
  fetchAllMerkleTree,
  getMerkleTreeSize,
  findLeafAssetIdPda,
  hashMetadata,
  getAssetWithProof,
} from "@metaplex-foundation/mpl-bubblegum"
import { getMEDelistInstructions } from "@/helpers/magic-eden-server-actions"

type SellItem = {
  pool: string
  mint: string
  price: number
  id: string
  type: "trade" | "token"
  royalties: boolean
  slug: string
}

type ListingItem = {
  mint: string
  price: number
}

export const TensorContext = createContext<
  | {
      delist(digitalAssets: DigitalAsset[], deslistTo?: string): Promise<void>
      list(items: ListingItem[]): Promise<void>
      sellNow(items: SellItem[]): Promise<void>
      buy(items: DigitalAsset[]): Promise<void>
    }
  | undefined
>(undefined)

export const TensorProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const umi = useUmi()
  const { sendSignedTransactions } = useTransactionStatus()
  // const { nftsDelisted, nftsListed, nftsSold, nftsBought } = useDatabase()
  const wallet = useWallet()
  const { connection } = useConnection()
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  })
  const swapSdk = new TensorSwapSDK({ provider })
  const tcompSdk = new TCompSDK({ provider })

  async function getDelistInstructions(das: DigitalAsset[]) {
    return (
      await Promise.all(
        das.map(async (da) => {
          if (da.listing?.marketplace === "TENSOR") {
            const data = await swapSdk.delist({
              owner: wallet.publicKey!,
              nftMint: new PublicKey(da.id),
              nftDest: toWeb3JsPublicKey(
                findAssociatedTokenPda(umi, {
                  owner: umi.identity.publicKey,
                  mint: publicKey(da.id),
                })[0]
              ),
            })

            let txn = transactionBuilder()

            data.tx.ixs.map((instruction) => {
              txn = txn.add({
                instruction: fromWeb3JsInstruction(instruction),
                bytesCreatedOnChain: 0,
                signers: [createSignerFromWalletAdapter(wallet)],
              })
            })

            return {
              instructions: txn,
              mint: da.id,
            }
          } else {
            toast.error("Marketplace action not supported yet!")
          }
        })
      )
    ).filter(Boolean)
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
            })[0]
          ),
          price: new BN(item.price * LAMPORTS_PER_SOL),
        })

        let txn = transactionBuilder()

        data.tx.ixs.forEach((instruction) => {
          txn = txn.add({
            instruction: fromWeb3JsInstruction(instruction),
            bytesCreatedOnChain: 0,
            signers: [createSignerFromWalletAdapter(wallet)],
          })
        })

        return {
          instructions: txn,
          mint: item.mint,
        }
      })
    )
  }

  async function getBuyInstructions(items: DigitalAsset[]) {
    try {
      const blockhash = await umi.rpc.getLatestBlockhash()
      const toFetchProof = items.filter((item) => item.isCompressed)

      let proofs: Record<string, DAS.GetAssetProofResponse> = {}
      let trees: MerkleTree[] = []
      if (toFetchProof.length) {
        proofs = await fetchAllDigitalAssetProofsByIds(toFetchProof.map((item) => item.id))
        const treeIds = uniq(toFetchProof.filter((t) => t.compression?.tree).map((t) => t.compression?.tree))
        trees = await fetchAllMerkleTree(
          umi,
          treeIds.map((t) => publicKey(t as string))
        )
      }

      return flatten(
        await Promise.all(
          items.map(async (item) => {
            console.log(item)
            if (["TENSOR"].includes(item.listing!.marketplace)) {
              try {
                if (item.isCompressed) {
                  const proof = proofs[item.id]
                  const tree = trees.find((t) => t.publicKey === proof.tree_id)
                  const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(
                    connection,
                    toWeb3JsPublicKey(tree?.publicKey!)
                  )

                  const asset = await getAssetWithProof(umi, publicKey(item.id))

                  // console.log(item.compression?.tree)
                  // console.log(proof.tree_id)

                  const assetId = toWeb3JsPublicKey(
                    findLeafAssetIdPda(umi, {
                      merkleTree: publicKey(proof.tree_id),
                      leafIndex: asset.index,
                    })[0]
                  )

                  const [listState] = Tcomp.findListStatePda({ assetId })

                  console.log(listState)
                  const acc = await umi.rpc.getAccount(fromWeb3JsPublicKey(listState))
                  console.log(acc)

                  const canopyDepth = treeAccount.getCanopyDepth()

                  console.log(proof.proof, asset.proof)

                  // const {
                  //   tx: { ixs },
                  // } = await tcompSdk.buy({
                  //   merkleTree: toWeb3JsPublicKey(asset.merkleTree),
                  //   root: Array.from(asset.root),
                  //   canopyDepth,
                  //   index: asset.index,
                  //   proof: asset.proof.map((p) => toWeb3JsPublicKey(p).toBuffer()),
                  //   sellerFeeBasisPoints: asset.metadata.sellerFeeBasisPoints,
                  //   // metaHash: Buffer.from(hashMetadata(asset.metadata)),
                  //   metaHash: Buffer.from(asset.dataHash),
                  //   creators: asset.metadata.creators.map((c) => {
                  //     return {
                  //       ...c,
                  //       address: toWeb3JsPublicKey(c.address),
                  //     }
                  //   }),
                  //   buyer: toWeb3JsPublicKey(umi.identity.publicKey),
                  //   owner: new PublicKey(item.owner!),
                  //   maxAmount: new BN(item.listing?.price!),
                  //   optionalRoyaltyPct: 100,
                  // })

                  // const buyTx = new Transaction().add(...ixs)
                  // buyTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
                  // buyTx.feePayer = toWeb3JsPublicKey(umi.identity.publicKey)
                  // const transaction = fromWeb3JsLegacyTransaction(buyTx)
                  // return {
                  //   transaction,
                  //   mint: item.id,
                  // }
                } else {
                  const {
                    tx: { ixs },
                  } = await swapSdk.buySingleListing({
                    nftMint: new PublicKey(item.id),
                    nftBuyerAcc: toWeb3JsPublicKey(
                      findAssociatedTokenPda(umi, {
                        mint: publicKey(item.id),
                        owner: umi.identity.publicKey,
                      })[0]
                    ),
                    owner: new PublicKey(item.listing?.seller!),
                    buyer: toWeb3JsPublicKey(umi.identity.publicKey),
                    maxPrice: new BN(item.listing?.price!),
                    optionalRoyaltyPct: 100,
                  })

                  const buyTx = new Transaction().add(...ixs)
                  buyTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
                  buyTx.feePayer = toWeb3JsPublicKey(umi.identity.publicKey)
                  const transaction = fromWeb3JsLegacyTransaction(buyTx)
                  return {
                    transaction,
                    mint: item.id,
                  }
                }
              } catch (err) {
                console.log(err)
              }
              // const {
              //   tx: { ixs },
              // } = await swapSdk.buyNft({
              //   // Whitelist PDA address where name = tensor slug (see TensorWhitelistSDK.nameToBuffer)
              //   whitelist: TensorWhitelistSDK.nameToBuffer(),
              //   // NFT Mint address
              //   nftMint,
              //   // Buyer ATA account (destination)
              //   nftBuyerAcc,
              //   // owner of NFT (in pool PDA)
              //   owner,
              //   // buyer
              //   buyer,
              //   // PoolConfig object: construct from pool PDA
              //   config,
              //   // max price buyer is willing to pay (add ~0.1% for exponential pools b/c of rounding differences)
              //   // see `computeTakerPrice` above to get the current price
              //   maxPrice
              // });
              // const buyTx = new Transaction(...ixs);
              // const { data } = await axios.post("/api/get-tensor-buy-txn", {
              //   buyer: umi.identity.publicKey,
              //   maxPrice: `${item.maxPrice}`,
              //   mint: item.mint,
              //   owner: item.owner,
              //   royalties: item.royalties,
              // })

              // const transactions = data.txs.map((t: any) => {
              //   if (t.txV0) {
              //     const txn = VersionedTransaction.deserialize(t.txV0.data)
              //     txn.message.recentBlockhash = blockhash.blockhash
              //     return fromWeb3JsTransaction(txn)
              //   } else {
              //     const txn = Transaction.from(t.tx.data)
              //     txn.recentBlockhash = blockhash.blockhash
              //     return fromWeb3JsLegacyTransaction(txn)
              //   }
              // })

              // return transactions.map((transaction: any) => {
              //   return {
              //     transaction,
              //     mint: item.mint,
              //   }
              // })
            } else if (item.listing?.marketplace === "ME") {
              const { data } = await axios.post("/api/get-me-buy-txn", {
                buyer: umi.identity.publicKey,
                seller: item.owner,
                tokenMint: item.id,
                royalties: 100,
              })
              const transaction = fromWeb3JsTransaction(VersionedTransaction.deserialize(data.v0.txSigned.data))

              return {
                transaction,
                mint: item.id,
              }
            } else {
              console.log(item)
              throw new Error("Marketplace not supported")
            }
          })
        )
      )
    } catch (err) {
      console.log(err)
    }
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
        "sell"
        // nftsSold
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

  async function buy(items: DigitalAsset[]) {
    const txns = await getBuyInstructions(items)

    if (!txns) {
      return
    }

    const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t!.transaction))
    const { errs, successes } = await sendSignedTransactions(
      signedTransactions,
      txns.map((txn) => [txn!.mint]),
      "buy"
      // nftsBought
    )

    notifyStatus(errs, successes, "buy", "bought")
  }

  async function delist(digitalAssets: DigitalAsset[], delistTo?: string) {
    try {
      const byMarketplace = groupBy(digitalAssets, (da) => {
        return da.listing?.marketplace
      })

      let txns: any[] = []

      if (byMarketplace.TENSOR) {
        const instructionGroups = (await getDelistInstructions(byMarketplace.TENSOR)) as InstructionSet[]
        // const chunks = getUmiChunks(umi, instructionGroups)

        const tensorTxns = await buildTransactions(
          umi,
          instructionGroups.map((group) => [group])
        )

        txns = [...txns, ...tensorTxns]
      }

      if (byMarketplace.ME) {
        const meTxns = await Promise.all(
          byMarketplace.ME.map(async (mint) => {
            const data = await getMEDelistInstructions(mint.id, wallet.publicKey!.toBase58())

            if (!data) {
              throw new Error("Unable to get delist instructions. Is this item already delisted?")
            }

            const txn = fromWeb3JsTransaction(VersionedTransaction.deserialize(data.v0.txSigned.data))

            return {
              txn: txn,
              mints: [mint.id],
            }
          })
        )

        txns = [...txns, ...meTxns]
      }

      let rescueTxns: UmiTransaction[] = []
      if (delistTo) {
        const das = await fetchAllDigitalAsset(
          umi,
          digitalAssets.map((da) => publicKey(da.id))
        )
        let builder = transactionBuilder()
        das.forEach(async (da) => {
          builder = builder.add(
            transferV1(umi, {
              mint: da.publicKey,
              destinationOwner: publicKey(delistTo),
              tokenStandard: unwrapOption(da.metadata.tokenStandard) || 0,
            })
          )
        })

        const txs = await Promise.all(
          builder.unsafeSplitByTransactionSize(umi).map((tx) => tx.buildWithLatestBlockhash(umi))
        )

        rescueTxns = txs
      }

      const signedTransactions = await umi.identity.signAllTransactions([
        ...flatten(txns.map((t) => t.txn)),
        ...rescueTxns,
      ])

      const { errs, successes } = await sendSignedTransactions(
        signedTransactions.slice(0, txns.length),
        txns.map((txn) => txn.mints),
        "delist",
        async (ids: string[]) => Promise.all(digitalAssets.filter((da) => ids.includes(da.id)).map((da) => da.delist()))
      )

      if (rescueTxns.length) {
        const signed = signedTransactions.slice(txns.length)
        await Promise.all(
          signed.map(async (s) => {
            const sig = await umi.rpc.sendTransaction(s)
            const conf = await umi.rpc.confirmTransaction(sig, {
              strategy: {
                type: "blockhash",
                ...(await umi.rpc.getLatestBlockhash()),
              },
            })

            if (conf.value.err) {
              toast.error(
                "Error transferring delisted asset. If you are using secure delist you will need to secure this asset manually"
              )
            }
          })
        )
      }

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
          "list"
          // (mints: string[]) => nftsListed(mints, "TensorSwap")
        )
        notifyStatus(errs, successes, "list", "listed")
      } else if (marketplace === "me") {
        const txns = await Promise.all(
          items.map(async (item) => {
            const { data } = await axios.post("/api/get-me-list-txn", {
              tokenMint: item.mint,
              price: item.price,
              seller: wallet.publicKey?.toBase58(),
              tokenAccount: findAssociatedTokenPda(umi, {
                mint: publicKey(item.mint),
                owner: umi.identity.publicKey,
              }),
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
          "list"
          // (mints: string[]) => nftsListed(mints, "MEv2")
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
  const context = useContext(TensorContext)

  if (context === undefined) {
    throw new Error("useTensor must be used in a TensorProvider")
  }

  return context
}
