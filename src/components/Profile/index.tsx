import { Box, Button, Card, CardContent, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material"
import { FC, useEffect, useState } from "react"
import { shorten } from "../Item"
import { useMetaplex } from "../../context/metaplex"
import { PublicKey, Transaction } from "@solana/web3.js"
import { toast } from "react-hot-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import base58 from "bs58"
import { Selector } from "../Selector"
import { useSession } from "next-auth/react"
import { useDatabase } from "../../context/database"
import { User } from "../../../nextauth"

type ProfileProps = {
  user: User
  publicKey: string
  onClose: Function
}

export const Profile: FC<ProfileProps> = ({ user, publicKey, onClose }) => {
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const { stakeNft, unstakeNft } = useDatabase()
  const wallet = useWallet()

  async function unlinkNft() {
    try {
      setLoading(true)
      async function unlink() {
        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          mint: user.access_nft.mint,
        }
        const { data } = await axios.post("/api/unlock-nft", params)
        if (data.resolved) {
          toast.success("NFT unlinked")
          return
        }
        const txn = Transaction.from(base58.decode(data.txn))
        const signed = await wallet?.signTransaction?.(txn)
        await axios.post("/api/send-unlock-nft", {
          ...params,
          rawTransaction: base58.encode(signed?.serialize()!),
        })
      }

      const unlinkPromise = unlink()

      toast.promise(unlinkPromise, {
        loading: "Unlinking NFT from Biblio...",
        success: "NFT unlinked",
        error: "Error unlinking NFT, please try again",
      })

      await unlinkPromise
      await unstakeNft(user.access_nft.mint)
      await update()
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function linkNft(mint: string) {
    try {
      setLoading(true)

      async function link() {
        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          mint,
        }
        const { data } = await axios.post("/api/lock-nft", params)
        if (data.resolved) {
          toast.success("NFT unlinked")
          return
        }
        const txn = Transaction.from(base58.decode(data.txn))
        const signed = await wallet?.signTransaction?.(txn)
        await axios.post("/api/send-lock-nft", {
          ...params,
          rawTransaction: base58.encode(signed?.serialize()!),
        })
      }

      const linkPromise = link()

      toast.promise(linkPromise, {
        loading: "Linking NFT to Biblio...",
        success: "NFT linked",
        error: "Error linking NFT, please try again",
      })

      await linkPromise
      await stakeNft(mint)
      await update()
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          <Stack>
            <Typography variant="h4" fontFamily="Lato" fontWeight="bold" textAlign="center">
              Profile settings
            </Typography>
            <Typography variant="h6" color="primary" textAlign="center">
              Connected with {shorten(publicKey)}
            </Typography>
          </Stack>
          <Selector
            linkedNft={user.access_nft}
            onSubmit={linkNft}
            onCancel={onClose}
            loading={loading}
            submitLabel="Link NFT"
          />
          {user.access_nft && (
            <Button onClick={unlinkNft} disabled={loading} variant="outlined" size="large">
              Unlink
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
