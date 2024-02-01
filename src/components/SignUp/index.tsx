import { Alert, Button, Card, CardContent, Link, Stack, Theme, Typography, useMediaQuery } from "@mui/material"
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
import { addMemo } from "@metaplex-foundation/mpl-toolbox"
import { SigninMessage } from "../../utils/SigninMessge"
import { useRouter } from "next/router"

export function SignUp({ onClose }: { onClose: Function }) {
  const router = useRouter()
  const { user, nonce, refresh } = useAccess()
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()
  const { isLedger, setIsLedger } = useWallets()
  const umi = useUmi()
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  async function linkWallet() {
    if (isLedger) {
    } else {
    }
  }

  async function createAccount() {
    if (isLedger) {
      try {
        setLoading(true)
        const txn = await addMemo(umi, {
          memo: "Sign up to Biblio",
        }).buildWithLatestBlockhash(umi)

        const signed = await umi.identity.signTransaction(txn)

        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          rawTransaction: base58.encode(umi.transactions.serialize(signed)),
          isLedger,
        }

        const createPromise = axios.post("/api/create-user", params)

        toast.promise(createPromise, {
          loading: "Creating Biblio account...",
          success: "Biblio account created",
          error: "Error creating account",
        })

        await createPromise
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
      } finally {
        setLoading(false)
        refresh()
        router.push("/")
      }
    } else {
      try {
        if (!wallet.connected) {
          throw new Error("Wallet disconnected")
        }
        setLoading(true)

        if (!wallet.publicKey || !wallet.signMessage) return

        const message = new SigninMessage({
          domain: window.location.host,
          publicKey: wallet.publicKey.toBase58(),
          statement: `Sign this message to create new Biblio account.\n\n`,
          nonce,
        })

        const data = new TextEncoder().encode(message.prepare())
        const signature = await wallet.signMessage(data)
        const serializedSignature = base58.encode(signature)

        const createPromise = axios.post("/api/create-user", {
          message: JSON.stringify(message),
          signature: serializedSignature,
          publicKey: wallet.publicKey.toBase58(),
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
        refresh()
        onClose()
      }
    }
  }

  if (!wallet.publicKey) {
    return null
  }

  return (
    <Card sx={{ overflowY: "auto", height: fullScreen ? "100vh" : "auto" }}>
      <CardContent>
        <Stack spacing={2} justifyContent="center" alignItems="center">
          <Typography variant="h4" fontFamily="lato" fontWeight="bold">
            Create account
          </Typography>
          <Typography variant="h4" color="primary" fontFamily="lato" display="inline">
            {shorten(wallet.publicKey?.toBase58())}
          </Typography>
          <Typography textAlign="center">
            By creating an account you will be able to link multiple wallets and access features such as secure
            (mutli-wallet) locking, as well as tx fee discounts if you hold Dandies.
          </Typography>
          <Alert severity="info">
            We do not store any information about you or your holdings, the only data we store is the association of
            linked wallets. You can delete your account and these associations at any time.
          </Alert>
          <Button variant="contained" size="large" onClick={createAccount} disabled={loading || user.id}>
            Create account
          </Button>
          <Stack>
            <Typography variant="body2" textAlign="center">
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
