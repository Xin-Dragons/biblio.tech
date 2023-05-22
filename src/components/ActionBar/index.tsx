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
import ImageIcon from "@mui/icons-material/Image"
import { useFilters } from "../../context/filters"
import ClearIcon from "@mui/icons-material/Clear"
import { chunkBy } from "chunkier"
import { Search } from "../Search"
import SellIcon from "@mui/icons-material/Sell"
import dynamic from "next/dynamic"
import SendIcon from "@mui/icons-material/Send"
import { LocalFireDepartment, Public, SmartphoneOutlined } from "@mui/icons-material"
import { toast } from "react-hot-toast"
import { useTags } from "../../context/tags"
import VaultIcon from "./vault.svg"
import { Connection, PublicKey } from "@solana/web3.js"
import { useMetaplex } from "../../context/metaplex"
import { Metadata, toBigNumber } from "@metaplex-foundation/js"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useAccess } from "../../context/access"
import { fromWeb3JsInstruction, fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import {
  createBurnInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
  revoke,
} from "@solana/spl-token"
import {
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
  const router = useRouter()
  const wallet = useWallet()
  const { isAdmin } = useAccess()
  const { showStarred, setShowStarred, showTags, setShowTags } = useUiSettings()
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

  const includeStarredControl = Boolean(router.query.filter || router.query.tag || router.query.collectionId)
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

  function isPublicKey(input: string) {
    try {
      new PublicKey(input)
      return true
    } catch {
      return false
    }
  }

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
    console.log(instructionSets)
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
        } catch (err) {
          console.log(err)
          setTransactionErrors(mints)
          await sleep(2000)

          clearTransactions(mints)
        }
      })
    )
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
          const instSet = []
          instSet.push(
            transferV1(umi, {
              destinationOwner: publicKey(recipient),
              mint: fromWeb3JsPublicKey(item.mintAddress),
              tokenStandard: item.tokenStandard!,
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
      console.log(chunks)
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

  async function burn() {
    try {
      toggleBurnOpen()
      if (frozenSelected) {
        throw new Error("Frozen NFTs selected")
      }
      const toBurn = await Promise.all(
        filtered
          .filter((n: any) => selected.includes(n.nftMint))
          .map(async (n: any) => {
            const digitalAsset = await fetchDigitalAssetWithAssociatedToken(
              umi,
              publicKey(n.nftMint),
              umi.identity.publicKey
            )

            let masterEditionMint
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
              console.log(base58PublicKey(masterEditionMint))
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
              token: isEdition ? digitalAsset.token.publicKey : undefined,
              tokenRecord: isEdition ? digitalAsset.tokenRecord?.publicKey : undefined,
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
              mint: n.nftMint,
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

      toast.success("Burned that shit")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
    }
  }

  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ padding: 1 }}>
      <Stack spacing={2} direction="row" alignItems="center">
        {isAdmin && selection ? (
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
            <Tooltip title="Show/hide tags menu">
              <span>
                <IconButton
                  onClick={toggleShowTags}
                  color="secondary"
                  sx={{
                    color: showTags ? "#111316" : "#9c27b0",
                    background: showTags ? "#9c27b0" : "default",
                    "&:hover": {
                      color: "#9c27b0",
                    },
                  }}
                >
                  <SellIcon />
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

            <Typography fontWeight="bold">{selected.length} Selected</Typography>
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

        {includeStarredControl && (
          <Tooltip title="Toggle favourites filter">
            <IconButton onClick={toggleStarred}>
              <StarIcon
                sx={{ opacity: showStarred ? 1 : 0.55, color: showStarred ? "#faaf00" : "inherit" }}
                fontSize="inherit"
              />
            </IconButton>
          </Tooltip>
        )}
        <Search />
      </Stack>
      <Dialog open={collageModalShowing} onClose={toggleCollageModalShowing} maxWidth="xl">
        <DialogTitle>Export collage</DialogTitle>
        <Stack spacing={2}>
          {collageOptions.map((option) => {
            let cols = option[1] + option[0] / (option[2] || 1)
            let factor = 1
            if (!Number.isInteger(cols)) {
              cols = cols * ++factor
              if (!Number.isInteger(cols)) {
                cols = cols * ++factor
                if (!Number.isInteger(cols)) {
                  cols = cols * ++factor
                  if (!Number.isInteger(cols)) {
                    cols = cols * ++factor
                    if (!Number.isInteger(cols)) {
                      cols = cols * ++factor
                    }
                  }
                }
              }
            }

            return (
              <Box
                sx={{
                  display: "grid",
                  gridGap: "2px",
                  gridTemplateColumns: new Array(parseInt(cols as any)).fill(`${10 / factor}px`).join(" "),
                }}
              >
                {Array.from(new Array(nfts.length).keys()).map((item, index) => {
                  return (
                    <Box
                      sx={{
                        backgroundColor: "red",
                        aspectRatio: "1 / 1",
                        gridColumn: option[2] && index === 0 ? `1 / ${3 * factor}` : "auto",
                        gridRow: option[2] && index === 0 ? `1 / ${3 * factor}` : "auto",
                      }}
                    />
                  )
                })}
              </Box>
            )
          })}
        </Stack>
      </Dialog>

      <Dialog open={bulkSendOpen} onClose={toggleBulkSendOpen}>
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
    </Stack>
  )
}
