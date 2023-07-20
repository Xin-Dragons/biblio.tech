import { useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { useUmi } from "../context/umi"
import { mintV1, TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { Stack, Typography, TextField, Button, Alert } from "@mui/material"
import toast from "react-hot-toast"
import Spinner from "./Spinner"
import { publicKey, sol, transactionBuilder, unwrapOption } from "@metaplex-foundation/umi"
import {
  Mint,
  TokenState,
  fetchAllTokenByOwnerAndMint,
  findAssociatedTokenPda,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox"
import { FEES_WALLET } from "../constants"

export const MintTokens = ({ mint, isAdmin }: { mint: Mint | null; isAdmin: boolean }) => {
  const [loading, setLoading] = useState(false)
  const [tokensToMint, setTokensToMint] = useState<string | number>("")
  const [mintToAddress, setMintToAddress] = useState<string | null>(null)
  const [mintToAddressError, setMintToAddressError] = useState<string | null>(null)
  const wallet = useWallet()
  const umi = useUmi()

  function cancel() {
    setTokensToMint("")
    setMintToAddress(null)
  }

  useEffect(() => {
    if (mintToAddress) {
      try {
        const pk = publicKey(mintToAddress)
        setMintToAddressError(null)
      } catch {
        setMintToAddressError("Enter a valid public key or leave blank")
      }
    } else {
      setMintToAddressError(null)
    }
  }, [mintToAddress])

  async function checkStatus() {
    try {
      if (!mint) {
        return
      }
      setLoading(true)
      let addressToCheck = umi.identity.publicKey
      if (mintToAddress) {
        addressToCheck = publicKey(mintToAddress)
      }

      const [ata] = findAssociatedTokenPda(umi, {
        mint: mint.publicKey,
        owner: umi.identity.publicKey,
      })

      const allTokens = await fetchAllTokenByOwnerAndMint(umi, umi.identity.publicKey, mint.publicKey)
      const state = allTokens[0]?.state

      if (state === TokenState.Frozen) {
        setMintToAddressError(
          `${mintToAddress ? "This" : "Your"} token account is frozen, thaw before minting tokens to it.`
        )
      } else {
        setMintToAddressError(null)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [mintToAddress, wallet.publicKey, mint])

  async function mintTokens() {
    try {
      if (!mint) {
        return
      }
      setLoading(true)

      let txn = transactionBuilder().add(
        mintV1(umi, {
          mint: mint.publicKey,
          amount: BigInt(tokensToMint) * BigInt(Math.pow(10, mint.decimals)),
          tokenStandard: TokenStandard.Fungible,
        })
      )

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.1),
          })
        )
      }

      const mintingPromise = txn.sendAndConfirm(umi)

      toast.promise(mintingPromise, {
        loading: "Minting tokens",
        success: `Successfully minted ${tokensToMint} tokens`,
        error: "Error minting tokens",
      })

      await mintingPromise

      cancel()
    } catch (err: any) {
      console.error(err.stack)
      const isFrozen = err.message.includes("Account is frozen")
      if (isFrozen) {
        toast.error("Account is frozen - thaw before minting tokens")
      } else {
        toast.error(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const mintAuth = mint && unwrapOption(mint.mintAuthority)

  const canMint = mintAuth && mintAuth === umi.identity.publicKey
  const isDirty = tokensToMint || mintToAddress

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Mint tokens</Typography>
      {!mint ? (
        <Alert severity="info">Enter SPL token address</Alert>
      ) : (
        !canMint && <Alert severity="error">Connected wallet does not have authority to mint tokens</Alert>
      )}
      <TextField
        disabled={loading || !canMint}
        label="Tokens to mint"
        value={tokensToMint}
        onChange={(e) => setTokensToMint(e.target.value)}
        inputProps={{
          min: 0,
          step: 0.1,
        }}
      />
      <TextField
        label="Mint to address"
        error={!!mintToAddressError}
        disabled={loading || !canMint}
        value={mintToAddress}
        onChange={(e) => setMintToAddress(e.target.value)}
        helperText={mintToAddressError || "Leave blank to mint to your wallet"}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="outlined" onClick={cancel} disabled={loading || !canMint || !isDirty}>
          Cancel
        </Button>
        <Button variant="contained" onClick={mintTokens} disabled={loading || !canMint || !tokensToMint}>
          Mint
        </Button>
        {loading && <Spinner small />}
      </Stack>
    </Stack>
  )
}
