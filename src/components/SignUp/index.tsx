import { Button, Card, CardContent, Link, Stack, Theme, Typography, useMediaQuery } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { FC, useState } from "react"
import { toast } from "react-hot-toast"
import { Transaction } from "@solana/web3.js"
import base58 from "bs58"
import { useUmi } from "../../context/umi"
import { shorten } from "../../helpers/utils"
import { useWallets } from "../../context/wallets"
import { useAccess } from "../../context/access"

export const SignUp: FC = () => {
  const { user } = useAccess()
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const umi = useUmi()
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))
  const { signOut, signIn } = useAccess()

  async function createAccount(mint: string) {
    try {
      if (!wallet.connected) {
        throw new Error("Wallet disconnected")
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

  const linkedWallets = user?.wallets?.length || 0

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
              You will be able to link additional wallets in your profile menu.
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
