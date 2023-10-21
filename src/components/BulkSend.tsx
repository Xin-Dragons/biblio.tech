"use client"
import { useSelection } from "@/context/selection"
import {
  Tooltip,
  IconButton,
  SvgIcon,
  Button,
  Stack,
  Typography,
  Alert,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material"
import PlaneIcon from "@/../public/plane.svg"
import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { AddressSelector } from "./AddressSelector"
import { useUmi } from "@/context/umi"
import {
  PublicKey,
  TransactionBuilder,
  Umi,
  publicKey,
  sol,
  transactionBuilder,
  unwrapOption,
} from "@metaplex-foundation/umi"
// import { useAccess } from "@/context/access"
import { fetchAllDigitalAsset, transferV1 } from "@metaplex-foundation/mpl-token-metadata"
import { closeToken, fetchToken, findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { buildTransactions, getUmiChunks, notifyStatus } from "@/helpers/transactions"
import { useTransactionStatus } from "@/context/transactions"
import { toast } from "react-hot-toast"
import { partition } from "lodash"
import { transfer } from "@metaplex-foundation/mpl-bubblegum"
import { fetchAllDigitalAssetProofsByIds, fetchAllDigitalAssetsByIds } from "@/helpers/digital-assets"
import { DAS } from "helius-sdk"
import { publicKey as publicKeySerializer } from "@metaplex-foundation/umi/serializers"

import { MPL_BUBBLEGUM_PROGRAM_ID, TreeConfig } from "@metaplex-foundation/mpl-bubblegum"
import base58 from "bs58"
import { useOwnedAssets } from "@/context/owned-assets"
import { useAccess } from "@/context/access"
import { AccessLevel, FEES } from "@/constants"

function getBubblegumAuthorityPDA(umi: Umi, merkleTree: PublicKey) {
  const [bubblegumAuthorityPDAKey] = umi.eddsa.findPda(MPL_BUBBLEGUM_PROGRAM_ID, [
    publicKeySerializer().serialize(merkleTree),
  ])
  return bubblegumAuthorityPDAKey
}

function bufferToArray(buffer: Buffer): number[] {
  const nums = []
  for (let i = 0; i < buffer.length; i++) {
    nums.push(buffer[i])
  }
  return nums
}

export function BulkSend({ small }: { small?: boolean }) {
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const { selected } = useSelection()
  const { digitalAssets } = useOwnedAssets()
  const isAdmin = false
  const [sending, setSending] = useState(false)
  const { accessLevel } = useAccess()
  const { sendSignedTransactions } = useTransactionStatus()
  const [recipient, setRecipient] = useState<any>(null)
  const wallet = useWallet()
  const umi = useUmi()

  const selectedAssets = selected.map((id) => digitalAssets.find((d) => d.id === id)).filter(Boolean)
  const canSend = selectedAssets.every((da) => da?.status === "NONE")
  const disabled = !selected.length || !canSend

  function cancelSend() {
    toggleBulkSendOpen()
    setRecipient(null)
    // setSelected([])
  }

  function toggleBulkSendOpen() {
    setBulkSendOpen(!bulkSendOpen)
  }

  async function getInstructionsForCompressed(items: any, recipient: string) {
    const proofs = await fetchAllDigitalAssetProofsByIds(items.map((item) => item.id))
    const assets = await fetchAllDigitalAssetsByIds(items.map((item) => item.id))
    const txs = await Promise.all(
      assets.map(async (item) => {
        if (!item.compression) {
          throw new Error("Not a compressed item")
        }
        const proof = proofs[item.id] as DAS.GetAssetProofResponse

        let proofPath = proof.proof.map((node: string) => ({
          pubkey: publicKey(node),
          isSigner: false,
          isWritable: false,
        }))

        const treeAuthority = getBubblegumAuthorityPDA(umi, publicKey(proof.tree_id))

        const leafDelegate = item.ownership.delegate
          ? publicKey(item.ownership.delegate)
          : publicKey(item.ownership.owner)

        const leafNonce = item.compression!.leaf_id

        return {
          instructions: transfer(umi, {
            treeConfig: treeAuthority,
            leafOwner: umi.identity,
            leafDelegate,
            newLeafOwner: publicKey(recipient),
            merkleTree: publicKey(item.compression?.tree!),
            proof: proof.proof.map((item) => publicKey(item)),
            root: base58.decode(proof.root),
            dataHash: base58.decode(item.compression.data_hash.trim()),
            nonce: leafNonce,
            index: leafNonce,
            creatorHash: base58.decode(item.compression.creator_hash.trim()),
          }),
          mint: item.id,
        }
      })
    )

    return txs
  }

  async function bulkSend() {
    try {
      setSending(true)
      if (!recipient) {
        throw new Error("No recipient selected")
      }
      if (!canSend) {
        throw new Error("Some selected items cannot be sent")
      }
      const [compressed, normal] = partition(selectedAssets, (asset) => {
        return asset!.tokenStandard === -1
      })

      const compressedIxs = await getInstructionsForCompressed(compressed, recipient)

      const toSend = await fetchAllDigitalAsset(
        umi,
        normal.map((item) => publicKey(item.id))
      )

      const instructionSets = await Promise.all(
        toSend.map(async (item) => {
          let amount = BigInt(1)
          const ata = findAssociatedTokenPda(umi, {
            owner: umi.identity.publicKey,
            mint: item.publicKey,
          })
          if ([1, 2].includes(unwrapOption(item.metadata.tokenStandard) || 0)) {
            const token = await fetchToken(umi, ata)
            amount = token.amount
          }
          let txn = transactionBuilder()
          if (accessLevel !== AccessLevel.UNLIMITED) {
            const fee = FEES.SEND[accessLevel]
            txn = txn.add(
              transferSol(umi, {
                destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                amount: fee,
              })
            )
          }
          txn = txn.add(
            transferV1(umi, {
              destinationOwner: publicKey(recipient.publicKey),
              mint: item.publicKey,
              tokenStandard: unwrapOption(item.metadata.tokenStandard) || 0,
              amount,
            })
          )
          txn = txn.add(
            closeToken(umi, {
              account: ata,
              destination: umi.identity.publicKey,
              owner: umi.identity,
            })
          )
          return {
            instructions: txn,
            mint: item.publicKey,
          }
        })
      )
      const chunks = getUmiChunks(umi, [...instructionSets, ...compressedIxs])
      const txns = await buildTransactions(umi, chunks)
      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))
      setBulkSendOpen(false)
      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        "send",
        async (ids: string[]) =>
          Promise.all(
            digitalAssets.filter((da) => ids.includes(da.id)).map((da) => da.updateOwner(recipient.publicKey))
          )
      )
      notifyStatus(errs, successes, "send", "sent")
    } catch (err: any) {
      console.error(err.stack)
      toast.error(err.message)
    } finally {
      setRecipient("")
      setSending(false)
      setBulkSendOpen(false)
    }
  }

  return (
    <>
      {small ? (
        <Button disabled={disabled} onClick={toggleBulkSendOpen} fullWidth variant="contained" size="large">
          <Stack spacing={1} direction="row">
            <SvgIcon>
              <PlaneIcon />
            </SvgIcon>
            <Typography>Send selected</Typography>
          </Stack>
        </Button>
      ) : (
        <Tooltip
          title={
            canSend
              ? "Bulk send selected items"
              : selected.length
              ? "Some selected items cannot be sent"
              : "No items selected"
          }
        >
          <span>
            <Button disabled={disabled} onClick={toggleBulkSendOpen} color="primary" variant="outlined">
              <Stack direction="row" spacing={1} alignItems="center">
                <SvgIcon fontSize="small">
                  <PlaneIcon />
                </SvgIcon>
                <Typography textTransform="uppercase">Send</Typography>
              </Stack>
            </Button>
          </span>
        </Tooltip>
      )}

      <Dialog open={bulkSendOpen} onClose={toggleBulkSendOpen} fullWidth>
        <Card>
          <DialogTitle>Bulk send</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Alert severity="info">{/* Sending {selected.length} item{selected.length === 1 ? "" : "s"} */}</Alert>
              <AddressSelector wallet={recipient} setWallet={setRecipient} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelSend} color="error">
              Cancel
            </Button>
            <Button
              onClick={bulkSend}
              variant="contained"
              // disabled={!recipient || !selected.length}
            >
              Send
            </Button>
          </DialogActions>
        </Card>
      </Dialog>
    </>
  )
}
