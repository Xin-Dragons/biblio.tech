import { Stack, Typography, TextField, Button } from "@mui/material"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useUmi } from "../context/umi"
import Spinner from "./Spinner"
import { createGenericFileFromBrowserFile, percentAmount, sol, transactionBuilder } from "@metaplex-foundation/umi"
import { TokenStandard, createV1, updateV1 } from "@metaplex-foundation/mpl-token-metadata"
import { Mint, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { FEES_WALLET } from "../constants"
import { useSession } from "next-auth/react"

export const CreateMetadata = ({ mint, isAdmin }: { mint: Mint; isAdmin: boolean }) => {
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState("")
  const [newImage, setNewImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const umi = useUmi()

  const wallet = useWallet()
  const { connection } = useConnection()

  function cancel() {
    setName("")
    setSymbol("")
    setDescription("")
    setNewImage(null)
  }

  async function submit() {
    try {
      setLoading(true)
      const meta = {} as any
      if (newImage) {
        if (newImage.size > 2_000_000) {
          throw new Error("Image should be 2MB or less")
        }

        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(newImage.type)) {
          throw new Error("Invalid image format")
        }

        const file = await createGenericFileFromBrowserFile(newImage)
        const [imageUrl] = await umi.uploader.upload([file])
        meta.image = imageUrl
      }

      meta.name = name
      meta.symbol = symbol
      meta.description = description

      const uri = await umi.uploader.uploadJson(JSON.stringify(meta))

      let txn = transactionBuilder().add(
        createV1(umi, {
          mint: mint.publicKey,
          tokenStandard: TokenStandard.Fungible,
          decimals: mint.decimals,
          name,
          uri,
          sellerFeeBasisPoints: percentAmount(0),
        })
      )

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.5),
          })
        )
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Metadata</Typography>
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        inputProps={{
          "data-form-type": "other",
        }}
        helperText="The name of the token. E.g. Crown Token"
      />
      <TextField
        label="Symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        helperText="The token symbol. E.g. $CRWN"
      />
      <TextField
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        helperText="The token description to be included in metadata"
      />
      <Typography variant="body1">Image</Typography>
      <Stack direction="row" alignItems="center" spacing={2}>
        <img src={newImage ? URL.createObjectURL(newImage) : image} width={150} height={150} />
        {newImage && <Typography variant="body1">{newImage.name}</Typography>}

        <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
          Select image
          <input type="file" onChange={(e) => setNewImage(e.target.files?.[0] || null)} hidden />
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="outlined" onClick={cancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          Update
        </Button>
        {loading && <Spinner small />}
      </Stack>
    </Stack>
  )
}
