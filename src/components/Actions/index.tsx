import {
  TransactionBuilder,
  isPublicKey,
  isSome,
  publicKey,
  transactionBuilder,
  unwrapSome,
  type PublicKey as UmiPublicKey,
  Transaction,
} from "@metaplex-foundation/umi"
import {
  Stack,
  Button,
  Tooltip,
  IconButton,
  SvgIcon,
  Typography,
  Alert,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  useMediaQuery,
  Drawer,
  CardContent,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { shorten } from "../Item"
// import { createCloseAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token"
import { TagList } from "../TagList"

import VaultIcon from "./vault.svg"
import PlaneIcon from "./plane.svg"
import { Close, Image, Label, LocalFireDepartment } from "@mui/icons-material"
import { useAccess } from "../../context/access"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { PublicKey, Transaction as Web3Transaction } from "@solana/web3.js"
import { flatten, uniq } from "lodash"
import { toast } from "react-hot-toast"
import { chunkBy } from "chunkier"
import { useMetaplex } from "../../context/metaplex"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useUmi } from "../../context/umi"
import { useDatabase } from "../../context/database"
import { useTransactionStatus } from "../../context/transactions"
import { Metadata, toBigNumber } from "@metaplex-foundation/js"
import {
  DigitalAssetWithToken,
  TokenStandard,
  burnV1,
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetWithTokenByMint,
  findMetadataPda,
  lockV1,
  revokeUtilityV1,
  transferV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { Nft } from "../../db"
import { Connection } from "@solana/web3.js"
import { useRouter } from "next/router"
import PaidIcon from "@mui/icons-material/Paid"
import axios from "axios"
import { useSharky } from "../../context/sharky"
import { closeToken, findAssociatedTokenPda } from "@metaplex-foundation/mpl-essentials"

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const Actions: FC = () => {
  const { getRepayLoanInstructions } = useSharky()
  const { nfts, filtered } = useNfts()
  const { isAdmin } = useAccess()
  const { selected, setSelected } = useSelection()

  const [sending, setSending] = useState(false)
  const [tagMenuOpen, setTagMenuOpen] = useState<boolean>(false)
  const [recipient, setRecipient] = useState("")
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [burnOpen, setBurnOpen] = useState(false)

  const [recipentError, setRecipientError] = useState<string | null>(null)
  const metaplex = useMetaplex()
  const { connection } = useConnection()
  const [actionDrawerShowing, setActionDrawerShowing] = useState(false)

  const umi = useUmi()
  const wallet = useWallet()
  const router = useRouter()

  const showMinMenu = useMediaQuery("(max-width:1050px)")

  const { deleteNfts, updateOwnerForNfts, addNftsToVault, removeNftsFromVault } = useDatabase()
  const { setTransactionInProgress, setTransactionErrors, setTransactionComplete, clearTransactions } =
    useTransactionStatus()

  const selectedItems = selected
    .map((nftMint) => (filtered as any).find((f: any) => f.nftMint === nftMint))
    .filter(Boolean)
  const onlyNftsSelected = selectedItems.every((item: any) => {
    return [0, 3, 4].includes(unwrapSome(item.metadata.tokenStandard)!)
  })

  const frozenSelected = selectedItems.some((item: any) => ["frozen", "inVault", "staked"].includes(item.status))
  const allInVault = selectedItems.every((item: any) => item.status === "inVault")
  const noneInVault = selectedItems.every((item: any) => !["frozen", "inVault", "staked"].includes(item.status))

  const outstandingLoansSelected = selectedItems.some((item: Nft) => item.loan?.status === "active")
  const canFreezeThaw = allInVault || noneInVault

  const mints = filtered.map((n: any) => n.nftMint)

  function toggleTagMenuOpen() {
    setTagMenuOpen(!tagMenuOpen)
  }

  const collectionPage = !router.query.tag && !router.query.filter && !router.query.collectionId

  const allSelected = selected.length >= filtered.length

  useEffect(() => {
    if (!recipient) {
      setRecipientError(null)
      return
    }
    try {
      new PublicKey(recipient)
      setRecipientError(null)
    } catch {
      setRecipientError("Invalid recipient address")
    }
  }, [recipient])

  function selectAll() {
    setSelected((prevState: string[]) => {
      return uniq([...prevState, ...mints])
    })
  }

  function deselectAll() {
    setSelected([])
  }

  function toggleBurnOpen() {
    setBurnOpen(!burnOpen)
  }

  function toggleBulkSendOpen() {
    setBulkSendOpen(!bulkSendOpen)
  }

  function cancelSend() {
    toggleBulkSendOpen()
    setRecipient("")
    setSelected([])
  }

  function cancelBurn() {
    setSelected([])
    toggleBurnOpen()
  }

  function isPublicKey(input: string) {
    try {
      new PublicKey(input)
      return true
    } catch {
      return false
    }
  }

  type InstructionSet = {
    instructions: TransactionBuilder[]
    mint: string
  }

  function getUmiChunks(instructionSets: InstructionSet[]) {
    return chunkBy(instructionSets, (ch: InstructionSet[], i: number) => {
      if (!instructionSets[i + 1]) {
        return true
      }

      const t = transactionBuilder()
        .add(flatten(ch.map((c) => c.instructions)))
        .add(flatten(instructionSets[i + 1].instructions))

      return !t.fitsInOneTransaction(umi)
    })
  }

  async function sendSignedTransactions(
    signedTransactions: Transaction[],
    txnMints: string[][],
    type: string,
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

          const signature = await umi.rpc.sendTransaction(transaction)
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
            await sleep(2000)

            clearTransactions(mints)
            if (type === "burn") {
              await deleteNfts(mints)
            } else if (type === "freeze") {
              await addNftsToVault(mints)
            } else if (type === "thaw") {
              await removeNftsFromVault(mints)
            } else if (type === "send") {
              await updateOwnerForNfts(mints, recipient)
            }
          }
          successes = [...successes, ...mints]
        } catch (err) {
          console.error(err)
          setTransactionErrors(mints)
          successes = [...errs, ...mints]
          await sleep(2000)

          clearTransactions(mints)
        }
      })
    )

    const icons = {
      burn: "🔥",
      send: "✈️",
      freeze: "🔒",
      thaw: "🔓",
    }

    const pastTense = {
      burn: "burned",
      freeze: "frozen",
      thaw: "thawed",
      send: "sent",
    }

    if (errs.length && !successes.length) {
      toast.error(
        `Failed to ${type} ${errs.length} item${errs.length === 1 ? "" : "s"}. Check the console for more details`
      )
    } else if (errs.length && successes.length) {
      toast(
        `${successes.length} item${successes.length === 1 ? "" : "s"} ${
          pastTense[type as keyof object]
        } successfully, ${errs.length} failed to burn. Check the console for more details`
      )
    } else if (successes.length && !errs.length) {
      toast.success(
        `${successes.length} item${successes.length === 1 ? "" : "s"} ${pastTense[type as keyof object]} successfully`,
        {
          icon: icons[type as keyof object],
        }
      )
    }
  }

  async function bulkSend() {
    try {
      setSending(true)
      if (!recipient) {
        throw new Error("No recipient selected")
      }
      if (recipentError) {
        throw new Error(recipentError)
      }
      if (frozenSelected) {
        throw new Error("Frozen NFTs in selection")
      }

      const toSend = (await metaplex
        .nfts()
        .findAllByMintList({ mints: selected.map((s) => new PublicKey(s)) })) as Metadata[]

      const instructionSets = await Promise.all(
        toSend.map(async (item: Metadata) => {
          let amount = BigInt(1)
          if ([1, 2].includes(item.tokenStandard || 0)) {
            const ata = metaplex
              .tokens()
              .pdas()
              .associatedTokenAccount({ mint: item.mintAddress, owner: metaplex.identity().publicKey })

            const balance = await connection.getTokenAccountBalance(ata)
            amount = BigInt(balance.value.amount)
          }
          const instSet = []
          instSet.push(
            transferV1(umi, {
              destinationOwner: publicKey(recipient),
              mint: fromWeb3JsPublicKey(item.mintAddress),
              tokenStandard: item.tokenStandard!,
              amount,
            })
          )

          instSet.push(
            closeToken(umi, {
              account: findAssociatedTokenPda(umi, {
                mint: fromWeb3JsPublicKey(item.mintAddress),
                owner: umi.identity.publicKey,
              }),
              destination: umi.identity.publicKey,
              owner: umi.identity,
            })
          )

          return {
            instructions: flatten(instSet),
            mint: item.mintAddress.toBase58(),
          }
        })
      )

      const chunks = getUmiChunks(instructionSets)
      const txns = await Promise.all(
        chunks.map(async (builders) => {
          const txn = builders.reduce((t, item) => t.add(item.instructions), transactionBuilder())
          return {
            txn: await txn.buildWithLatestBlockhash(umi),
            mints: builders.map((b) => b.mint),
          }
        })
      )

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

      setBulkSendOpen(false)

      await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        "send",
        recipient
      )
    } catch (err: any) {
      console.log(err)
      toast.error(err.message)
    } finally {
      setRecipient("")
      setSending(false)
      setBulkSendOpen(false)
    }
  }

  // async function repayLoans() {
  //   try {
  //     if (!outstandingLoansSelected) {
  //       throw new Error("No outstanding loans in selection")
  //     }

  //     const instructionSets = await getRepayLoanInstructions(selected)
  //     const txn = new Web3Transaction().add(...instructionSets[0].instructions)
  //     txn.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  //     txn.feePayer = wallet.publicKey!

  //     const signed = await wallet.signTransaction?.(txn)
  //     // const chunks = getUmiChunks(instructionSets)

  //     // console.log(chunks)
  //     // const txns = await Promise.all(
  //     //   chunks.map(async (builders) => {
  //     //     const txn = builders.reduce((t, item) => t.add(item.instructions), transactionBuilder())
  //     //     return {
  //     //       txn: await txn.buildWithLatestBlockhash(umi),
  //     //       mints: builders.map((b) => b.mint),
  //     //     }
  //     //   })
  //     // )

  //     // const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

  //     // await sendSignedTransactions(
  //     //   signedTransactions,
  //     //   txns.map((t) => t.mints),
  //     //   "repayLoan"
  //     // )
  //   } catch (err: any) {
  //     toast.error(err.message)
  //     console.error(err)
  //   } finally {
  //   }
  // }

  async function lockUnlock() {
    try {
      if (!canFreezeThaw) {
        throw new Error("Cannot freeze and thaw in same transaction")
      }

      const instructionGroups = frozenSelected
        ? await Promise.all(
            selectedItems.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAsset(umi, publicKey(nft.nftMint))
              const instructions = []
              if (unwrapSome(digitalAsset.metadata.tokenStandard) === 4) {
                instructions.push(
                  unlockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                  })
                )
                instructions.push(
                  revokeUtilityV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    delegate: umi.identity.publicKey,
                  })
                )
              } else {
                instructions.push(
                  metaplex
                    .nfts()
                    .builders()
                    .thawDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: metaplex.identity(),
                      tokenOwner: metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )

                instructions.push(
                  metaplex
                    .tokens()
                    .builders()
                    .revokeDelegateAuthority({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      owner: metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )
              }
              return {
                instructions: flatten(instructions),
                mint: nft.nftMint,
              }
            })
          )
        : await Promise.all(
            selectedItems.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAsset(umi, publicKey(nft.nftMint))
              const instructions = []
              if (unwrapSome(digitalAsset.metadata.tokenStandard) === 4) {
                instructions.push(
                  delegateUtilityV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    delegate: umi.identity.publicKey,
                    authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                      ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                        ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                        : undefined
                      : undefined,
                  })
                )
                instructions.push(
                  lockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                  })
                )
              } else {
                instructions.push(
                  metaplex
                    .tokens()
                    .builders()
                    .approveDelegateAuthority({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )

                instructions.push(
                  metaplex
                    .nfts()
                    .builders()
                    .freezeDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: metaplex.identity(),
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )
              }

              return {
                instructions: flatten(instructions),
                mint: nft.nftMint,
              }
            })
          )

      const chunks = getUmiChunks(instructionGroups)
      const txns = await Promise.all(
        chunks.map(async (builders) => {
          const txn = builders.reduce((t, item) => t.add(item.instructions), transactionBuilder())
          return {
            txn: await txn.buildWithLatestBlockhash(umi),
            mints: builders.map((b) => b.mint),
          }
        })
      )

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

      await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        frozenSelected ? "thaw" : "freeze"
      )
    } catch (err) {
      console.log(err)
    } finally {
    }
  }

  async function burn() {
    try {
      toggleBurnOpen()
      if (frozenSelected) {
        throw new Error("Frozen NFTs selected")
      }
      const toBurn = await Promise.all(
        filtered
          .filter((n: any) => selected.includes(n.nftMint))
          .map(async (digitalAsset: Nft) => {
            let masterEditionMint: UmiPublicKey | undefined = undefined
            let masterEditionToken
            const isEdition =
              isSome(digitalAsset.metadata.tokenStandard) &&
              digitalAsset.metadata.tokenStandard.value === TokenStandard.NonFungibleEdition &&
              !digitalAsset.edition?.isOriginal
            if (isEdition) {
              const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!, { commitment: "confirmed" })
              const sigs = await connection.getSignaturesForAddress(
                toWeb3JsPublicKey(
                  !digitalAsset.edition?.isOriginal ? digitalAsset.edition?.parent! : digitalAsset.edition.publicKey
                )
              )
              const sig = sigs[sigs.length - 1]
              const txn = await connection.getTransaction(sig.signature)
              const key = txn?.transaction.message.accountKeys[1]!

              const masterEditionDigitalAsset = await fetchDigitalAssetWithTokenByMint(umi, fromWeb3JsPublicKey(key))
              masterEditionMint = masterEditionDigitalAsset.mint.publicKey
              masterEditionToken = masterEditionDigitalAsset.token.publicKey
            }

            let amount = BigInt(1)

            if (
              [TokenStandard.Fungible, TokenStandard.FungibleAsset].includes(
                unwrapSome(digitalAsset.metadata.tokenStandard)!
              )
            ) {
              const ata = findAssociatedTokenPda(umi, {
                mint: digitalAsset.mint.publicKey,
                owner: umi.identity.publicKey,
              })

              const balance = await connection.getTokenAccountBalance(toWeb3JsPublicKey(ata))
              amount = BigInt(balance.value.amount)
            }

            let digitalAssetWithToken: DigitalAssetWithToken | undefined = undefined
            const isNonFungible = [0, 3, 4, 5].includes(unwrapSome(digitalAsset.metadata.tokenStandard) || 0)
            if (isNonFungible) {
              digitalAssetWithToken = await fetchDigitalAssetWithTokenByMint(umi, digitalAsset.mint.publicKey)
            }

            const burnInstruction = burnV1(umi, {
              mint: digitalAsset.mint.publicKey,
              authority: umi.identity,
              tokenOwner: umi.identity.publicKey,
              tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                ? digitalAsset.metadata.tokenStandard.value
                : 0,
              metadata: digitalAsset.metadata.publicKey,
              collectionMetadata: isSome(digitalAsset.metadata.collection)
                ? findMetadataPda(umi, { mint: digitalAsset.metadata.collection.value.key })
                : undefined,
              edition: isEdition ? digitalAsset.edition?.publicKey : undefined,
              token: isNonFungible ? digitalAssetWithToken?.token?.publicKey : undefined,
              tokenRecord: isNonFungible ? digitalAssetWithToken?.tokenRecord?.publicKey : undefined,
              masterEdition: isEdition
                ? digitalAsset.edition?.isOriginal
                  ? digitalAsset.edition.publicKey
                  : digitalAsset.edition?.parent
                : undefined,
              masterEditionMint,
              masterEditionToken,
              amount,
              editionMarker:
                isEdition && masterEditionMint
                  ? fromWeb3JsPublicKey(
                      metaplex
                        .nfts()
                        .pdas()
                        .editionMarker({
                          mint: toWeb3JsPublicKey(masterEditionMint!),
                          edition: !digitalAsset.edition?.isOriginal
                            ? toBigNumber(digitalAsset.edition?.edition.toString()!)
                            : toBigNumber(0),
                        })
                    )
                  : undefined,
            })

            return {
              instructions: burnInstruction,
              mint: digitalAsset.nftMint,
            }
          })
      )

      const chunks = getUmiChunks(toBurn as any)
      const txns = await Promise.all(
        chunks.map(async (builders) => {
          const txn = builders.reduce((t, item) => t.add(item.instructions), transactionBuilder())
          return {
            txn: await txn.buildWithLatestBlockhash(umi),
            mints: builders.map((b) => b.mint),
          }
        })
      )

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

      setBurnOpen(false)

      await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        "burn"
      )
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
    }
  }

  function toggleActionDrawer() {
    setActionDrawerShowing(!actionDrawerShowing)
  }

  return (
    <Stack spacing={2} direction="row" alignItems="center">
      {isAdmin && !collectionPage ? (
        <>
          {!showMinMenu ? (
            <>
              <Button onClick={selectAll} disabled={!filtered.length || allSelected}>
                Select all
              </Button>
              <Button onClick={deselectAll} disabled={!filtered.length || !selected.length}>
                Deselect all
              </Button>
              <Tooltip title={frozenSelected ? "Selection contains frozen items" : "Bulk send selected items"}>
                <span>
                  <IconButton disabled={!selected.length || frozenSelected} onClick={toggleBulkSendOpen}>
                    <SvgIcon fontSize="small">
                      <PlaneIcon />
                    </SvgIcon>
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={frozenSelected ? "Selection contains frozen items" : "Burn selected items"}>
                <span>
                  <IconButton disabled={!selected.length || frozenSelected} color="error" onClick={toggleBurnOpen}>
                    <LocalFireDepartment />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  onlyNftsSelected
                    ? canFreezeThaw
                      ? frozenSelected
                        ? "Remove selected items from vault"
                        : "Add selected items to vault"
                      : "Cannot freeze and thaw in same transaction"
                    : "Only NFTs and pNFTs can be locked in the vault"
                }
              >
                <span>
                  <IconButton
                    disabled={!selected.length || !canFreezeThaw || !onlyNftsSelected}
                    sx={{
                      color: allInVault ? "#111316" : "#a6e3e0",
                      background: allInVault ? "#a6e3e0" : "default",
                      "&:hover": {
                        color: "#a6e3e0",
                      },
                    }}
                    onClick={lockUnlock}
                  >
                    <SvgIcon>
                      <VaultIcon />
                    </SvgIcon>
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Toggle tag menu">
                <span>
                  <IconButton onClick={toggleTagMenuOpen} color="secondary" disabled={!selected.length}>
                    <Label />
                  </IconButton>
                </span>
              </Tooltip>

              {/* <Tooltip title="Repay loans">
                <span>
                  <IconButton disabled={!outstandingLoansSelected} onClick={repayLoans}>
                    <PaidIcon />
                  </IconButton>
                </span>
              </Tooltip> */}
              {!!selected.length && <Typography fontWeight="bold">{selected.length} Selected</Typography>}
            </>
          ) : (
            <Button variant="outlined" onClick={toggleActionDrawer}>
              Actions
            </Button>
          )}
        </>
      ) : (
        router.query.publicKey && (
          <Typography variant="h5">{`Peeking in ${
            isPublicKey(router.query.publicKey as string)
              ? shorten(router.query.publicKey as string)
              : `${router.query.publicKey}.sol`
          }`}</Typography>
        )
      )}
      <Dialog open={tagMenuOpen} onClose={toggleTagMenuOpen}>
        <Card>
          <DialogTitle>Tag items</DialogTitle>
          <DialogContent>
            <TagList edit />
          </DialogContent>
        </Card>
      </Dialog>

      <Dialog open={bulkSendOpen} onClose={toggleBulkSendOpen}>
        <Card>
          <DialogTitle>Bulk send</DialogTitle>
          <DialogContent>
            <TextField
              label="Recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              sx={{ minWidth: "400px" }}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelSend} color="error">
              Cancel
            </Button>
            <Button onClick={bulkSend} variant="contained" disabled={!recipient || !selected.length}>
              Send
            </Button>
          </DialogActions>
        </Card>
      </Dialog>

      <Dialog open={burnOpen} onClose={toggleBurnOpen}>
        <Card>
          <DialogTitle>
            Burn {selected.length} item{selected.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogContent>
            <Alert severity="error">
              Burned items cannot be recovered. Please be sure you have selected the correct items!
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelBurn} color="error">
              Cancel
            </Button>
            <Button onClick={burn} variant="contained" disabled={!selected.length}>
              Burn
            </Button>
          </DialogActions>
        </Card>
      </Dialog>
      <Drawer open={actionDrawerShowing} onClose={toggleActionDrawer} anchor="bottom">
        <Card sx={{ minHeight: "50vh", overflowY: "auto" }}>
          <IconButton sx={{ position: "absolute", top: "0.5em", right: "0.5em" }} onClick={toggleActionDrawer}>
            <Close />
          </IconButton>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Selection</Typography>
              <Stack direction="row" spacing={2}>
                <Button onClick={selectAll} disabled={!filtered.length || allSelected} fullWidth variant="outlined">
                  Select all
                </Button>
                <Button
                  onClick={deselectAll}
                  disabled={!filtered.length || !selected.length}
                  fullWidth
                  variant="outlined"
                >
                  Deselect all
                </Button>
              </Stack>
              <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                Actions
              </Typography>
              <Stack direction={{ sm: "row", xs: "column" }} spacing={2} width="100%" sx={{ width: "100%" }}>
                {/* <Button onClick={toggleCollageModalShowing} disabled={!filtered.length} fullWidth variant="contained">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Image />
                    <Typography>Export collage</Typography>
                  </Stack>
                </Button> */}
                <Button
                  disabled={!selected.length || frozenSelected}
                  onClick={toggleBulkSendOpen}
                  fullWidth
                  variant="contained"
                  size="large"
                >
                  <Stack spacing={1} direction="row">
                    <SvgIcon>
                      <PlaneIcon />
                    </SvgIcon>
                    <Typography>Send selected</Typography>
                  </Stack>
                </Button>
                <Button
                  disabled={!selected.length || frozenSelected}
                  color="error"
                  onClick={toggleBurnOpen}
                  fullWidth
                  variant="contained"
                  size="large"
                >
                  <Stack direction="row" spacing={1}>
                    <LocalFireDepartment />
                    <Typography>Burn selected</Typography>
                  </Stack>
                </Button>
                <Button
                  disabled={!selected.length || !canFreezeThaw || !onlyNftsSelected}
                  onClick={lockUnlock}
                  fullWidth
                  variant="contained"
                  size="large"
                >
                  <Stack direction="row" spacing={1}>
                    <SvgIcon>
                      <VaultIcon />
                    </SvgIcon>
                    <Typography>{frozenSelected ? "Remove from vault" : "Add to vault"}</Typography>
                  </Stack>
                </Button>
              </Stack>
              <Typography variant="h6" fontWeight="bold" textTransform="uppercase">
                Tags
              </Typography>
              <TagList edit />
            </Stack>
          </CardContent>
        </Card>
      </Drawer>
    </Stack>
  )
}
