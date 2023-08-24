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
import { useNfts } from "@/context/nfts"
import { useWallet } from "@solana/wallet-adapter-react"
import { AddressSelector } from "./AddressSelector"
import { useUmi } from "@/context/umi"
import { publicKey, sol, transactionBuilder, unwrapOption } from "@metaplex-foundation/umi"
import { useAccess } from "@/context/access"
import { fetchAllDigitalAsset, transferV1 } from "@metaplex-foundation/mpl-token-metadata"
import { closeToken, fetchToken, findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { buildTransactions, getUmiChunks, notifyStatus } from "@/helpers/transactions"
import { useTransactionStatus } from "@/context/transactions"
import { useDatabase } from "@/context/database"
import { toast } from "react-hot-toast"

export function BulkSend({ small }: { small?: boolean }) {
  const [bulkSendOpen, setBulkSendOpen] = useState(false)
  const { selected, setSelected, nonOwnedSelected, frozenSelected, statusesSelected } = useSelection()
  const [sending, setSending] = useState(false)
  const { isAdmin } = useAccess()
  const { sendSignedTransactions } = useTransactionStatus()
  const { updateOwnerForNfts } = useDatabase()
  const [recipient, setRecipient] = useState<any>(null)
  const wallet = useWallet()
  const umi = useUmi()

  function cancelSend() {
    toggleBulkSendOpen()
    setRecipient(null)
    setSelected([])
  }

  function toggleBulkSendOpen() {
    setBulkSendOpen(!bulkSendOpen)
  }

  async function bulkSend() {
    try {
      setSending(true)
      if (nonOwnedSelected) {
        throw new Error("Some selected items are owned by a linked wallet")
      }
      if (!recipient) {
        throw new Error("No recipient selected")
      }
      if (frozenSelected) {
        throw new Error("Frozen NFTs in selection")
      }

      const toSend = await fetchAllDigitalAsset(
        umi,
        selected.map((item) => publicKey(item))
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

          if (!isAdmin) {
            txn = txn.add(
              transferSol(umi, {
                destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                amount: sol(0.002),
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

      const chunks = getUmiChunks(umi, instructionSets)
      const txns = await buildTransactions(umi, chunks)

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

      setBulkSendOpen(false)

      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        "send",
        updateOwnerForNfts,
        recipient.publicKey
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
        <Button
          disabled={!selected.length || statusesSelected}
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
      ) : (
        <Tooltip
          title={
            nonOwnedSelected
              ? "Some selected items are owned by a linked wallet"
              : statusesSelected
              ? "Selection contains items that cannot be sent"
              : "Bulk send selected items"
          }
        >
          <span>
            <IconButton
              disabled={!selected.length || statusesSelected || nonOwnedSelected}
              onClick={toggleBulkSendOpen}
              color="primary"
            >
              <SvgIcon fontSize="small">
                <PlaneIcon />
              </SvgIcon>
            </IconButton>
          </span>
        </Tooltip>
      )}

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
    </>
  )
}
