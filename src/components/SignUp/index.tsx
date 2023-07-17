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
    <Card sx={{ overflowY: "auto", height: fullScreen ? "100vh" : "auto" }}>
      <CardContent>
        <Stack spacing={2} justifyContent="center" alignItems="center">
          <Typography variant="h4" fontFamily="lato" fontWeight="bold">
            Biblio Premium
          </Typography>
          <Typography variant="h4" color="primary" fontFamily="lato" display="inline">
            {shorten(wallet.publicKey?.toBase58())}
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
      </CardContent>
    </Card>
  )
}
