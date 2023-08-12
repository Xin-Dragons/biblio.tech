import {
  JsonMetadata,
  createNft,
  createProgrammableNft,
  fetchDigitalAsset,
  findMetadataPda,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata"
import {
  createGenericFileFromBrowserFile,
  createSignerFromKeypair,
  generateSigner,
  percentAmount,
  publicKey,
  sol,
  transactionBuilder,
} from "@metaplex-foundation/umi"
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Typography,
  FormControl,
  FormControlLabel,
  Switch,
  FormHelperText,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useNfts } from "./context/nft"
import { MultimediaCategory, getMultimediaType, getUmiChunks, shorten } from "./helpers/utils"
import { useUmi } from "./context/umi"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { NftSelector } from "./NftSelector"
import { PreviewNft } from "./PreviewNft"
import { AddCircleRounded, RemoveCircleRounded } from "@mui/icons-material"
import { isEqual } from "lodash"
import { getAnonUmi } from "./helpers/umi"
import { FEES_WALLET, METAPLEX_RULE_SET } from "./constants"
import Link from "next/link"

export const emptyAttribute = {
  trait_type: "",
  value: "",
}

export const emptyCreator = {
  address: "",
  share: 0,
}

export const CreateNft = () => {
  const { collections, loading: nftsLoading, dandies, refresh } = useNfts()
  const umi = useUmi()
  const wallet = useWallet()
  const [keypair, setKeypair] = useState(generateSigner(umi))
  const [keypairError, setKeypairError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [image, setImage] = useState<File | "">("")
  const [description, setDescription] = useState("")
  const [symbol, setSymbol] = useState("")
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [website, setWebsite] = useState("")
  const [sellerFeeBasisPoints, setSellerFeeBasisPoints] = useState("5")
  const [isCollection, setIsCollection] = useState(false)
  const [royaltiesError, setRoyaltiesError] = useState<string | null>(null)
  const [isMutable, setIsMutable] = useState(true)
  const [collection, setCollection] = useState("")
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)
  const [primarySaleHappened, setPrimarySaleHappened] = useState(false)
  const [attributes, setAttributes] = useState([emptyAttribute])
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [multimedia, setMultimedia] = useState<File | "">("")
  const [multimediaType, setMultimediaType] = useState<MultimediaCategory | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [createMany, setCreateMany] = useState(false)
  const [pNft, setPNft] = useState(true)
  const [ruleSet, setRuleSet] = useState(METAPLEX_RULE_SET)
  const [creators, setCreators] = useState([emptyCreator])

  useEffect(() => {
    if (!wallet.publicKey) {
      return
    }
    if (isEqual(creators, [emptyCreator])) {
      setCreators([
        {
          address: wallet.publicKey.toString(),
          share: 100,
        },
      ])
    }
  }, [wallet.publicKey, creators])

  useEffect(() => {
    if (multimedia) {
      const parts = multimedia.name.split(".")
      const ext = parts[parts.length - 1]
      setMultimediaType(getMultimediaType(ext))
    } else {
      setMultimediaType(null)
    }
  }, [multimedia])

  function handleClose() {
    cancel()
    setDialogOpen(false)
  }

  async function uploadFiles() {
    const metadata: JsonMetadata = {
      name,
      symbol,
      description,
      attributes: isCollection ? [] : attributes.filter((att) => att.trait_type && att.value),
      external_url: website,
      properties: {
        category: "image",
        files: [],
      },
    }

    if (image) {
      const file = await createGenericFileFromBrowserFile(image)
      let [imageUrl] = await umi.uploader.upload([file])
      imageUrl = `${imageUrl}?ext=${image.type.replace("image/", "")}`
      metadata.image = imageUrl
      metadata.properties = metadata.properties || { files: [] }
      metadata.properties.files?.push({
        uri: imageUrl,
        type: image.type,
      })
    }

    if (multimedia) {
      const file = await createGenericFileFromBrowserFile(multimedia)
      const parts = multimedia.name.split(".")
      const ext = parts[parts.length - 1]

      let [animation_url] = await umi.uploader.upload([file])
      animation_url = `${animation_url}?ext=${ext}`
      metadata.animation_url = animation_url

      metadata.properties = metadata.properties || {
        category: "",
        files: [],
      }

      metadata.properties.category = getMultimediaType(ext)
      metadata.properties.files?.push({
        uri: animation_url,
        type: multimedia.type,
      })
    }

    const uri = await umi.uploader.uploadJson(metadata)
    return uri
  }

  async function uploadAndCreate() {
    const uri = await uploadFiles()
    const parsedCreators = creators
      .filter((c) => c.address && c.share)
      .map((c) => ({
        ...c,
        address: publicKey(c.address),
        verified: publicKey(c.address) === umi.identity.publicKey,
      }))

    const collectionDa = collection ? await fetchDigitalAsset(umi, publicKey(collection)) : null
    const func = pNft ? createProgrammableNft : createNft

    if (createMany) {
      const anonUmi = getAnonUmi(umi.identity.publicKey)
      const builders = Array.from(Array(quantity).keys()).map((index) => {
        let tx = transactionBuilder()
        const mint = generateSigner(umi)

        tx = tx.add(
          func(anonUmi, {
            uri,
            name,
            mint,
            sellerFeeBasisPoints: percentAmount(Math.round(Number(sellerFeeBasisPoints || 0))),
            symbol,
            creators: parsedCreators.length ? parsedCreators : undefined,
            isMutable,
            collection: collection
              ? {
                  key: publicKey(collection),
                  verified: false,
                }
              : undefined,
            ruleSet: pNft ? publicKey(ruleSet) || null : undefined,
          })
        )

        if (collectionDa) {
          if (collectionDa.metadata.updateAuthority === umi.identity.publicKey) {
            tx = tx.add(
              verifyCollectionV1(anonUmi, {
                collectionMint: collectionDa.publicKey,
                metadata: findMetadataPda(umi, { mint: mint.publicKey }),
              })
            )
          }
        }

        if (!dandies.length) {
          tx = tx.add(
            transferSol(umi, {
              destination: FEES_WALLET,
              amount: sol(0.01),
            })
          )
        }

        return tx
      })

      const txns = await Promise.all(getUmiChunks(anonUmi, builders).map((builder) => builder.buildAndSign(anonUmi)))
      const signed = await umi.identity.signAllTransactions(txns)

      let success = 0
      let error = 0

      const sentTxns = Promise.all(
        signed.map(async (txn) => {
          const txnId = await umi.rpc.sendTransaction(txn)

          const state = await umi.rpc.confirmTransaction(txnId, {
            strategy: {
              type: "blockhash",
              ...(await umi.rpc.getLatestBlockhash()),
            },
          })
          if (state.value.err) {
            error += 1
          } else {
            success += 1
          }
        })
      )

      toast.promise(sentTxns, {
        loading: "Minting NFTs",
        success: `Minted NFTs!`,
        error: `Error minting NFTs`,
      })

      await sentTxns
      await refresh()
    } else {
      let tx = transactionBuilder().add(
        func(umi, {
          uri,
          name,
          sellerFeeBasisPoints: isCollection
            ? percentAmount(0)
            : percentAmount(Math.round(Number(sellerFeeBasisPoints || 0))),
          mint: keypair,
          symbol,
          creators: parsedCreators.length ? parsedCreators : undefined,
          isMutable,
          primarySaleHappened,
          collectionDetails: isCollection
            ? {
                __kind: "V1",
                size: 0,
              }
            : undefined,
          collection: collection
            ? {
                key: publicKey(collection),
                verified: false,
              }
            : null,
          ruleSet: pNft ? publicKey(ruleSet) : undefined,
        })
      )

      if (collection) {
        const collectionDa = await fetchDigitalAsset(umi, publicKey(collection))
        if (collectionDa.metadata.updateAuthority === umi.identity.publicKey) {
          tx = tx.add(
            verifyCollectionV1(umi, {
              collectionMint: collectionDa.publicKey,
              metadata: findMetadataPda(umi, { mint: keypair.publicKey }),
            })
          )
        }
      }

      if (!dandies.length) {
        tx = tx.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.01),
          })
        )
      }

      const mintingPromise = tx.sendAndConfirm(umi)

      toast.promise(mintingPromise, {
        loading: "Minting NFT...",
        success: "Minted NFT!",
        error: "Error minting NFT",
      })

      await mintingPromise
      await refresh()
    }
  }

  async function createToken() {
    try {
      setLoading(true)
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected")
      }

      if (!name) {
        throw new Error("Name is a required field")
      }

      if (!symbol) {
        throw new Error("Symbol is a required field")
      }

      if (!image && !multimedia) {
        throw new Error("Must provide either an image or multimedia file")
      }

      if (image) {
        if (image && image.size > 20_000_000) {
          throw new Error("Image should be 20MB or less")
        }

        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(image.type)) {
          throw new Error("Invalid image format")
        }
      }

      if (!description) {
        throw new Error("Description is a required field")
      }

      const total = creators.reduce((sum, item) => sum + (item.share || 0), 0)

      if (!isCollection && sellerFeeBasisPoints && total !== 100) {
        throw new Error("Creator shares must add up to exactly 100")
      }

      const createPromise = uploadAndCreate()

      toast.promise(createPromise, {
        loading: `Creating NFT${createMany && quantity > 1 ? "s" : ""}...`,
        success: `NFT${createMany && quantity > 1 ? "s" : ""} created successfully!`,
        error: `Error creating NFT${createMany && quantity > 1 ? "s" : ""}`,
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
    fileReader.onload = (event: any) => {
      if (!event.target.result) {
        return
      }
      try {
        const keypair = umi.eddsa.createKeypairFromSecretKey(
          new Uint8Array(Array.from(JSON.parse(event.target.result as string)))
        )
        setKeypair(createSignerFromKeypair(umi, keypair))
      } catch (err) {
        toast.error("Error reading file")
      }
    }
    fileReader.readAsText(file)
  }

  async function checkKeypair() {
    const exists = await umi.rpc.accountExists(keypair.publicKey)
    if (exists) {
      setKeypairError("Invalid Keypair - check you haven't already set up a token or wallet using this keypair.")
    } else {
      setKeypairError(null)
    }
  }

  useEffect(() => {
    if (keypair) {
      checkKeypair()
    }
  }, [keypair])

  function updateImage(e: any) {
    setImage(e.target.files[0])
  }

  function updateMultimedia(e: any) {
    setMultimedia(e.target.files[0])
  }

  function cancel() {
    setKeypair(generateSigner(umi))
    setName("")
    setImage("")
    setDescription("")
    setSymbol("")
    setIsCollection(false)
    setWebsite("")
    setSellerFeeBasisPoints("5")
    setAttributes([emptyAttribute])
    setCreators([{ ...emptyCreator, share: 100 }])
    setIsMutable(true)
    setCollection("")
  }

  function respin() {
    setKeypairError(null)
    setKeypair(generateSigner(umi))
  }

  useEffect(() => {
    const val = Number(sellerFeeBasisPoints)
    if (val < 0) {
      setRoyaltiesError("Royalties must be 0% or more")
    } else if (val > 100) {
      setRoyaltiesError("Royalties must be 100% or less")
    } else {
      setRoyaltiesError(null)
    }
  }, [sellerFeeBasisPoints])

  function addAttribute() {
    setAttributes((prevState) => {
      return [
        ...prevState,
        {
          trait_type: "",
          value: "",
        },
      ]
    })
  }

  const removeAttribute = (i: number) => () => {
    setAttributes((prevState) => prevState.filter((f, index) => index !== i))
  }

  const updateAttribute = (i: number, type: string) => (e: any) => {
    setAttributes((prevState) =>
      prevState.map((item, index) => {
        if (index === i) {
          return {
            ...item,
            [type]: e.target.value,
          }
        }
        return item
      })
    )
  }

  function addCreator() {
    setCreators((prevState) => {
      return [
        ...prevState,
        {
          address: "",
          share: 0,
        },
      ]
    })
  }

  const removeCreator = (i: number) => () => {
    setCreators((prevState) => prevState.filter((f, index) => index !== i))
  }

  const updateCreator = (i: number, type: string) => (e: any) => {
    setCreators((prevState) =>
      prevState.map((item, index) => {
        if (index === i) {
          return {
            ...item,
            [type]: type === "share" && e.target.value ? parseInt(e.target.value) : e.target.value,
          }
        }
        return item
      })
    )
  }

  async function validateCollection() {
    if (!collection) {
      setCollectionError(null)
      return
    }
    try {
      const nft = await fetchDigitalAsset(umi, publicKey(collection))
      if (!nft) {
        throw new Error("Collectoin NFT not found")
      }
      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }
      if (!nft.metadata.collectionDetails) {
        throw new Error("Not a collection NFT")
      }
      if (nft.metadata.updateAuthority !== umi.identity.publicKey) {
        throw new Error(
          `Update authority mismatch. Connect with ${shorten(nft.metadata.updateAuthority)} to use this collection`
        )
      }
      setCollectionError(null)
    } catch (err: any) {
      setCollectionError(err.message)
    }
  }

  useEffect(() => {
    const total = creators.reduce((sum, item) => sum + (item.share || 0), 0)
    if (total !== 100) {
      setShareError("Total share must add up to 100")
    } else {
      setShareError(null)
    }
  }, [creators])

  useEffect(() => {
    validateCollection()
  }, [collection, wallet.publicKey, wallet.connected])

  function toggleCollectionModal() {
    setCollectionModalOpen(!collectionModalOpen)
  }

  function selectCollection(mint: string) {
    setCollection(mint)
    toggleCollectionModal()
  }

  const completedAttributes = attributes.filter((att) => att.trait_type || att.value)

  return (
    <Grid container spacing={2} direction={{ xs: "column-reverse", sm: "row" }}>
      <Grid item xs={12} sm={7}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Create new NFT</Typography>
              <Typography variant="body1">
                Create a new NFT or Certified Metaplex Collection NFT for grouping a new or existing collection
              </Typography>

              <FormControl>
                <Stack direction="row" alignItems="center">
                  <FormControlLabel
                    control={<Switch checked={createMany} onChange={(e) => setCreateMany(e.target.checked)} />}
                    label="Create many"
                  />
                  <FormHelperText>Create a collection of many NFTs with the same image/metadata.</FormHelperText>
                </Stack>
              </FormControl>

              {createMany ? (
                <TextField
                  type="number"
                  label="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  onWheel={(e: any) => e.target.blur()}
                  inputProps={{
                    min: 1,
                    step: 1,
                  }}
                />
              ) : (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    fullWidth
                    error={!!keypairError}
                    label="Token address"
                    value={keypair?.publicKey}
                    onChange={() => {}}
                    disabled
                    helperText={keypairError}
                  />
                  <Button
                    variant="outlined"
                    sx={{ width: { sm: "max-content", xs: "100%" }, height: "55px" }}
                    onClick={respin}
                  >
                    Respin
                  </Button>

                  <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                    Upload keypair
                    <input type="file" onChange={uploadKeypair} hidden />
                  </Button>
                </Stack>
              )}

              <FormHelperText color="GrayText" sx={{ paddingLeft: 2 }}>
                <Link href="/tools/grind-address">
                  <Typography color="primary" display="inline" variant="body2" sx={{ cursor: "pointer" }}>
                    Grind a vanity token address,
                  </Typography>
                </Link>{" "}
                download the JSON keypair file, upload here to create a vanity token. This is particularly useful for
                Collection NFTs or 1/1s
              </FormHelperText>

              {!createMany && (
                <FormControl>
                  <Stack direction="row" alignItems="center">
                    <FormControlLabel
                      control={<Switch checked={isCollection} onChange={(e) => setIsCollection(e.target.checked)} />}
                      label="Collection NFT"
                    />
                    <FormHelperText>
                      Create a Metaplex Certified Collection NFT which can be used to group NFTs into a collection.{" "}
                      <a
                        href="https://docs.metaplex.com/programs/token-metadata/certified-collections#collection-nfts"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read Metaplex collection docs
                      </a>
                    </FormHelperText>
                  </Stack>
                </FormControl>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  value={name}
                  label="Name"
                  onChange={(e) => setName(e.target.value)}
                  inputProps={{
                    "data-form-type": "other",
                  }}
                  helperText={`The name of your ${isCollection ? "Collection" : "NFT"}`}
                  fullWidth
                />
                <TextField
                  label="Symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  helperText="e.g. DANDY, JGNL"
                />
              </Stack>

              <TextField
                multiline
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                helperText="A short description to be included in the off chain token metadata"
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} fullWidth />
                {!isCollection && (
                  <TextField
                    type="number"
                    label="Royalties percentage"
                    error={!!royaltiesError}
                    value={sellerFeeBasisPoints}
                    onChange={(e) => setSellerFeeBasisPoints(e.target.value)}
                    onWheel={(e: any) => e.target.blur()}
                    fullWidth
                    inputProps={{
                      min: 0,
                      max: 100,
                      step: 0.5,
                    }}
                    helperText={royaltiesError}
                  />
                )}
              </Stack>

              <Stack>
                <Stack direction="row" spacing={2} justifyContent="space-between">
                  <Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                        Select image
                        <input type="file" onChange={updateImage} hidden />
                      </Button>
                      {image && <img src={URL.createObjectURL(image)} height={55} alt="The current file" />}
                      {image && <Typography variant="body1">{image.name}</Typography>}
                    </Stack>
                    <FormHelperText>Accepted types: jpg, png, gif</FormHelperText>
                  </Stack>
                </Stack>
              </Stack>

              <Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                    Add multimedia
                    <input type="file" onChange={updateMultimedia} hidden />
                  </Button>
                  {multimedia && (
                    <>
                      {multimediaType === "video" && (
                        <video src={URL.createObjectURL(multimedia)} autoPlay width={55} loop></video>
                      )}
                      {multimediaType === "audio" && (
                        <audio src={URL.createObjectURL(multimedia)} autoPlay loop></audio>
                      )}
                      {multimediaType === "vr" && (
                        <model-viewer
                          src={URL.createObjectURL(multimedia)}
                          alt="Model"
                          camera-controls
                          ar-modes="webxr"
                          width="100%"
                          style={{ height: "55px", background: "transparent" }}
                        ></model-viewer>
                      )}
                    </>
                  )}
                  {multimedia && <Typography variant="body1">{multimedia.name}</Typography>}
                </Stack>
                <FormHelperText>Accepted types: mp4, mov, mp3, flac, wav, glb, gltf</FormHelperText>
              </Stack>

              {!isCollection && (
                <Stack>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={primarySaleHappened}
                        onChange={(e) => setPrimarySaleHappened(e.target.checked)}
                      />
                    }
                    label="Primary sale happened?"
                  />
                  <FormHelperText>
                    Royalties are payable on all secondary sales. You would generally check this field if you are
                    airdropping the NFT or leave it unchecked if you will be selling as a 1/1
                  </FormHelperText>
                </Stack>
              )}

              {!isCollection && (
                <Stack spacing={2}>
                  <Typography variant="h5">Attributes</Typography>
                  {attributes.map((attribute, index) => {
                    return (
                      <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Trait type"
                          value={attribute.trait_type}
                          onChange={updateAttribute(index, "trait_type")}
                          fullWidth
                        />
                        <TextField
                          label="Value"
                          value={attribute.value}
                          onChange={updateAttribute(index, "value")}
                          fullWidth
                        />
                        {index === 0 ? (
                          <IconButton color="primary" onClick={addAttribute}>
                            <AddCircleRounded />
                          </IconButton>
                        ) : (
                          <IconButton color="error" onClick={removeAttribute(index)}>
                            <RemoveCircleRounded />
                          </IconButton>
                        )}
                      </Stack>
                    )
                  })}
                  <Typography variant="h5">Creators</Typography>
                  <FormHelperText>Creators shares must add up to 100</FormHelperText>
                  {creators.map((creator, index) => {
                    return (
                      <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Address"
                          value={creator.address}
                          onChange={updateCreator(index, "address")}
                          fullWidth
                        />
                        <TextField
                          type="number"
                          label="Share"
                          error={!!shareError}
                          value={creator.share}
                          onChange={updateCreator(index, "share")}
                          onWheel={(e: any) => e.target.blur()}
                          fullWidth
                          inputProps={{
                            min: 0,
                            max: 100,
                            step: 1,
                          }}
                          helperText={shareError}
                        />
                        {index === 0 ? (
                          <IconButton color="primary" onClick={addCreator}>
                            <AddCircleRounded />
                          </IconButton>
                        ) : (
                          <IconButton color="error" onClick={removeCreator(index)}>
                            <RemoveCircleRounded />
                          </IconButton>
                        )}
                      </Stack>
                    )
                  })}
                  <Stack direction="row" alignItems="center">
                    <FormControlLabel
                      control={<Switch checked={isMutable} onChange={(e) => setIsMutable(e.target.checked)} />}
                      label="Mutable"
                    />
                    <FormHelperText>
                      Turning this switch off will render the NFT immutable, meaning no changes to meta, royalties etc
                      will be permitted.
                    </FormHelperText>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Certified collection"
                      error={!!collectionError}
                      value={collection}
                      color={collection && !collectionError ? "success" : "primary"}
                      onChange={(e) => setCollection(e.target.value)}
                      helperText={collectionError}
                      fullWidth
                    />
                    <Button variant="outlined" onClick={toggleCollectionModal} sx={{ height: "55px" }}>
                      Choose collection
                    </Button>
                  </Stack>
                </Stack>
              )}

              <Stack direction="row" alignItems="center">
                <FormControlLabel
                  control={<Switch checked={pNft} onChange={(e) => setPNft(e.target.checked)} />}
                  label="pNFT"
                />
                <FormHelperText>Mint a pNFT (royalty enforced).</FormHelperText>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
              >
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
                <DialogTitle id="alert-dialog-title">
                  {`${
                    !createMany && isCollection ? "Collection" : `NFT${createMany && quantity > 1 ? "s" : ""}`
                  } created sucessfully!`}
                </DialogTitle>
                <DialogContent>
                  {!createMany && <Typography variant="h6">{keypair.publicKey}</Typography>}
                  <DialogContentText id="alert-dialog-description">
                    Your {!createMany && isCollection ? "Collection" : `NFT${createMany && quantity > 1 ? "s" : ""}`}{" "}
                    {createMany && quantity ? "have" : "has"} been created sucessfully.{" "}
                    {!createMany && (
                      <span>
                        You can view the token details{" "}
                        <a
                          href={`https://solscan.io/token/${keypair.publicKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          here
                        </a>
                        .
                      </span>
                    )}
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
        <NftSelector
          nfts={collections}
          open={collectionModalOpen}
          onClose={toggleCollectionModal}
          onSelect={selectCollection}
          selected={collection}
        />
      </Grid>
      <Grid item xs={12} sm={5}>
        <Card>
          <CardContent>
            <PreviewNft
              name={name}
              isCollection={isCollection}
              image={image && URL.createObjectURL(image)}
              multimedia={multimedia && URL.createObjectURL(multimedia)}
              multimediaType={multimediaType}
              description={description}
              attributes={completedAttributes}
              createMany={createMany}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
