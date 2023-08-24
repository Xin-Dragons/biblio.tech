"use client"
import {
  Button,
  Card,
  CardContent,
  Dialog,
  IconButton,
  InputAdornment,
  Stack,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { FC, useEffect, useRef, useState } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { lamportsToSol } from "@/helpers/utils"
import Solana from "./Listing/solana.svg"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Close } from "@mui/icons-material"
import { toast } from "react-hot-toast"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { useUmi } from "@/context/umi"
import { publicKey, sol } from "@metaplex-foundation/umi"
import { AddressSelector } from "./AddressSelector"

type Wallet = {
  inputValue?: string
  publicKey?: string
  nickname?: string
}

export const SolTransfer: FC = () => {
  const [solTransferOpen, setSolTransferOpen] = useState(false)
  const [recipient, setRecipient] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState<string>("")
  const [amountError, setAmountError] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [sending, setSending] = useState(false)

  function toggleSolTransferOpen() {
    setSolTransferOpen(!solTransferOpen)
  }

  const wallet = useWallet()
  const { connection } = useConnection()
  const umi = useUmi()

  async function getBalance() {
    if (wallet.publicKey) {
      const balance = await connection.getBalance(wallet.publicKey)
      setBalance(balance)
    } else {
      setBalance(0)
    }
  }

  const interval = useRef<any>()

  useEffect(() => {
    clearInterval(interval.current)
    if (wallet.publicKey) {
      getBalance()
      interval.current = setInterval(getBalance, 1000)
    } else {
      setBalance(0)
      clearInterval(interval.current)
    }
    return () => {
      clearInterval(interval.current)
    }
  }, [wallet.publicKey])

  useEffect(() => {
    if (!amount) {
      setAmountError(null)
      return
    }
    try {
      const number = Number(amount)
      if (number) {
        setAmountError(null)
      } else {
        throw new Error("Invalid amount")
      }
    } catch {
      setAmountError("Invalid amount")
    }
  }, [amount])

  function setMax() {
    setAmount(`${(balance - 900000) / LAMPORTS_PER_SOL}`)
  }

  function setPercent(percent: number) {
    setAmount(`${((balance / 100) * percent) / LAMPORTS_PER_SOL}`)
  }

  function onCancel() {
    setRecipient(null)
    setAmount("")
    setSolTransferOpen(false)
  }

  async function send() {
    try {
      setSending(true)
      if (!recipient) {
        throw new Error("Recipient not set")
      }
      if (!recipient.publicKey) {
        throw new Error("Missing public key for recipient")
      }

      if (!amount) {
        throw new Error("Amount not set")
      }

      if (amountError) {
        throw new Error("Invalid amount")
      }

      const lamports = Number(amount) * LAMPORTS_PER_SOL

      if (!lamports) {
        throw new Error("invalid amount")
      }

      if (lamports > balance) {
        throw new Error("Insufficient balance")
      }

      const transferPromise = transferSol(umi, {
        source: umi.identity,
        destination: publicKey(recipient.publicKey),
        amount: sol(Number(amount)),
      }).sendAndConfirm(umi)

      toast.promise(transferPromise, {
        loading: "Sending SOL",
        success: "Done!",
        error: "Error sending",
      })

      await transferPromise

      setRecipient(null)
      setAmount("")
      getBalance()
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const canSend = !sending && amount && !amountError && recipient

  return (
    <Dialog open={solTransferOpen} onClose={toggleSolTransferOpen} fullWidth>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Transfer SOL</Typography>
            <Stack spacing={0.5}>
              <Stack justifyContent="flex-end" direction="row">
                <Button onClick={() => setPercent(10)} size="small">
                  10%
                </Button>
                <Button onClick={() => setPercent(25)} size="small">
                  25%
                </Button>
                <Button onClick={() => setPercent(50)} size="small">
                  50%
                </Button>
                <Button onClick={setMax} size="small">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <SvgIcon fontSize="inherit">
                      <Solana />
                    </SvgIcon>
                    <Typography variant="body2">{lamportsToSol(balance)} SOL</Typography>
                  </Stack>
                </Button>
              </Stack>
              <TextField
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={!!amountError}
                helperText={amountError}
                InputProps={{
                  endAdornment: amount && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        sx={{ padding: "4px", marginRight: "-7px" }}
                        onClick={() => setAmount("")}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            <AddressSelector wallet={recipient} setWallet={setRecipient} />
            <Stack direction="row" justifyContent="space-between">
              <Button onClick={onCancel} color="error" variant="outlined" disabled={sending}>
                Cancel
              </Button>
              <Button onClick={send} color="primary" disabled={!canSend} variant="contained">
                Transfer
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Dialog>
  )
}
