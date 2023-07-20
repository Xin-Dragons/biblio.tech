import {
  DigitalAsset,
  JsonMetadata,
  fetchDigitalAsset,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import { Mint, fetchMint } from "@metaplex-foundation/mpl-toolbox"
import { PublicKey, publicKey, unwrapOption } from "@metaplex-foundation/umi"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { Grid, Card, CardContent, Stack, Typography, TextField } from "@mui/material"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { useUmi } from "../context/umi"
import { CreateMetadata } from "./CreateMetadata"
import { MintTokens } from "./MintTokens"
import { UpdateMetadata } from "./UpdateMetadata"
import { FreezeTokens } from "./FreezeTokens"
import { UpdateAuths } from "./UpdateAuths"
import { shorten } from "../helpers/utils"

export const Update = ({ isAdmin, pk }: { isAdmin: boolean; pk: PublicKey | null }) => {
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
        if (err.message.includes("The account of type [Metadata] was not found at the provided address")) {
          const mint = await fetchMint(umi, publicKey(pk))
          setMint(mint)
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

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} sm={6}>
        <Card>
          <CardContent>
            <MintTokens mint={mint} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card>
          <CardContent>
            <FreezeTokens mint={mint} onComplete={checkToken} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Card>
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
        <Card>
          <CardContent>
            <UpdateAuths mint={mint} metadata={digitalAsset?.metadata} isAdmin={isAdmin} refresh={checkToken} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
