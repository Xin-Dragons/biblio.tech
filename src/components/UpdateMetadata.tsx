import { Stack, Typography, TextField, Button, Alert } from "@mui/material"
import { isEqual, pick } from "lodash"
import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import Spinner from "./Spinner"
import { DigitalAsset, JsonMetadata, Metadata, updateV1 } from "@metaplex-foundation/mpl-token-metadata"
import { createGenericFileFromBrowserFile, sol, transactionBuilder } from "@metaplex-foundation/umi"
import { useUmi } from "../context/umi"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { FEES_WALLET } from "../constants"

export const UpdateMetadata = ({
  digitalAsset,
  jsonMetadata,
  isAdmin,
}: {
  digitalAsset: DigitalAsset | null
  jsonMetadata?: JsonMetadata | null
  isAdmin: boolean
}) => {
  const [name, setName] = useState(jsonMetadata?.name || "")
  const [symbol, setSymbol] = useState(jsonMetadata?.symbol || "")
  const [description, setDescription] = useState(jsonMetadata?.description || "")
  const [newImage, setNewImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const umi = useUmi()

  useEffect(() => {
    setName(jsonMetadata?.name || "")
    setSymbol(jsonMetadata?.symbol || "")
    setDescription(jsonMetadata?.description || "")
  }, [jsonMetadata])

  function cancel() {
    setName(jsonMetadata?.name || "")
    setSymbol(jsonMetadata?.symbol || "")
    setDescription(jsonMetadata?.description || "")
    setNewImage(null)
  }

  async function submit() {
    if (!digitalAsset || !name || !symbol) {
      return
    }
    try {
      setLoading(true)
      let uri = digitalAsset?.metadata.uri
      let meta = pick(jsonMetadata, "name", "image", "symbol", "description")
      if (newImage) {
        if (newImage.size > 2_000_000) {
          throw new Error("Image should be 2MB or less")
        }

        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(newImage.type)) {
          throw new Error("Invalid image format")
        }

        const file = await createGenericFileFromBrowserFile(newImage)
        const [imageUrl] = await umi.uploader.upload([file])
        meta.image = `${imageUrl}?ext=${newImage.type.split("/")[1]}`
      }

      meta.name = name
      meta.symbol = symbol
      meta.description = description

      if (!isEqual(meta, jsonMetadata)) {
        uri = await umi.uploader.uploadJson(meta)
      }

      let txn = transactionBuilder().add(
        updateV1(umi, {
          mint: digitalAsset.publicKey,
          data: {
            name,
            symbol,
            uri,
            sellerFeeBasisPoints: digitalAsset.metadata.sellerFeeBasisPoints,
            creators: digitalAsset.metadata.creators,
          },
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

      const updateTxn = txn.sendAndConfirm(umi)

      toast.promise(updateTxn, {
        loading: "Updating token metadata",
        success: "Token metadata updated successfully",
        error: "Error updating token metadata",
      })

      await updateTxn
    } catch (err: any) {
      toast.error(err.message || "Error updating metadata")
    } finally {
      setLoading(false)
    }
  }

  const canEdit = umi.identity.publicKey === digitalAsset?.metadata?.updateAuthority && digitalAsset.metadata.isMutable

  const dirty =
    newImage ||
    name !== jsonMetadata?.name ||
    symbol !== digitalAsset?.metadata?.symbol ||
    description !== jsonMetadata?.description

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Metadata</Typography>
      {!digitalAsset ? (
        <Alert severity="info">Enter SPL token address</Alert>
      ) : (
        !canEdit && <Alert severity="error">Connected wallet does not have authority to update metadata</Alert>
      )}
      <TextField
        disabled={!canEdit}
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        inputProps={{
          "data-form-type": "other",
        }}
        helperText="The name of the token. E.g. Xin Dragons Token"
      />
      <TextField
        disabled={!canEdit}
        label="Symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        helperText="The token symbol. E.g. $XIN"
      />
      <TextField
        disabled={!canEdit}
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        helperText="The token description to be included in metadata"
      />
      <Typography variant="body1">Image</Typography>
      <Stack direction="row" alignItems="center" spacing={2}>
        <img src={newImage ? URL.createObjectURL(newImage) : jsonMetadata?.image} width={150} height={150} />
        {newImage && <Typography variant="body1">{newImage.name}</Typography>}

        <Button
          variant="contained"
          component="label"
          sx={{ minWidth: "max-content", height: "55px" }}
          disabled={!canEdit}
        >
          Select image
          <input type="file" onChange={(e) => setNewImage(e.target.files?.[0] || null)} hidden />
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="outlined" onClick={cancel} disabled={loading || !dirty || !canEdit}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading || !dirty || !canEdit}>
          Update
        </Button>
        {loading && <Spinner small />}
      </Stack>
    </Stack>
  )
}
