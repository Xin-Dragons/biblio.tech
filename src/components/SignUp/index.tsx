import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Theme,
  Typography,
  useMediaQuery,
} from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import axios, { Axios, AxiosError } from "axios"
import { FC, useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { Transaction } from "@solana/web3.js"
import base58 from "bs58"
import { getCsrfToken, useSession } from "next-auth/react"
import { Selector } from "../Selector"
import { useDatabase } from "../../context/database"
import { SigninMessage } from "../../utils/SigninMessge"
import { addMemo } from "@metaplex-foundation/mpl-toolbox"
import { useUmi } from "../../context/umi"
import { shorten } from "../../helpers/utils"
import { useWallets } from "../../context/wallets"
import { useAccess } from "../../context/access"

export const SignUp: FC = () => {
  const { stakeNft } = useDatabase()
  const { data: session, status, update } = useSession()
  const [adding, setAdding] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const umi = useUmi()
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))
  const { signOut, signIn } = useAccess()

  useEffect(() => {
    const wallets = (session?.user?.wallets || []).map((wallet) => wallet.public_key) || []
    if (
      wallet.publicKey &&
      status === "authenticated" &&
      !wallets.includes(wallet.publicKey.toBase58()) &&
      !session.user?.offline
    ) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [session, wallet.publicKey, status])

  async function createAccount(mint: string) {
    try {
      if (!wallet.connected) {
        throw new Error("Wallet disconnected")
      }
      if (!mint) {
        throw new Error("No NFT selected")
      }
      setLoading(true)

      const createPromise = Promise.resolve().then(async () => {
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
      })

      toast.promise(createPromise, {
        loading: "Creating Biblio account...",
        success: "Biblio account created",
        error: "Error creating account",
      })

      await createPromise
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

      async function linkWallet() {
        if (isLedger) {
          try {
            const txn = await addMemo(umi, {
              memo: "Add wallet to Biblio",
            }).buildWithLatestBlockhash(umi)

            const signed = await umi.identity.signTransaction(txn)

            const result = await axios.post("/api/add-wallet", {
              publicKey: wallet.publicKey?.toBase58(),
              rawTransaction: base58.encode(umi.transactions.serialize(signed)),
              basePublicKey: session?.publicKey,
              isLedger,
            })
          } catch (err: any) {
            console.error(err)

            if (err.message.includes("Something went wrong")) {
              throw new Error(
                "Looks like the Solana app on your Ledger is out of date. Please update using the Ledger Live application and try again."
              )
            }

            if (err.message.includes("Cannot destructure property 'signature' of 'r' as it is undefined")) {
              throw new Error(
                'Unable to connect to Ledger, please make sure the device is unlocked with the Solana app open, and "Blind Signing" enabled'
              )
            }

            throw err
          }
        } else {
          const csrf = await getCsrfToken()
          if (!wallet.publicKey || !csrf || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey: wallet.publicKey?.toBase58(),
            statement: `Sign this message to sign in to Biblio.\n\n`,
            nonce: csrf,
          })

          const data = new TextEncoder().encode(message.prepare())
          const signature = await wallet.signMessage(data)
          const serializedSignature = base58.encode(signature)

          const result = await axios.post("/api/add-wallet", {
            message: JSON.stringify(message),
            signature: serializedSignature,
            publicKey: wallet.publicKey.toBase58(),
            basePublicKey: session?.publicKey,
          })
        }
      }

      const linkWalletPromise = linkWallet()

      toast.promise(linkWalletPromise, {
        loading: "Linking wallet",
        success: "Wallet linked",
        error: "Error linking wallet",
      })

      await linkWalletPromise

      await signOut()
      await signIn()
    } catch (err: any) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data || "Error linking wallet")
        return
      }
      console.log(err)
      toast.error(err.message)
    } finally {
      setAdding(false)
    }
  }

  const maxWallets =
    (session?.user?.nfts || [])
      .filter((item) => {
        if (!item || !item.active) {
          return false
        }
        if (!item.hours_active) {
          return true
        }

        const stakedHours = item.time_staked * 3600

        return stakedHours < item.hours_active
      })
      .reduce((sum, item) => sum + item.number_wallets, 0) || 0

  const linkedWallets = session?.user?.wallets?.length || 0

  const canLink = linkedWallets < maxWallets

  return (
    <Dialog open={isOpen} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <Card sx={{ overflowY: "auto", height: fullScreen ? "100vh" : "auto" }}>
        <CardContent>
          {session?.user?.id ? (
            <Stack spacing={2} justifyContent="center" alignItems="center">
              <Typography variant="h4">Add wallet - {shorten(wallet.publicKey?.toBase58())}</Typography>
              <Typography variant="h6">You are signed in as {shorten(session.publicKey)}</Typography>
              {!canLink ? (
                <Alert severity="error">
                  Your account only permits linking {maxWallets} wallet{maxWallets === 1 ? "" : "s"}
                </Alert>
              ) : (
                <Alert severity="info">
                  You can link {maxWallets - linkedWallets} more wallet{maxWallets - linkedWallets === 1 ? "" : "s"}
                </Alert>
              )}
              <FormControlLabel
                label="Using ledger?"
                control={<Switch value={isLedger} onChange={(e) => setIsLedger(e.target.checked)} />}
              />

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
