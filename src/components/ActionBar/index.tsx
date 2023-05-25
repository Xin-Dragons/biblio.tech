import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { debounce, uniq, flatten, intersection } from "lodash"
import Link from "next/link"
import { FC, useEffect, useState } from "react"
import { useSelection } from "../../context/selection"
import StarIcon from "@mui/icons-material/Star"
import PlaneIcon from "./plane.svg"
import InfoIcon from "@mui/icons-material/Info"
import { useUiSettings } from "../../context/ui-settings"
import { useFilters } from "../../context/filters"
import ClearIcon from "@mui/icons-material/Clear"
import { chunkBy } from "chunkier"
import { Search } from "../Search"
import SellIcon from "@mui/icons-material/Sell"
import dynamic from "next/dynamic"
import SendIcon from "@mui/icons-material/Send"
import { AttachMoney, Label, LabelOff, LocalFireDepartment, Public, SmartphoneOutlined } from "@mui/icons-material"
import { toast } from "react-hot-toast"
import { useTags } from "../../context/tags"
import VaultIcon from "./vault.svg"
import { Connection, PublicKey } from "@solana/web3.js"
import { PublicKey as UmiPublicKey } from "@metaplex-foundation/umi"
import { useMetaplex } from "../../context/metaplex"
import { Metadata, toBigNumber } from "@metaplex-foundation/js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import FilterAltIcon from "@mui/icons-material/FilterAlt"
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff"
import LabelIcon from "@mui/icons-material/Label"
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  revoke,
} from "@solana/spl-token"
import {
  DigitalAsset,
  DigitalAssetWithToken,
  TokenStandard,
  burnNft,
  burnV1,
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetByMetadata,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithTokenByMint,
  fetchMasterEdition,
  fetchMetadata,
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
  isNonFungible,
  lockV1,
  revokeUtilityV1,
  transferV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../../context/umi"
import {
  Instruction,
  Transaction,
  TransactionBuilder,
  base58PublicKey,
  isSome,
  publicKey,
  signAllTransactions,
  some,
  transactionBuilder,
  unwrapSome,
} from "@metaplex-foundation/umi"
import { useTransactionStatus } from "../../context/transactions"
import { useDatabase } from "../../context/database"
import { useRouter } from "next/router"
import { shorten } from "../Item"
import { BN } from "bn.js"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { Collection, Nft } from "../../db"
import ImageIcon from "@mui/icons-material/Image"
import { TagList } from "../TagList"

export const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
)

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type ActionBarProps = {
  nfts: any
  filtered: any
}

export const ActionBar: FC<ActionBarProps> = ({ nfts = [], filtered }) => {
  const [showTags, setShowTags] = useState<boolean>(false)
  const [tagMenuOpen, setTagMenuOpen] = useState<boolean>(false)
  const router = useRouter()
  const wallet = useWallet()
  const { isAdmin } = useAccess()
  const { sortOptions } = useFilters()
  const { sort, setSort } = useUiSettings()
  const { showUntagged, setShowUntagged, showLoans, setShowLoans, showStarred, setShowStarred, selectedTags } =
    useFilters()
  const { selected, setSelected } = useSelection()
  const [collageOptions, setCollageOptions] = useState([])
  const [collageModalShowing, setCollageModalShowing] = useState(false)
  const [sending, setSending] = useState(false)
  const [recipentError, setRecipientError] = useState<string | null>(null)
  const metaplex = useMetaplex()
  const { connection } = useConnection()
  const umi = useUmi()
  const { deleteNfts, updateOwnerForNfts, addNftsToVault, removeNftsFromVault } = useDatabase()
  const { setTransactionInProgress, setTransactionErrors, setTransactionComplete, clearTransactions } =
    useTransactionStatus()

  const collectionPage = !router.query.tags && !router.query.filter && !router.query.collectionId

  const includeStarredControl = router.query.filter !== "starred"

  const includeUnlabeledIcon = router.query.tag !== "untagged"

  const includeLoansIcon = router.query.filter !== "loans"

  const selection = includeStarredControl

  const [recipient, setRecipient] = useState("")
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const [burnOpen, setBurnOpen] = useState(false)

  const selectedItems = selected
    .map((nftMint) => (filtered as any).find((f: any) => f.nftMint === nftMint))
    .filter(Boolean)
  const onlyNftsSelected = selectedItems.every((item: any) => {
    return [0, 3, 4].includes(unwrapSome(item.metadata.tokenStandard)!)
  })

  const frozenSelected = selectedItems.some((item: any) => ["frozen", "inVault", "staked"].includes(item.status))
  const allInVault = selectedItems.every((item: any) => item.status === "inVault")
  const noneInVault = selectedItems.every((item: any) => !["frozen", "inVault", "staked"].includes(item.status))

  const canFreezeThaw = allInVault || noneInVault

  const mints = filtered.map((n: any) => n.nftMint)

  function toggleTagMenuOpen() {
    setTagMenuOpen(!tagMenuOpen)
  }

  function isPublicKey(input: string) {
    try {
      new PublicKey(input)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!router.query.collectionId && !router.query.tag && !router.query.filter) {
      setShowTags(false)
    }
  }, [router.query])

  function toggleShowTags() {
    setShowTags(!showTags)
  }

  function toggleCollageModalShowing() {
    setCollageModalShowing(!collageModalShowing)
  }

  function toggleStarred() {
    setShowStarred(!showStarred)
  }

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

  // useEffect(() => {
  //   const options = [];
  //   const total = nfts.length;
  //   for (let rows = 1; rows <= total; rows++) {
  //     const cols = total / rows;
  //     const remainder = total - (Math.floor(cols) * rows);
  //     options.push([rows, Math.floor(cols), remainder])
  //   }

  //   setCollageOptions(options)
  // }, [nfts.length])

  // useEffect(() => {
  //   const items = selected.length || filtered.length
  //   const rows = Math.ceil(items / 3)
  //   const cols = Math.ceil(items / rows)
  //   console.log({ rows, cols })
  // }, [filtered, selected])

  async function exportCollage() {}

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
    setRecipient("")
    setSelected([])
  }

  function cancelBurn() {
    setSelected([])
    toggleBurnOpen()
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
            transactionBuilder([
              {
                instruction: fromWeb3JsInstruction(
                  createCloseAccountInstruction(
                    await getAssociatedTokenAddress(item.mintAddress, wallet.publicKey!),
                    wallet.publicKey!,
                    wallet.publicKey!
                  )
                ),
                signers: [umi.identity],
                bytesCreatedOnChain: 0,
              },
            ])
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

  console.log({ isAdmin, selection, collectionPage })

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
              const ata = await getAssociatedTokenAddress(
                toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                toWeb3JsPublicKey(umi.identity.publicKey)
              )

              const balance = await connection.getTokenAccountBalance(ata)
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

  return (
    <Stack direction="column">
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ padding: "0.5em 1em 0.5em 0" }}
      >
        <Stack spacing={2} direction="row" alignItems="center">
          {isAdmin && selection && !collectionPage ? (
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

              <IconButton
                onClick={toggleTagMenuOpen}
                color="secondary"
                disabled={!selected.length}
                sx={{
                  color: showTags ? "#111316" : "#9c27b0",
                  background: showTags ? "#9c27b0" : "default",
                  "&:hover": {
                    color: "#9c27b0",
                  },
                }}
              >
                <LabelIcon />
              </IconButton>
              {/* <IconButton onClick={toggleCollageModalShowing}>
                <ImageIcon />
              </IconButton> */}

              {!!selected.length && <Typography fontWeight="bold">{selected.length} Selected</Typography>}
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
        </Stack>
        <Stack spacing={2} direction="row" alignItems="center" sx={{ flexGrow: 1 }} justifyContent="flex-end">
          {filtered.length !== nfts.length && (
            <Typography fontWeight="bold">
              Showing {filtered.length} of {nfts.length}
            </Typography>
          )}

          {includeUnlabeledIcon && (
            <Tooltip title={showUntagged ? "Show all" : "Show only untagged"}>
              <IconButton onClick={() => setShowUntagged(!showUntagged)}>
                <LabelOff sx={{ color: showUntagged ? "#9c27b0" : "grey" }} />
              </IconButton>
            </Tooltip>
          )}

          {includeLoansIcon && (
            <Tooltip title={showLoans ? "Show all" : "Show items with outstanding loans"}>
              <IconButton onClick={() => setShowLoans(!showLoans)}>
                <AttachMoney sx={{ color: showLoans ? "primary.main" : "grey" }} />
              </IconButton>
            </Tooltip>
          )}

          {includeStarredControl && (
            <Tooltip title={showStarred ? "Show all" : "Show only starred"}>
              <IconButton onClick={toggleStarred}>
                <StarIcon
                  sx={{ opacity: showStarred ? 1 : 0.55, color: showStarred ? "#faaf00" : "inherit" }}
                  fontSize="inherit"
                />
              </IconButton>
            </Tooltip>
          )}
          <Search />
          <FormControl size="small">
            <InputLabel id="demo-simple-select-label">Sort</InputLabel>
            <Select
              labelId="demo-simple-select-label"
              id="demo-simple-select"
              value={sort}
              label="Age"
              onChange={(e) => setSort(e.target.value)}
              sx={{ fontSize: "14px", width: "100px" }}
            >
              {sortOptions.map((item, index) => (
                <MenuItem key={index} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <IconButton onClick={toggleShowTags}>
            {showTags ? <FilterAltOffIcon color="primary" /> : <FilterAltIcon color="primary" />}
          </IconButton>
        </Stack>
      </Stack>
      <Dialog open={tagMenuOpen} onClose={toggleTagMenuOpen}>
        <Card>
          <DialogTitle>Tag items</DialogTitle>
          <DialogContent>
            <TagList edit />
          </DialogContent>
        </Card>
      </Dialog>
      <Dialog open={collageModalShowing} onClose={toggleCollageModalShowing}>
        <Card>
          <DialogTitle>Export collage</DialogTitle>
          <DialogContent></DialogContent>
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
      <Stack direction="row" justifyContent="flex-end">
        <Box>{showTags && <TagList clip />}</Box>
      </Stack>
    </Stack>
  )
}
