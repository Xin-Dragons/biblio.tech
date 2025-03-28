import {
  TransactionBuilder,
  isPublicKey,
  isSome,
  publicKey,
  transactionBuilder,
  unwrapSome,
  type PublicKey as UmiPublicKey,
  Transaction,
  isNone,
  sol,
  unwrapOption,
  createNoopSigner,
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
  TableBody,
  TableRow,
  Table,
  TableCell,
  Theme,
  Slider,
  Tabs,
  Tab,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
// import { createCloseAccountInstruction, getAssociatedTokenAddress } from "@solana/spl-token"
import { TagList } from "../TagList"

import VaultIcon from "./vault.svg"
import PlaneIcon from "./plane.svg"
import { Close, CoPresentOutlined, Image, Label, LocalFireDepartment, Receipt, Sell } from "@mui/icons-material"
import { useAccess } from "../../context/access"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { PublicKey, Transaction as Web3Transaction } from "@solana/web3.js"
import { compact, flatten, uniq } from "lodash"
import { toast } from "react-hot-toast"
import { chunkBy } from "chunkier"
import { useMetaplex } from "../../context/metaplex"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useUmi } from "../../context/umi"
import { useDatabase } from "../../context/database"
import { useTransactionStatus } from "../../context/transactions"
import { Metadata, toBigNumber } from "@metaplex-foundation/js"
import { ConcurrentMerkleTreeAccount } from "@solana/spl-account-compression"
import { burn as burnNifty, fetchAsset, transfer as transferNifty } from "@nifty-oss/asset"
import {
  MPL_CORE_PROGRAM_ID,
  burnV1 as burnCore,
  fetchAssetV1,
  transferV1 as transferCore,
} from "@metaplex-foundation/mpl-core"
import {
  DigitalAssetWithToken,
  TokenStandard,
  burnV1,
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetWithTokenByMint,
  findMasterEditionPda,
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
import { useSharky } from "../../context/sharky"
import {
  SPL_TOKEN_PROGRAM_ID,
  closeToken,
  createLutForTransactionBuilder,
  fetchToken,
  findAssociatedTokenPda,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox"
import { buildTransactions, getUmiChunks, notifyStatus, packTx, signAllTransactions } from "../../helpers/transactions"
import { Listing } from "../Listing"
import { useTensor } from "../../context/tensor"
import { getAddressType, shorten } from "../../helpers/utils"
import { AddressSelector } from "../AddressSelector"
import { Vault } from "../Vault"
import { useEnsName } from "wagmi"
import { useUiSettings } from "../../context/ui-settings"
import { SecureDelist } from "../SecureDelist"
import { getDigitalAssets } from "../../helpers/helius"
import { useWalletBypass } from "../../context/wallet-bypass"
import { burn, getAssetWithProof, transfer } from "@metaplex-foundation/mpl-bubblegum"
import base58 from "bs58"
import { getFee } from "../NftTool/helpers/utils"
import { usePriorityFees } from "../../context/priority-fees"
import { ASSET_PROGRAM_ID } from "@nifty-oss/asset"

const WalletPeek: FC<{ address: string }> = ({ address }) => {
  const router = useRouter()
  // const { data: ensName } = useEnsName({ address })
  // const [displayName, setDisplayName] = useState(ensName || shorten(address))
  // const type = getAddressType(address)

  // useEffect(() => {
  // ;(async () => {})()
  // }, [address])

  return (
    <Stack direction="row" spacing={1} alignItems="center" maxWidth="100%">
      <Typography
        variant="h6"
        color="primary"
        fontWeight="bold"
        sx={{
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden",
          fontSize: {
            xs: "18px",
          },
        }}
      >{`Peeking in ${shorten(address)}`}</Typography>
      <Tooltip title="Return home">
        <IconButton onClick={() => router.push("/")}>
          <Close />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}

export const Actions: FC = () => {
  const { feeLevel } = usePriorityFees()
  const { nfts } = useNfts()
  const [recipient, setRecipient] = useState<any>(null)
  const [listOpen, setListOpen] = useState(false)
  const { setBypassWallet } = useWalletBypass()
  const { delist } = useTensor()
  const { filtered } = useNfts()
  const { isInScope, account } = useAccess()
  const { selected, setSelected } = useSelection()
  const { loanType, setLoanType } = useUiSettings()
  const [delistOpen, setDelistOpen] = useState(false)

  function toggleDelist() {
    setDelistOpen(!delistOpen)
  }

  const [sending, setSending] = useState(false)
  const [tagMenuOpen, setTagMenuOpen] = useState<boolean>(false)
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [burnOpen, setBurnOpen] = useState(false)

  const metaplex = useMetaplex()
  const { connection } = useConnection()
  const [actionDrawerShowing, setActionDrawerShowing] = useState(false)

  const umi = useUmi()
  const wallet = useWallet()
  const router = useRouter()

  const showMinMenu = useMediaQuery("(max-width:1050px)")

  const { deleteNfts, updateOwnerForNfts } = useDatabase()
  const { sendSignedTransactions } = useTransactionStatus()

  const selectedItems = selected.map((nftMint) => filtered.find((f) => f.nftMint === nftMint)).filter(Boolean) as Nft[]

  const onlyNftsSelected = selectedItems.every((item) => {
    return [0, 3, 4, 6, 7].includes(item?.metadata.tokenStandard)
  })

  const frozenSelected = selectedItems.some(
    (item) => item?.status && ["frozen", "inVault", "staked", "listed"].includes(item?.status)
  )
  const statusesSelected = selectedItems.some((item) => item?.status)
  const nonInVaultStatusesSelected = selectedItems.some((item) => item?.status && item?.status !== "inVault")
  const compressedSelected = selectedItems.some((item) => item?.compression?.compressed)
  const nonListedStatusSelected = selectedItems.some((item) => item?.status && item?.status !== "listed")
  const nextGenSelected = selectedItems.some((item) => [6, 7].includes(item.metadata.tokenStandard))
  const allInVault = selectedItems.every((item: any) => item?.status === "inVault")
  const noneInVault = selectedItems.every(
    (item: any) => !["frozen", "inVault", "staked", "listed"].includes(item?.status)
  )
  const nonOwnedSelected = selectedItems.some((item) => {
    return item?.owner !== wallet.publicKey?.toBase58() && item?.delegate !== wallet.publicKey?.toBase58()
  })

  const [vaultShowing, setVaultShowing] = useState(false)

  const canFreezeThaw = allInVault || noneInVault

  const allListed = selectedItems.every((item) => item?.status === "listed")
  const allDelisted = selectedItems.every((item) => !item?.status)
  const listedSelected = selectedItems.some((item) => item?.status === "listed")

  const canList = allListed || allDelisted

  const mints = filtered.map((n: any) => n.nftMint)

  function toggleTagMenuOpen() {
    setTagMenuOpen(!tagMenuOpen)
  }

  function toggleListOpen() {
    setListOpen(!listOpen)
  }

  function toggleVaultShowing() {
    setVaultShowing(!vaultShowing)
  }

  const collectionPage = !router.query.tag && !router.query.filter && !router.query.collectionId

  const allSelected = selected.length >= filtered.length

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
    setRecipient(null)
    setSelected([])
  }

  function cancelBurn() {
    setSelected([])
    toggleBurnOpen()
  }

  async function bulkSend() {
    try {
      setSending(true)
      if (!recipient) {
        throw new Error("No recipient selected")
      }
      if (frozenSelected) {
        throw new Error("Frozen NFTs in selection")
      }

      const toSend = nfts.filter((n) => selected.includes(n.nftMint))

      const promise = Promise.resolve().then(async () => {
        let tx = transactionBuilder().add(
          await Promise.all(
            toSend.map(async (item: Nft) => {
              const pk = publicKey(item.nftMint)
              const acc = await umi.rpc.getAccount(pk)
              const fee = getFee("biblio.send", account)
              if (acc.exists && acc.owner === SPL_TOKEN_PROGRAM_ID) {
                if (
                  ![
                    TokenStandard.NonFungible,
                    TokenStandard.NonFungibleEdition,
                    TokenStandard.ProgrammableNonFungible,
                    TokenStandard.ProgrammableNonFungibleEdition,
                  ].includes(item.metadata.tokenStandard)
                ) {
                  throw new Error("Cannot bulk send fungibles")
                }

                if (item.compression?.compressed) {
                  const assetWithProof = await getAssetWithProof(umi, publicKey(item.id))
                  let sliceIndex = assetWithProof.proof.length

                  const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(
                    connection,
                    new PublicKey(item.compression.tree)
                  )

                  const canopyDepth = treeAccount.getCanopyDepth()

                  if (canopyDepth) {
                    sliceIndex = assetWithProof.proof.length - canopyDepth
                  }
                  sliceIndex = Math.min(sliceIndex, 22)

                  const proof = assetWithProof.proof.slice(0, sliceIndex)
                  return transfer(umi, {
                    ...assetWithProof,
                    proof,
                    leafOwner: publicKey(assetWithProof.leafOwner),
                    newLeafOwner: publicKey(recipient),
                  })
                } else {
                  const mint = publicKey(item.id)
                  const destinationOwner = publicKey(recipient.publicKey)
                  const owner = publicKey(item.ownership.owner)

                  const token = findAssociatedTokenPda(umi, {
                    mint,
                    owner,
                  })

                  return transferV1(umi, {
                    destinationToken: findAssociatedTokenPda(umi, {
                      mint,
                      owner: destinationOwner,
                    }),
                    destinationOwner,
                    mint,
                    tokenStandard: item.metadata.tokenStandard,
                    token,
                    tokenOwner: owner,
                    amount: 1,
                    authority: createNoopSigner(owner),
                  })
                    .add(
                      closeToken(umi, {
                        account: token,
                        destination: umi.identity.publicKey,
                        owner: createNoopSigner(owner),
                      })
                    )
                    .add(
                      fee > 0
                        ? transferSol(umi, {
                            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                            amount: sol(fee),
                          })
                        : transactionBuilder()
                    )
                }
              } else if (acc.exists && acc.owner === ASSET_PROGRAM_ID) {
                const asset = await fetchAsset(umi, pk)
                return transferNifty(umi, {
                  asset: pk,
                  recipient: publicKey(recipient),
                  group: asset.group || undefined,
                }).add(
                  fee > 0
                    ? transferSol(umi, {
                        destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                        amount: sol(fee),
                      })
                    : transactionBuilder()
                )
              } else if (acc.exists && acc.owner === MPL_CORE_PROGRAM_ID) {
                const asset = await fetchAssetV1(umi, pk)
                return transferCore(umi, {
                  asset: asset.publicKey,
                  newOwner: publicKey(recipient),
                  collection: asset.updateAuthority.type === "Collection" ? asset.updateAuthority.address : undefined,
                }).add(
                  fee > 0
                    ? transferSol(umi, {
                        destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                        amount: sol(fee),
                      })
                    : transactionBuilder()
                )
              } else {
                return transactionBuilder()
              }
            })
          )
        )

        const { chunks, txFee } = await packTx(umi, tx, feeLevel)
        const signed = await Promise.all(chunks.map((c) => c.buildAndSign(umi)))

        const { errs, successes } = await sendSignedTransactions(
          signed,
          "send",
          updateOwnerForNfts,
          recipient.publicKey
        )

        // return await sendAllTxsWithRetries(umi, program.provider.connection, signed, txFee ? 1 : 0)
      })

      setBulkSendOpen(false)

      toast.promise(promise, {
        loading: "Transferring assets",
        success: "Assets transferred successfully",
        error: "Error transferring assets",
      })

      await promise
    } catch (err: any) {
      console.error(err.stack)
      toast.error(err.message)
    } finally {
      setBypassWallet(false)
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

  async function burnNfts() {
    try {
      toggleBurnOpen()
      if (frozenSelected) {
        throw new Error("Frozen NFTs selected")
      }
      if (nonOwnedSelected) {
        throw new Error("Some selected items are owned by a linked wallet")
      }
      const promise = Promise.resolve().then(async () => {
        const fee = getFee(`biblio.burn-non-fungible`, account)
        let tx = transactionBuilder().add(
          await Promise.all(
            filtered
              .filter((n: Nft) => selected.includes(n.nftMint))
              // .filter((n: Nft) => !n.compression?.compressed)
              .map(async (item: Nft) => {
                if (item.compression?.compressed) {
                  const assetWithProof = await getAssetWithProof(umi, publicKey(item.id))
                  let sliceIndex = assetWithProof.proof.length

                  const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(
                    connection,
                    new PublicKey(item.compression.tree)
                  )

                  const canopyDepth = treeAccount.getCanopyDepth()

                  if (canopyDepth) {
                    sliceIndex = assetWithProof.proof.length - canopyDepth
                  }

                  sliceIndex = Math.min(sliceIndex, 22)

                  const proof = assetWithProof.proof.slice(0, sliceIndex)

                  return burn(umi, {
                    ...assetWithProof,
                    proof,
                    leafOwner: publicKey(item.ownership.owner),
                  }).add(
                    fee > 0
                      ? transferSol(umi, {
                          destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                          amount: sol(fee),
                        })
                      : transactionBuilder()
                  )
                } else {
                  const pk = publicKey(item.nftMint)
                  const acc = await umi.rpc.getAccount(pk)
                  if (acc.exists && acc.owner === SPL_TOKEN_PROGRAM_ID) {
                    const digitalAsset = await fetchDigitalAsset(umi, pk)
                    const tokenStandard = unwrapOption(digitalAsset.metadata.tokenStandard)
                    let masterEditionMint: UmiPublicKey | undefined = undefined
                    let masterEditionToken
                    const isEdition =
                      isSome(digitalAsset.metadata.tokenStandard) &&
                      digitalAsset.metadata.tokenStandard.value === TokenStandard.NonFungibleEdition &&
                      !digitalAsset.edition?.isOriginal
                    if (isEdition) {
                      const masterEditionPda = findMasterEditionPda(umi, {
                        mint: digitalAsset.publicKey,
                      })
                      // const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!, { commitment: "confirmed" })
                      // const sigs = await connection.getSignaturesForAddress(
                      //   toWeb3JsPublicKey(
                      //     !digitalAsset.edition?.isOriginal ? digitalAsset.edition?.parent! : digitalAsset.edition.publicKey
                      //   )
                      // )
                      // const sig = sigs[sigs.length - 1]
                      // const txn = await connection.getTransaction(sig.signature)
                      // const key = txn?.transaction.message.accountKeys[1]!

                      // console.log("Hi")

                      const masterEditionDigitalAsset = await fetchDigitalAssetWithTokenByMint(umi, masterEditionPda[0])
                      masterEditionMint = masterEditionDigitalAsset.mint.publicKey
                      masterEditionToken = masterEditionDigitalAsset.token.publicKey
                    }
                    let amount = BigInt(1)

                    if ([TokenStandard.Fungible, TokenStandard.FungibleAsset].includes(tokenStandard || 0)) {
                      const ata = findAssociatedTokenPda(umi, {
                        mint: digitalAsset.mint.publicKey,
                        owner: umi.identity.publicKey,
                      })

                      const balance = await connection.getTokenAccountBalance(toWeb3JsPublicKey(ata[0]))
                      amount = BigInt(balance.value.amount)
                    }

                    let digitalAssetWithToken: DigitalAssetWithToken | undefined = undefined
                    const isNonFungible = [0, 3, 4, 5].includes(unwrapSome(digitalAsset.metadata.tokenStandard) || 0)
                    if (isNonFungible) {
                      digitalAssetWithToken = await fetchDigitalAssetWithTokenByMint(umi, digitalAsset.mint.publicKey)
                    }
                    return burnV1(umi, {
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
                    }).add(
                      fee > 0
                        ? transferSol(umi, {
                            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                            amount: sol(fee),
                          })
                        : transactionBuilder()
                    )
                  } else if (acc.exists && acc.owner === ASSET_PROGRAM_ID) {
                    const asset = await fetchAsset(umi, pk)
                    return burnNifty(umi, {
                      asset: pk,
                      signer: umi.identity,
                      group: asset.group || undefined,
                    }).add(
                      fee > 0
                        ? transferSol(umi, {
                            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                            amount: sol(fee),
                          })
                        : transactionBuilder()
                    )
                  } else if (acc.exists && acc.owner === MPL_CORE_PROGRAM_ID) {
                    const asset = await fetchAssetV1(umi, pk)
                    return burnCore(umi, {
                      asset: pk,
                      collection:
                        asset.updateAuthority.type === "Collection" ? asset.updateAuthority.address : undefined,
                    }).add(
                      fee > 0
                        ? transferSol(umi, {
                            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                            amount: sol(fee),
                          })
                        : transactionBuilder()
                    )
                  } else {
                    return transactionBuilder()
                  }
                }
              })
          )
        )

        const { chunks, txFee } = await packTx(umi, tx, feeLevel)
        const signed = await Promise.all(chunks.map((c) => c.buildAndSign(umi)))

        const { errs, successes } = await sendSignedTransactions(signed, "burn", deleteNfts, txFee ? 1 : 0)
      })

      setBurnOpen(false)

      toast.promise(promise, {
        loading: "Burning assets",
        success: "Assets burned",
        error: "Error burning assets",
      })

      await promise
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
    }
  }

  async function list() {
    try {
      if (nonOwnedSelected) {
        throw new Error("Some selected items are owned by a linked wallet")
      }
      if (selected.length > 20) {
        throw new Error("List only supported for up to 20 items")
      }
      toggleListOpen()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function toggleActionDrawer() {
    setActionDrawerShowing(!actionDrawerShowing)
  }
  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  function handleSelectionChange(value: number) {
    setSelected(filtered.slice(0, value).map((item) => item.nftMint))
  }

  const isDisabled = !isInScope

  return (
    <Stack spacing={2}>
      <Stack spacing={1} direction="row" alignItems="center" sx={{ maxWidth: "100%", overflow: "hidden" }}>
        {router.query.publicKey && <WalletPeek address={router.query.publicKey as string} />}
        {router.query.filter === "loans" && (
          <Tabs value={loanType} onChange={(e, value) => setLoanType(value)}>
            <Tab label="Borrowed" value="borrowed" />
            <Tab label="Lent" value="lent" />
          </Tabs>
        )}
        {!isInScope && !router.query.publicKey && router.query.filter === "vault" && (
          <Tooltip
            title={
              compressedSelected
                ? "Compressed items cannot be vaulted"
                : nonOwnedSelected
                ? "Some selected items are owned by or delegated to linked wallet"
                : nonInVaultStatusesSelected
                ? "Selection contains items that cannot be frozen/thawed"
                : onlyNftsSelected
                ? canFreezeThaw
                  ? nfts.some((n) => n.status === "inVault")
                    ? "Remove selected items from vault"
                    : "Login to add items to vault"
                  : "Cannot freeze and thaw in same transaction"
                : "Only NFTs and pNFTs can be locked in the vault"
            }
          >
            <span>
              <IconButton
                disabled={!nfts.length || Boolean(nfts.some((n: Nft) => n.status !== "inVault")) || compressedSelected}
                sx={{
                  color: "#a6e3e0",
                }}
                onClick={() => toggleVaultShowing()}
              >
                <SvgIcon>
                  <VaultIcon />
                </SvgIcon>
              </IconButton>
            </span>
          </Tooltip>
        )}
        {isInScope && !collectionPage && (
          <>
            {!showMinMenu ? (
              <>
                <Button
                  onClick={selectAll}
                  disabled={!filtered.length || allSelected || isDisabled}
                  size="small"
                  variant="outlined"
                >
                  Select all
                </Button>
                <Button
                  onClick={deselectAll}
                  disabled={!filtered.length || !selected.length || isDisabled}
                  size="small"
                  variant="outlined"
                >
                  Deselect all
                </Button>
                {router.query.filter !== "loans" && (
                  <>
                    <Tooltip
                      title={
                        statusesSelected ? "Selection contains items that cannot be sent" : "Bulk send selected items"
                      }
                    >
                      <span>
                        <IconButton
                          disabled={!selected.length || statusesSelected || isDisabled}
                          onClick={toggleBulkSendOpen}
                          color="primary"
                        >
                          <SvgIcon fontSize="small">
                            <PlaneIcon />
                          </SvgIcon>
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title={
                        nonOwnedSelected
                          ? "Some selected items are owned by a linked wallet"
                          : statusesSelected
                          ? "Selection contains items that cannot be burnt"
                          : "Burn selected items"
                      }
                    >
                      <span>
                        <IconButton
                          disabled={!selected.length || statusesSelected || nonOwnedSelected || isDisabled}
                          color="error"
                          onClick={toggleBurnOpen}
                        >
                          <LocalFireDepartment />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip
                      title={
                        nextGenSelected
                          ? "Next gen assets cannot be listed via biblio (yet)"
                          : nonOwnedSelected
                          ? "Some selected items are owned by a linked wallet"
                          : nonListedStatusSelected
                          ? "Selection contains items that cannot be listed"
                          : onlyNftsSelected
                          ? canList
                            ? listedSelected
                              ? "Delist selected items"
                              : "List selected items"
                            : "Cannot list and delist in same transaction"
                          : "Only NFTs and pNFTs can be listed"
                      }
                    >
                      <span>
                        <IconButton
                          disabled={
                            !selected.length ||
                            nonListedStatusSelected ||
                            nextGenSelected ||
                            !canList ||
                            compressedSelected ||
                            !onlyNftsSelected ||
                            nonOwnedSelected ||
                            isDisabled
                          }
                          color="info"
                          onClick={listedSelected ? toggleDelist : list}
                        >
                          <Sell />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip
                      title={
                        compressedSelected
                          ? "Compressed NFTs cannot be vaulted"
                          : nonInVaultStatusesSelected
                          ? "Selection contains items that cannot be frozen/thawed"
                          : onlyNftsSelected
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
                          disabled={
                            !selected.length ||
                            !canFreezeThaw ||
                            !onlyNftsSelected ||
                            nonInVaultStatusesSelected ||
                            compressedSelected ||
                            isDisabled
                          }
                          sx={{
                            color: "#a6e3e0",
                          }}
                          onClick={() => toggleVaultShowing()}
                        >
                          <SvgIcon>
                            <VaultIcon />
                          </SvgIcon>
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Toggle tag menu">
                      <span>
                        <IconButton
                          onClick={toggleTagMenuOpen}
                          color="secondary"
                          disabled={!selected.length || isDisabled}
                        >
                          <Label />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                )}

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
              <Button variant="outlined" onClick={toggleActionDrawer} disabled={isDisabled}>
                Actions
              </Button>
            )}
          </>
        )}
        <Dialog open={tagMenuOpen} onClose={toggleTagMenuOpen}>
          <Card>
            <DialogTitle>Tag items</DialogTitle>
            <DialogContent>
              <TagList edit />
            </DialogContent>
          </Card>
        </Dialog>

        <Dialog open={bulkSendOpen} onClose={toggleBulkSendOpen} fullWidth>
          <Card>
            <DialogTitle>Bulk send</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Alert severity="info">
                  Sending {selected.length} item{selected.length === 1 ? "" : "s"}
                </Alert>
                <AddressSelector wallet={recipient} setWallet={setRecipient} />
              </Stack>
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
              <Button onClick={burnNfts} variant="contained" disabled={!selected.length}>
                Burn
              </Button>
            </DialogActions>
          </Card>
        </Dialog>

        <Dialog open={listOpen} onClose={toggleListOpen} fullWidth maxWidth="md" fullScreen={isXs}>
          <Card sx={{ overflowY: "auto", height: "100vh" }}>
            <Listing items={selectedItems} onClose={toggleListOpen} />
          </Card>
        </Dialog>

        <Dialog open={vaultShowing} onClose={toggleVaultShowing} fullWidth maxWidth="md">
          <Card sx={{ overflowY: "auto" }}>
            <Vault onClose={() => setVaultShowing(false)} />
          </Card>
        </Dialog>

        <Dialog open={delistOpen} onClose={toggleDelist} fullWidth maxWidth="md">
          <Card sx={{ overflowY: "auto" }}>
            <SecureDelist onDismiss={toggleDelist} />
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
                <Stack>
                  {/* <Slider
                    aria-label="Selection"
                    value={selected.length}
                    onChange={(e, value) => handleSelectionChange(value as number)}
                    max={filtered.length}
                  /> */}
                  <Typography textAlign="right">{selected.length} selected</Typography>
                </Stack>
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
                    disabled={!selected.length || !canFreezeThaw || !onlyNftsSelected || compressedSelected}
                    onClick={() => toggleVaultShowing()}
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
                  <Button
                    disabled={
                      !selected.length ||
                      nonListedStatusSelected ||
                      nextGenSelected ||
                      !canList ||
                      !onlyNftsSelected ||
                      nonOwnedSelected ||
                      compressedSelected ||
                      selected.length > 20
                    }
                    onClick={listedSelected ? toggleDelist : list}
                    variant="contained"
                    size="large"
                    fullWidth
                  >
                    <Stack direction="row" spacing={1}>
                      <Sell />
                      <Typography>Sell / List selected</Typography>
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
    </Stack>
  )
}
