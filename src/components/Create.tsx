import { createV1, TokenStandard, mintV1, isFungible } from "@metaplex-foundation/mpl-token-metadata"
import {
  createGenericFileFromBrowserFile,
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  sol,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi"
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
} from "@mui/material"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useUmi } from "../context/umi"
import { FEES_WALLET, MAX_TOKENS } from "../constants"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { getFee } from "./NftTool/helpers/utils"
import { useAccess } from "../context/access"

export const Create = () => {
  const wallet = useWallet()
  const umi = useUmi()
  const user = useAccess()
  const [keypair, setKeypair] = useState(generateSigner(umi))
  const [keypairError, setKeypairError] = useState<string | null>(null)
  const [decimals, setDecimals] = useState(9)
  const [name, setName] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [description, setDescription] = useState<string>("")
  const [symbol, setSymbol] = useState<string | null>(null)
  const [initialSupply, setInitialSupply] = useState<string | null>(null)
  const [freeze, setFreeze] = useState(true)
  const [mint, setMint] = useState(true)
  const [supplyError, setSupplyError] = useState<string | null>(null)
  const [decimalsSupplyError, setDecimalsSupplyError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    try {
      const factor = BigInt(Math.pow(10, decimals))
      if (initialSupply) {
        if (BigInt(initialSupply) * factor > MAX_TOKENS) {
          let parts = MAX_TOKENS.toString().split("")
          const max =
            decimals === 0
              ? MAX_TOKENS
              : [...parts.slice(0, 20 - decimals), ".", ...parts.slice(20 - decimals)].join("")
          setDecimalsSupplyError(`Max supply for ${decimals} decimals: ${max}, try reducing the number of decimals`)
        } else {
          setDecimalsSupplyError(null)
        }
      } else {
        setDecimalsSupplyError(null)
      }
    } catch {
      setDecimalsSupplyError("Invalid decimals/supply")
    }
  }, [initialSupply, decimals])

  const { connection } = useConnection()

  function handleClose() {
    cancel()
    setDialogOpen(false)
  }

  async function uploadFiles() {
    if (!image) {
      return null
    }
    const file = await createGenericFileFromBrowserFile(image)
    const [imageUrl] = await umi.uploader.upload([file])

    const metadata = {
      name,
      description,
      image: imageUrl,
      symbol,
    }

    const uri = await umi.uploader.uploadJson(metadata)
    return uri
  }

  async function createToken() {
    try {
      setLoading(true)
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected")
      }

      if (decimalsSupplyError) {
        throw new Error("Supply/decimal error - check field for more details")
      }

      if (!name) {
        throw new Error("Name is a required field")
      }

      if (!symbol) {
        throw new Error("Symbol is a required field")
      }

      if (!image) {
        throw new Error("Image is a required field")
      }

      if (image.size > 2_000_000) {
        throw new Error("Image should be 2MB or less")
      }

      if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(image.type)) {
        throw new Error("Invalid image format")
      }

      if (!description) {
        throw new Error("Description is a required field")
      }

      if (!mint && !initialSupply) {
        throw new Error("Cannot relinquish mint authority if no initial supply is to be minted.")
      }

      if (!name || !symbol) {
        throw new Error("Missing params")
      }

      const uri = await uploadFiles()

      if (!uri) {
        throw new Error("Unable to upload metadata")
      }

      let txn = transactionBuilder().add(
        createV1(umi, {
          mint: keypair,
          name,
          uri,
          symbol,
          sellerFeeBasisPoints: percentAmount(0),
          tokenStandard: TokenStandard.Fungible,
          decimals: some(decimals),
        })
      )

      if (initialSupply) {
        txn = txn.add(
          mintV1(umi, {
            mint: keypair.publicKey,
            amount: BigInt(initialSupply) * BigInt(Math.pow(10, decimals)),
            tokenStandard: TokenStandard.Fungible,
          })
        )
      }

      const fee = getFee("createSpl", user.dandies.length)

      if (fee) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(fee),
          })
        )
      }

      const createPromise = txn.sendAndConfirm(umi)

      toast.promise(createPromise, {
        loading: "Creating Token...",
        success: "Token created successfully!",
        error: "Error creating token",
      })

      await createPromise

      setDialogOpen(true)
    } catch (err: any) {
      console.log(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function uploadKeypair(e: any) {
    const file = e.target.files[0]
    const fileReader = new FileReader()
    fileReader.onload = (event) => {
      if (!event.target?.result) {
        return
      }
      try {
        setKeypair(
          createSignerFromKeypair(
            umi,
            umi.eddsa.createKeypairFromSecretKey(new Uint8Array(Array.from(JSON.parse(event.target.result as string))))
          )
        )
      } catch (err) {
        toast.error("Error reading file")
      }
    }
    fileReader.readAsText(file)
  }

  async function checkKeypair() {
    const details = await umi.rpc.accountExists(keypair.publicKey)
    if (details) {
      setKeypairError("Keypair exists! - check you haven't already set up a token or wallet using this keypair.")
    } else {
      setKeypairError(null)
    }
  }

  useEffect(() => {
    if (keypair) {
      checkKeypair()
    }
  }, [keypair])

  function updateInitialSupply(e: any) {
    setInitialSupply(e.target.value)
  }

  function updateDecimals(e: any) {
    let num = parseInt(e.target.value)
    if (num > 255) {
      num = 255
    }
    if (num < 0) {
      num = 0
    }
    setDecimals(num)
  }

  function updateImage(e: any) {
    setImage(e.target.files[0])
  }

  useEffect(() => {
    if (!initialSupply && !mint) {
      setSupplyError("Must choose an initial supply if not retaining mint authority")
    } else {
      setSupplyError(null)
    }
  }, [initialSupply, mint])

  function cancel() {
    setKeypair(generateSigner(umi))
    setName("")
    setDecimals(9)
    setImage(null)
    setDescription("")
    setSymbol("")
    setInitialSupply("")
    setFreeze(true)
    setMint(true)
  }

  function respin() {
    setKeypairError(null)
    setKeypair(generateSigner(umi))
  }

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={4} width="100%">
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5">Create new SPL token</Typography>
            <Typography variant="body1">
              Create a new SPL token using a randomly generated public key, or by uploading a custom keypair.
            </Typography>
            <Typography variant="body1">
              Create a vanity token address using the <a href="https://vanity.dandies.xyz">Vanity Address Generator</a>,
              download the JSON keypair file, and upload below to create a vanity token.
            </Typography>

            <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
              Choose custom keypair
              <input type="file" onChange={uploadKeypair} hidden />
            </Button>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                error={!!keypairError}
                label="Token address"
                value={keypair?.publicKey}
                onChange={() => {}}
                disabled
                helperText={keypairError}
              />
              <Button sx={{ width: "max-content" }} onClick={respin}>
                Respin token address
              </Button>
            </Stack>

            <TextField
              type="number"
              value={decimals}
              label="Decimals"
              onChange={updateDecimals}
              onWheel={(e: any) => e.target.blur()}
              inputProps={{
                step: 1,
                min: 0,
                max: 255,
              }}
              helperText="Most Solana tokens have 9 decimals (including SOL). WL tokens and consumables usually have 0 decimals"
            />

            <TextField
              value={name}
              label="Name"
              onChange={(e) => setName(e.target.value)}
              inputProps={{
                "data-form-type": "other",
              }}
              helperText="The name of your SPL token"
            />
            <Stack direction="row" alignItems="center" spacing={2}>
              <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                Select image
                <input type="file" onChange={updateImage} hidden />
              </Button>
              {image && <img src={URL.createObjectURL(image)} height={55} width={55} alt="The current file" />}
              {image && <Typography variant="body1">{image.name}</Typography>}
            </Stack>
            <Typography variant="body2">Images should be square aspect ratio and up to 2mb</Typography>

            <TextField
              multiline
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              helperText="A short description to be included in the off chain token metadata"
            />

            <TextField
              label="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              helperText="e.g. SOL, $XIN, $MOB"
            />

            <TextField
              label="Initial supply"
              value={initialSupply}
              onChange={updateInitialSupply}
              type="number"
              error={!!supplyError || !!decimalsSupplyError}
              onWheel={(e: any) => e.target.blur()}
              inputProps={{
                step: 1,
                min: 0,
              }}
              helperText={
                supplyError ||
                decimalsSupplyError ||
                "The number of tokens to be minted into your wallet on token creation"
              }
            />

            {/* <FormControlLabel control={<Switch checked={mint} onChange={e => setMint(e.target.checked)} />} label="Retain mint authority" /> */}
            {/* <FormControlLabel control={<Switch checked={freeze} onChange={e => setFreeze(e.target.checked)} />} label="Retain freeze authority" /> */}

            <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between">
              <Button variant="outlined" onClick={cancel}>
                Cancel
              </Button>
              <Button variant="contained" size="large" onClick={createToken} disabled={loading}>
                Create
              </Button>
            </Stack>

            <Dialog
              open={dialogOpen}
              onClose={handleClose}
              aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description"
            >
              <DialogTitle id="alert-dialog-title">{"Token created sucessfully!"}</DialogTitle>
              <DialogContent>
                <DialogContentText id="alert-dialog-description">
                  Your SPL token has been created sucessfully. You can view the token details{" "}
                  <a href={`https://solscan.io/token/${keypair.publicKey}`} rel="noopener noreferrer">
                    here
                  </a>
                  .
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleClose} autoFocus>
                  Finish
                </Button>
              </DialogActions>
            </Dialog>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
