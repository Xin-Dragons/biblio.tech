"use client"
import {
  DigitalAsset,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { Mint, fetchMint } from "@metaplex-foundation/mpl-toolbox"
import { PublicKey, publicKey, unwrapOption } from "@metaplex-foundation/umi"
import { Grid, Card, CardContent, TextField } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { CreateMetadata } from "./CreateMetadata"
import { MintTokens } from "./MintTokens"
import { UpdateMetadata } from "./UpdateMetadata"
import { UpdateAuths } from "./UpdateAuths"
import { shorten } from "../../../../helpers/utils"
import { toast } from "react-hot-toast"
import { FreezeTokens } from "./FreezeTokens"
import { useUmi } from "@/context/umi"

export default function Update({ isAdmin }: { isAdmin: boolean }) {
  const [pk, setPk] = useState<string>("")
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const [digitalAsset, setDigitalAsset] = useState<DigitalAsset | null>(null)
  const [jsonMetadata, setJsonMetadata] = useState<JsonMetadata | null>(null)
  const [mint, setMint] = useState<Mint | null>(null)
  const wallet = useWallet()
  const umi = useUmi()

  async function checkToken() {
    if (!wallet.publicKey || !wallet.connected) {
      return
    }
    if (pk) {
      try {
        const da = await fetchDigitalAsset(umi, publicKey(pk))
        const tokenStandard = unwrapOption(da.metadata.tokenStandard)

        if (!tokenStandard || ![1, 2].includes(tokenStandard)) {
          setPublicKeyError(
            "Type mismatch, looks like this mint isn't a fungible token. Check out our other tools to update other types of tokens such as NFTs"
          )
        } else {
          setDigitalAsset(da)
          setMint(da.mint)
          const jsonMetadata = await fetchJsonMetadata(umi, da.metadata.uri)
          setJsonMetadata(jsonMetadata)
        }

        if (da.metadata.updateAuthority !== umi.identity.publicKey) {
          setPublicKeyError(
            `Update authority mismatch. Connect with ${shorten(
              da.metadata.publicKey
            )} to update metadata for this token.`
          )
        } else {
          setPublicKeyError(null)
        }
      } catch (err: any) {
        console.log(err)
        if (err.message.includes("The account of type [Metadata] was not found at the provided address")) {
          try {
            const mint = await fetchMint(umi, publicKey(pk))
            setMint(mint)
          } catch {
            console.log(err.stack)
            setPublicKeyError("Invalid token mint address")
            setMint(null)
            setDigitalAsset(null)
          }
        } else {
          console.log(err.stack)
          setPublicKeyError("Invalid token mint address")
          setMint(null)
          setDigitalAsset(null)
        }
      }
    } else {
      setPublicKeyError(null)
      setMint(null)
      setDigitalAsset(null)
    }
  }

  useEffect(() => {
    checkToken()
  }, [pk, wallet.publicKey])

  if (!wallet.connected) {
    return null
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <TextField
          value={pk}
          label="Token address"
          onChange={(e) => setPk(e.target.value)}
          error={!!publicKeyError}
          helperText={publicKeyError || "Enter the public key of the token you wish to manage"}
          sx={{ minWidth: "350px" }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <MintTokens mint={mint} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <FreezeTokens mint={mint} onComplete={checkToken} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            {mint && !digitalAsset ? (
              <CreateMetadata mint={mint} isAdmin={isAdmin} />
            ) : (
              <UpdateMetadata digitalAsset={digitalAsset} jsonMetadata={jsonMetadata} isAdmin={isAdmin} />
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <UpdateAuths mint={mint} metadata={digitalAsset?.metadata} isAdmin={isAdmin} refresh={checkToken} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
