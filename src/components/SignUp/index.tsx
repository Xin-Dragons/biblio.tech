import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { FC, useEffect, useState } from "react"
import { shorten } from "../Item"
import { toast } from "react-hot-toast"
import { Transaction } from "@solana/web3.js"
import base58 from "bs58"
import { signOut, useSession } from "next-auth/react"
import { Selector } from "../Selector"
import { useDatabase } from "../../context/database"

export const SignUp: FC = () => {
  const { stakeNft } = useDatabase()
  const { data: session, status, update } = useSession()
  const [adding, setAdding] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()

  useEffect(() => {
    const wallets = (session?.user?.["biblio-wallets"] || []).map((wallet) => wallet.public_key) || []
    if (wallet.publicKey && status === "authenticated" && !wallets.includes(wallet.publicKey.toBase58())) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [session, wallet.publicKey])

  useEffect(() => {
    if (status !== "authenticated") {
      return
    }
    if (!wallet.publicKey || wallet.publicKey?.toBase58() !== session?.publicKey) {
      signOut({ redirect: false })
    }
  }, [wallet.publicKey])

  async function createAccount(mint: string) {
    try {
      if (!wallet.connected) {
        throw new Error("Wallet disconnected")
      }
      if (!mint) {
        throw new Error("No NFT selected")
      }
      setLoading(true)
      const params = {
        publicKey: wallet.publicKey?.toBase58(),
        mint,
      }
      const { data } = await axios.post("/api/create-user", params)
      if (data.resolved) {
        toast.success("Account created")
        return
      }

      const txn = Transaction.from(base58.decode(data.txn))
      const signed = (await wallet.signTransaction?.(txn)) as Transaction

      await axios.post("/api/send-create-user", {
        ...params,
        rawTransaction: base58.encode(signed.serialize()),
      })
      await stakeNft(mint)
      await update()
    } catch (err: any) {
      console.log(err)
      toast.error(err.response?.data?.message || err.message || "Error creating account")
    } finally {
      setLoading(false)
    }
  }

  if (!wallet.publicKey) {
    return null
  }

  async function signOutAndDisconnect() {
    await signOut({ redirect: false })
    wallet.disconnect()
    toast.success("Signed out")
  }

  async function addWallet() {
    try {
      setAdding(true)
    } catch (err: any) {
      console.log(err)
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  console.log({ session })

  const maxWallets = session?.user?.access_nft?.collection?.["biblio-collections"].number_wallets || 0
  const linkedWallets = session?.user?.["biblio-wallets"]?.length || 0

  const canLink = linkedWallets >= maxWallets

  return (
    <Dialog open={isOpen} fullWidth maxWidth="md">
      <Card>
        <CardContent>
          {session?.user?.id ? (
            <Stack spacing={2} justifyContent="center" alignItems="center">
              <Typography variant="h4">Add wallet - {shorten(wallet.publicKey?.toBase58())}</Typography>
              <Typography variant="h6">You are signed in as {shorten(session.publicKey)}</Typography>
              {!canLink && (
                <Alert severity="error">
                  Your account only permits linking {maxWallets} wallet{maxWallets === 1 ? "" : "s"}
                </Alert>
              )}

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" color="error" onClick={signOutAndDisconnect} disabled={adding}>
                  Sign out
                </Button>
                <Button disabled={adding || !canLink} variant="outlined" onClick={addWallet}>
                  Add wallet
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2} justifyContent="center" alignItems="center">
              <Typography variant="h4" fontFamily="lato" fontWeight="bold">
                Enter the Library -{" "}
                <Typography variant="h4" color="primary" fontFamily="lato" display="inline">
                  {shorten(wallet.publicKey?.toBase58())}
                </Typography>
              </Typography>
              <Selector onSubmit={createAccount} onCancel={() => wallet.disconnect()} loading={loading} />
              <Stack>
                <Typography variant="body2">
                  If you are trying to link an additional wallet to an existing account, please{" "}
                  <Button
                    component={Link}
                    onClick={() => wallet.disconnect()}
                    size="small"
                    target="_blank"
                    rel="noreferrer"
                  >
                    disconnect
                  </Button>{" "}
                  and reconnect with your main wallet.
                  <br />
                  You will be able to link additional wallets in your profile menu if your account type permits multiple
                  wallets
                </Typography>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Dialog>
  )
}
