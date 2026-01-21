import {
  Grid,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  FormHelperText,
  IconButton,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Link,
} from "@mui/material"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { isEqual } from "lodash"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { FEES_WALLET, METAPLEX_COMPATIBILITY_RULE_SET, METAPLEX_RULE_SET, SYSTEM_PROGRAM_PK } from "./constants"
import { DigitalAssetWithJson, DigitalAssetWithJsonAndToken, useNfts } from "./context/nft"
import { MultimediaCategory, getFee, getMultimediaType, shorten } from "./helpers/utils"
import { NftSelector } from "./NftSelector"
import { PreviewNft } from "./PreviewNft"
import puppeteer from "puppeteer"

import {
  PublicKey,
  createGenericFileFromBrowserFile,
  isSome,
  none,
  sol,
  transactionBuilder,
  publicKey as umiPublicKey,
  unwrapOption,
  unwrapOptionRecursively,
} from "@metaplex-foundation/umi"
import { useUmi } from "./context/umi"
import { AddCircleRounded, AirportShuttle, ExpandMore, RemoveCircleRounded } from "@mui/icons-material"
import {
  Creator,
  DigitalAsset,
  JsonMetadata,
  RuleSetToggle,
  TokenStandard,
  TokenState,
  fetchAllDigitalAssetWithTokenByMint,
  fetchDigitalAsset,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAssetWithTokenByMint,
  fetchJsonMetadata,
  findMetadataPda,
  setCollectionSize,
  unverifyCollectionV1,
  updateV1,
  verifyCollectionV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { transferSol } from "@metaplex-foundation/mpl-toolbox"
import { getDigitalAsset, getMintlist } from "../../helpers/helius"
import { useAccess } from "../../context/access"
import { hasProfanity } from "../../helpers/has-profanity"
import { usePriorityFees } from "../../context/priority-fees"
import { packTx, sendAllTxsWithRetries } from "../../helpers/transactions"
import { imageCdn } from "../../helpers/utils"

export function UpdateNft() {
  const { connection } = useConnection()
  const { feeLevel } = usePriorityFees()
  const { account } = useAccess()
  const { loading: nftsLoading, createdNfts, collections } = useNfts()
  const [loading, setLoading] = useState(false)
  const [publicKey, setPublicKey] = useState("")
  const [nft, setNft] = useState<DigitalAssetWithJsonAndToken | null>(null)
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const [isCollection, setIsCollection] = useState(false)
  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [description, setDescription] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [newImage, setNewImage] = useState<File | null>(null)
  const [website, setWebsite] = useState("")
  const [attributes, setAttributes] = useState<any[]>([])
  const [creators, setCreators] = useState<Creator[]>([])
  const [royalties, setRoyalties] = useState("")
  const [sellerFeeBasisPoints, setSellerFeeBasisPoints] = useState<number | null>(null)
  const [royaltiesError, setRoyaltiesError] = useState<string | null>(null)
  const [nftModalOpen, setNftModalOpen] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [isMutable, setIsMutable] = useState(true)
  const [collection, setCollection] = useState<string | null>(null)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [updateAuthority, setUpdateAuthority] = useState("")
  const [updateAuthorityError, setUpdateAuthorityError] = useState<string | null>(null)
  const [newCollectionSize, setNewCollectionSize] = useState<number | null>(null)
  const [ruleSet, setRuleSet] = useState<string>("")
  const [ruleSetError, setRuleSetError] = useState<string | null>(null)
  const [programmableConfigType, setProgrammableConfigType] = useState("metaplex")

  const umi = useUmi()
  const [multimedia, setMultimedia] = useState<string>("")
  const [newMultimedia, setNewMultimedia] = useState<File | null>(null)
  const [multimediaType, setMultimediaType] = useState<MultimediaCategory | null>(null)

  const wallet = useWallet()

  useEffect(() => {
    if (!ruleSet) {
      setRuleSetError(null)
      return
    }

    try {
      umiPublicKey(ruleSet)
      setRuleSetError(null)
    } catch {
      setRuleSetError("Invalid rule set address")
    }
  }, [ruleSet])

  useEffect(() => {
    if (programmableConfigType === "metaplex") {
      setRuleSet(METAPLEX_RULE_SET)
    } else if (programmableConfigType === "compatibility") {
      setRuleSet(METAPLEX_COMPATIBILITY_RULE_SET)
    } else if (programmableConfigType === "none") {
      setRuleSet("")
    } else {
      setRuleSet(unwrapOptionRecursively(nft?.metadata.programmableConfig)?.ruleSet || "")
    }
  }, [programmableConfigType])

  async function checkToken() {
    if (!wallet.publicKey || !wallet.connected) {
      return
    }
    if (publicKey) {
      try {
        const nft = await fetchDigitalAssetWithTokenByMint(umi, umiPublicKey(publicKey))
        console.log({ nft })

        if (
          isSome(nft.metadata.tokenStandard) &&
          ![TokenStandard.NonFungible, TokenStandard.ProgrammableNonFungible].includes(
            unwrapOption(nft.metadata.tokenStandard) || 0
          )
        ) {
          setPublicKeyError(
            "Type mismatch, looks like this mint isn't an NFT token. Check out our other tools to update other types of tokens such as Fungible Tokens"
          )
          return
        } else {
          try {
            let json = await fetchJsonMetadata(umi, nft.metadata.uri)
            if (typeof json === "string") {
              json = JSON.parse(json)
            }
            setNft({ ...nft, json })
          } catch {
            try {
              const da = await getDigitalAsset(nft.publicKey)
              console.log({ da })
              if (da) {
                const json: JsonMetadata = {
                  name: da.content?.metadata.name,
                  description: da.content?.metadata.description,
                  symbol: da.content?.metadata.symbol,
                  seller_fee_basis_points: da.royalty?.basis_points,
                  attributes: da.content?.metadata.attributes as any[],
                  external_url: da.content?.links?.external_url,
                  image: da.content?.links?.image,
                  animation_url: da.content?.links?.animation_url,
                  properties: {
                    files: da.content?.files as any[],
                  },
                }
                setNft({
                  ...nft,
                  json,
                })
              } else {
                throw new Error("Not found")
              }
            } catch {
              // stupid bs fallback as nftstorage are actual idiots.
              const { data: json } = await axios.post("/api/get-json", { uri: nft.metadata.uri })
              console.log(json)
              setNft({ ...nft, json })
            }
          }
        }

        if (nft.metadata.updateAuthority !== umi.identity.publicKey) {
          setPublicKeyError(
            `Update authority mismatch. Connect with ${shorten(nft.metadata.updateAuthority)} to update this NFT.`
          )
        } else {
          setPublicKeyError(null)
        }
      } catch (err: any) {
        console.log(err.stack)
        setPublicKeyError("Invalid token mint address")
        setNft(null)
      }
    } else {
      setPublicKeyError(null)
      setNft(null)
    }
  }

  useEffect(() => {
    if (royalties) {
      const val = parseInt(royalties) * 100
      if (val < 0) {
        setRoyaltiesError("Royalties must be 0% or more")
      } else if (val > 10000) {
        setRoyaltiesError("Royalties must be 100% or less")
      } else {
        setRoyaltiesError(null)
      }
      setSellerFeeBasisPoints(val)
    } else {
      setRoyaltiesError(null)
      setSellerFeeBasisPoints(0)
    }
  }, [royalties])

  useEffect(() => {
    reset()
  }, [nft])

  function reset() {
    if (nft) {
      setName(nft.metadata.name || nft.json.name || "")
      setSymbol(nft.metadata.symbol || nft.json.symbol || "")
      setImage(nft.json?.image || "")
      setNewImage(null)
      setRoyalties(`${nft.metadata.sellerFeeBasisPoints / 100}`)
      setDescription(nft.json?.description || "")
      setWebsite(nft.json?.external_url || "")
      setAttributes(nft.json?.attributes?.length ? nft.json.attributes : [{ trait_type: "", value: "" }])
      setIsMutable(nft.metadata.isMutable)
      setCreators(unwrapOptionRecursively(nft.metadata.creators) || [])
      setIsCollection(isSome(nft.metadata.collectionDetails))
      setCollection(unwrapOption(nft.metadata.collection)?.key || "")
      setUpdateAuthority(nft.metadata.updateAuthority)
      setMultimedia(nft.json?.animation_url || "")
      setNewMultimedia(null)
      setMultimediaType((nft.json?.properties?.category as MultimediaCategory) || null)
      const rules = unwrapOptionRecursively(nft.metadata.programmableConfig)?.ruleSet || ""
      setRuleSet(rules)

      if (rules === METAPLEX_RULE_SET) {
        setProgrammableConfigType("metaplex")
      } else if (rules === METAPLEX_COMPATIBILITY_RULE_SET) {
        setProgrammableConfigType("compatibility")
      } else if (rules === "") {
        setProgrammableConfigType("none")
      } else {
        setProgrammableConfigType("custom")
      }
    } else {
      setName("")
      setSymbol("")
      setImage("")
      setNewImage(null)
      setRoyalties("")
      setDescription("")
      setWebsite("")
      setAttributes([])
      setCreators([])
      setIsMutable(true)
      setIsCollection(false)
      setCollection("")
      setUpdateAuthority("")
      setMultimedia("")
      setNewMultimedia(null)
      setRuleSet("")
    }
  }

  useEffect(() => {
    if (newMultimedia) {
      const parts = newMultimedia.name.split(".")
      const ext = parts[parts.length - 1]
      setMultimediaType(getMultimediaType(ext))
    } else {
      setMultimediaType(null)
    }
  }, [newMultimedia])

  function updateMultimedia(e: any) {
    setNewMultimedia(e.target.files[0])
  }

  useEffect(() => {
    checkToken()
  }, [publicKey, wallet.publicKey])

  const dirty =
    nft &&
    (name !== (nft.metadata.name || nft.json?.name) ||
      symbol !== (nft.metadata.symbol || nft.json?.symbol) ||
      description !== nft.json?.description ||
      newImage ||
      newMultimedia ||
      sellerFeeBasisPoints !== nft.metadata.sellerFeeBasisPoints ||
      website !== nft.json?.external_url ||
      isMutable !== nft.metadata.isMutable ||
      collection !== unwrapOption(nft.metadata.collection)?.key ||
      !isEqual(
        attributes.filter((att) => att.trait_type || att.value),
        nft.json?.attributes
      ) ||
      !isEqual(creators, unwrapOptionRecursively(nft.metadata.creators)) ||
      updateAuthority !== nft.metadata.updateAuthority ||
      ruleSet !== unwrapOptionRecursively(nft.metadata.programmableConfig)?.ruleSet)

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
        } as any,
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

  function toggleNftModal() {
    setNftModalOpen(!nftModalOpen)
  }

  function toggleCollectionModal() {
    setCollectionModalOpen(!collectionModalOpen)
  }

  function selectNft(mint: string) {
    setPublicKey(mint)
    toggleNftModal()
  }

  function selectCollection(mint: string) {
    setCollection(mint)
    toggleCollectionModal()
  }

  useEffect(() => {
    validateCollection()
  }, [collection, wallet.publicKey, wallet.connected])

  async function validateCollection() {
    if (!collection || (nft && collection === unwrapOption(nft.metadata.collection)?.key)) {
      setCollectionError(null)
      return
    }
    try {
      const nft = await fetchDigitalAsset(umi, umiPublicKey(collection))
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

  async function validateUa() {
    try {
      const pk = umiPublicKey(updateAuthority)
      const accInfo = await umi.rpc.getAccount(pk)
      if (accInfo.exists && accInfo.owner === SYSTEM_PROGRAM_PK) {
        setUpdateAuthorityError(null)
      } else {
        setUpdateAuthorityError("Public key owned by invalid program, are you sure this is a wallet address")
      }
    } catch (err) {
      setUpdateAuthorityError("Invalid update authority address")
    }
  }

  useEffect(() => {
    validateUa()
  }, [updateAuthority])

  async function uploadFiles() {
    const meta = nft?.json || {}

    if (newImage) {
      const file = await createGenericFileFromBrowserFile(newImage)
      let [imageUrl] = await umi.uploader.upload([file])
      imageUrl = `${imageUrl}?ext=${newImage.type.replace("image/", "")}`
      meta.image = imageUrl
      meta.properties = meta.properties || {}
      meta.properties.files = meta.properties.files || []
      meta.properties.files.unshift({
        uri: imageUrl,
        type: newImage.type,
      })
    }

    if (newMultimedia) {
      const file = await createGenericFileFromBrowserFile(newMultimedia)
      const parts = newMultimedia.name.split(".")
      const ext = parts[parts.length - 1]

      let [animation_url] = await umi.uploader.upload([file])
      animation_url = `${animation_url}?ext=${ext}`
      meta.animation_url = animation_url
      meta.properties = meta.properties || {}
      meta.properties.category = getMultimediaType(ext)
      meta.properties.files = meta.properties.files || []
      meta.properties.files.push({
        uri: animation_url,
        type: newMultimedia.type,
      })
    }

    if (name !== meta.name) {
      meta.name = name
    }

    if (symbol !== meta.symbol) {
      meta.symbol = symbol
    }

    if (description !== meta.description) {
      meta.description = description
    }

    const att = attributes.filter((attribute) => attribute.trait_type)

    if (!isEqual(att, meta.attributes)) {
      meta.attributes = att
    }

    if (website !== meta.external_url) {
      meta.external_url = website
    }

    const uri = await umi.uploader.uploadJson(meta)
    return uri
  }

  async function uploadAndCreate() {
    if (!nft) {
      return
    }
    const meta = nft?.json || {}

    const metaChanged =
      newImage ||
      newMultimedia ||
      name !== meta.name ||
      description !== meta.description ||
      symbol !== meta.symbol ||
      (website && website !== meta.external_url) ||
      (meta.external_url && website !== meta.external_url) ||
      !isEqual(
        attributes.filter((att) => att.trait_type),
        nft?.json.attributes || []
      )

    const parsedCreators = creators.map((c) => ({
      ...c,
      address: umiPublicKey(c.address),
    }))

    const uri = metaChanged ? await uploadFiles() : nft?.metadata.uri
    let tx = transactionBuilder()
    const nftCollection = nft ? unwrapOption(nft.metadata.collection) : null

    if (collection && collection !== nftCollection?.key && nftCollection?.verified) {
      const collectionDa = await fetchDigitalAsset(umi, nftCollection?.key)

      if (collectionDa.metadata.updateAuthority !== umi.identity.publicKey) {
        throw new Error("Connected wallet doesn't have authority to unverify the existing collection")
      }

      tx = tx.add(
        unverifyCollectionV1(umi, {
          metadata: nft?.metadata.publicKey,
          collectionMint: nftCollection.key,
        })
      )
    }

    const rs =
      unwrapOption(nft.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible &&
      ruleSet !== unwrapOptionRecursively(nft.metadata.programmableConfig)?.ruleSet
        ? ruleSet
          ? {
              __kind: "Set",
              fields: [umiPublicKey(ruleSet)],
            }
          : {
              __kind: "Clear",
            }
        : undefined

    const [withToken] = await fetchAllDigitalAssetWithTokenByMint(umi, nft.publicKey)

    if (!collection && isSome(nft.metadata.collection)) {
      const coll = unwrapOption(nft.metadata.collection)!
      tx = tx.add(
        unverifyCollectionV1(umi, {
          collectionMint: coll.key,
          metadata: nft.metadata.publicKey,
        })
      )
    }
    tx = tx.add(
      updateV1(umi, {
        mint: nft.publicKey,
        ruleSet: rs as RuleSetToggle,
        authorizationData: none(),
        authorizationRules: unwrapOptionRecursively(nft.metadata.programmableConfig)?.ruleSet || undefined,
        data: {
          name,
          symbol,
          sellerFeeBasisPoints: sellerFeeBasisPoints || 0,
          uri,
          creators: parsedCreators.length ? parsedCreators : null,
        },
        token: withToken.token.publicKey,
        newUpdateAuthority:
          updateAuthority !== nft.metadata.updateAuthority ? umiPublicKey(updateAuthority) : undefined,
        isMutable: isMutable !== nft.metadata.isMutable && !isCollection ? isMutable : undefined,
        edition: nft.edition?.publicKey,
        collection: collection
          ? collection !== unwrapOption(nft.metadata.collection)?.key
            ? {
                __kind: "Set",
                fields: [
                  {
                    key: umiPublicKey(collection),
                    verified: false,
                  },
                ],
              }
            : undefined
          : {
              __kind: "Clear",
            },
      })
    )

    if (collection !== unwrapOption(nft.metadata.collection)?.key && collection) {
      const collectionNft = await fetchDigitalAsset(umi, umiPublicKey(collection))
      if (collectionNft.metadata.updateAuthority === umi.identity.publicKey) {
        tx = tx.add(
          verifyCollectionV1(umi, {
            collectionMint: collectionNft.publicKey,
            metadata: findMetadataPda(umi, { mint: nft.publicKey }),
          })
        )
      }
    }

    const fee = getFee("nft-suite.update", account)

    if (fee) {
      tx = tx.add(
        transferSol(umi, {
          destination: FEES_WALLET,
          amount: sol(fee),
        })
      )
    }

    const { chunks, txFee } = await packTx(umi, tx, feeLevel)
    const signed = await Promise.all(chunks.map((c) => c.buildAndSign(umi)))
    await sendAllTxsWithRetries(umi, connection, signed)
  }

  async function updateNft() {
    try {
      setLoading(true)
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error("Wallet not connected")
      }

      if (publicKeyError) {
        throw new Error(publicKeyError)
      }

      if (!name) {
        throw new Error("Name is a required field")
      }

      if (!symbol) {
        throw new Error("Symbol is a required field")
      }

      if (newImage) {
        if (newImage.size > 20_000_000) {
          throw new Error("Image should be 20MB or less")
        }

        if (!["image/png", "image/jpg", "image/jpeg", "image/gif"].includes(newImage.type)) {
          throw new Error("Invalid image format")
        }
      }

      if (!description) {
        throw new Error("Description is a required field")
      }

      if (!dirty) {
        throw new Error("no changes detected")
      }

      if (updateAuthorityError) {
        throw new Error("Invalid update authority")
      }

      const content = `${name} ${symbol} ${description} ${website}`

      if (hasProfanity(content)) {
        throw new Error("Profanity detected")
      }

      const total = creators.reduce((sum, item) => sum + (item.share || 0), 0)

      if (!isCollection && sellerFeeBasisPoints && total !== 100) {
        throw new Error("Creator shares must add up to exactly 100")
      }

      const createPromise = uploadAndCreate()

      toast.promise(createPromise, {
        loading: "Updating NFT...",
        success: "NFT updated successfully!",
        error: "Error updating NFT",
      })

      await createPromise
      await checkToken()
    } catch (err: any) {
      console.log(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateCollectionSizeFromChain(e: any) {
    e.preventDefault()
    setLoading(true)
    const size = await getCollectionSize()
    setNewCollectionSize(size || 0)
    setLoading(false)
  }

  async function getCollectionSize() {
    try {
      const mints = await getMintlist({ collections: [publicKey] })
      return mints.length
    } catch (err) {
      toast.error("Error getting collection size")
    }
  }

  async function convertCollection() {
    if (!nft) {
      return
    }
    try {
      setLoading(true)

      if (!newCollectionSize && newCollectionSize !== 0) {
        throw new Error("Collection size is a required field")
      }

      const num = await getCollectionSize()

      if (num !== newCollectionSize) {
        if (
          !window.confirm(
            `Onchain data shows ${num} verified mints. You entered ${newCollectionSize}. Make sure you have added the correct number of verified mints as you wont be able to change this number once set.`
          )
        ) {
          return
        }
      }

      let tx = transactionBuilder().add(
        setCollectionSize(umi, {
          setCollectionSizeArgs: {
            size: newCollectionSize,
          },
          collectionAuthority: umi.identity,
          collectionMint: nft?.publicKey,
          collectionMetadata: nft?.metadata.publicKey,
        })
      )

      const fee = getFee("nft-suiteupdate", account)

      if (fee) {
        tx = tx.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(fee),
          })
        )
      }

      const promise = tx.sendAndConfirm(umi)

      toast.promise(promise, {
        loading: "Migrating to sized collection",
        success: "Migration complete",
        error: (err) => err.message || "Error migrating collection",
      })

      await promise
      await checkToken()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isValid = !publicKeyError && !royaltiesError && !collectionError && !updateAuthorityError && !ruleSetError
  const isLocked = nft?.tokenRecord?.state === TokenState.Locked

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={7}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Update NFT</Typography>

              <>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Token address"
                    error={!!publicKeyError}
                    value={publicKey}
                    color={publicKey && !publicKeyError ? "success" : "primary"}
                    onChange={(e) => setPublicKey(e.target.value)}
                    helperText={publicKeyError}
                    fullWidth
                  />
                  <Button variant="contained" onClick={toggleNftModal} sx={{ height: "55px", display: "flex" }}>
                    Choose NFT
                  </Button>
                </Stack>

                {nft && (
                  <>
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
                      <TextField
                        label="Website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        type="number"
                        label="Royalties percentage"
                        error={!!royaltiesError}
                        value={royalties}
                        onChange={(e) => setRoyalties(e.target.value)}
                        onWheel={(e: any) => e.target.blur()}
                        fullWidth
                        inputProps={{
                          min: 0,
                          max: 100,
                          step: 0.5,
                        }}
                        helperText={royaltiesError}
                      />
                    </Stack>
                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                          Select image
                          <input type="file" onChange={(e) => setNewImage(e.target.files?.[0] || null)} hidden />
                        </Button>
                        <img
                          src={
                            (newImage ? URL.createObjectURL(newImage) : image ? imageCdn(image) : image) || undefined
                          }
                          height={55}
                          alt="The current file"
                        />
                        {newImage && <Typography variant="body1">{newImage.name}</Typography>}
                      </Stack>
                      <FormHelperText>Accepted types: jpg, png, gif</FormHelperText>
                    </Stack>

                    <Stack>
                      <Stack direction="row" alignItems="center" spacing={0} sx={{ flexWrap: "wrap", gap: 2 }}>
                        <Button variant="contained" component="label" sx={{ minWidth: "max-content", height: "55px" }}>
                          Select new multimedia
                          <input type="file" onChange={updateMultimedia} hidden />
                        </Button>
                        {multimedia && (
                          <>
                            {multimediaType === "video" && (
                              <video
                                src={newMultimedia ? URL.createObjectURL(newMultimedia) : multimedia}
                                autoPlay
                                height={55}
                                width={55}
                                loop
                              ></video>
                            )}
                            {multimediaType === "audio" && (
                              <audio
                                src={newMultimedia ? URL.createObjectURL(newMultimedia) : multimedia}
                                autoPlay
                                loop
                              />
                            )}
                            {multimediaType === "vr" && (
                              <model-viewer
                                src={newMultimedia ? URL.createObjectURL(newMultimedia) : multimedia}
                                alt="Model"
                                camera-controls
                                ar-modes="webxr"
                                width="100%"
                                style={{
                                  width: "55px",
                                  height: "55px",
                                  background: "transparent",
                                }}
                              ></model-viewer>
                            )}
                          </>
                        )}
                        {newMultimedia && <Typography>{newMultimedia.name}</Typography>}
                      </Stack>
                      <FormHelperText>Accepted types: mp4, mov, mp3, flac, wav, glb, gltf</FormHelperText>
                    </Stack>

                    {!isCollection && (
                      <Stack spacing={2}>
                        <Typography variant="h5">Attributes</Typography>
                        {(attributes || []).map((attribute, index) => {
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
                        {(creators || []).map((creator, index) => {
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
                            Turning this switch off will render the NFT immutable, meaning no future changes to meta,
                            royalties etc will be permitted.
                          </FormHelperText>
                        </Stack>
                      </Stack>
                    )}

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
                    {isCollection && (
                      <FormHelperText>
                        You can group collections together under another collection. Collectionception.
                      </FormHelperText>
                    )}
                    <TextField
                      label="Update authority"
                      value={updateAuthority}
                      error={!!updateAuthorityError}
                      onChange={(e) => setUpdateAuthority(e.target.value)}
                      helperText={updateAuthorityError}
                      fullWidth
                    />

                    {unwrapOption(nft.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible && (
                      <>
                        <FormControl>
                          <FormLabel>pNFT config</FormLabel>
                          <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            value={programmableConfigType}
                            onChange={(e) => setProgrammableConfigType(e.target.value)}
                          >
                            <FormControlLabel
                              value="metaplex"
                              control={<Radio />}
                              label="Metaplex"
                              disabled={isLocked}
                            />
                            <FormControlLabel
                              value="compatibility"
                              control={<Radio />}
                              label="Compatibility"
                              disabled={isLocked}
                            />
                            <FormControlLabel value="none" control={<Radio />} label="None" disabled={isLocked} />
                            <FormControlLabel value="custom" control={<Radio />} label="Custom" disabled={isLocked} />
                          </RadioGroup>
                          {programmableConfigType === "custom" && (
                            <TextField
                              label="Rule set address"
                              error={!!ruleSetError}
                              value={ruleSet}
                              onChange={(e) => setRuleSet(e.target.value)}
                              helperText={
                                ruleSetError || "You can create a bespoke rule set at https://royalties.metaplex.com"
                              }
                            />
                          )}
                          {isLocked && <FormHelperText>Cannot update the ruleset of a locked pNFT</FormHelperText>}
                        </FormControl>
                      </>
                    )}

                    {!isCollection && (
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                          <Typography variant="h6">Convert to sized collection</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={2}>
                            <Typography>
                              This function is for updating a legacy collection NFT to a Sized Collection.
                            </Typography>
                            <Typography color="error">
                              WARNING: ensure this is actually a legacy collection NFT, and not a regular NFT
                            </Typography>
                            <Stack spacing={2} direction="row" alignItems="flex-start">
                              <TextField
                                label="Collection size"
                                value={newCollectionSize}
                                onChange={(e) => setNewCollectionSize(e.target.value ? parseInt(e.target.value) : null)}
                                onWheel={(e: any) => e.target.blur()}
                                type="number"
                                helperText={
                                  <Typography>
                                    <Link href="#" onClick={updateCollectionSizeFromChain}>
                                      Pull from onchain data
                                    </Link>{" "}
                                    - WARNING this function relies on a third party service and may not be accurate.
                                    Make sure to check this value.
                                  </Typography>
                                }
                                inputProps={{
                                  min: 0,
                                  step: 1,
                                }}
                                fullWidth
                              />
                              <Button
                                onClick={convertCollection}
                                variant="contained"
                                sx={{ height: "55px" }}
                                disabled={(!newCollectionSize && newCollectionSize !== 0) || loading}
                              >
                                Convert
                              </Button>
                            </Stack>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between">
                      <Button variant="outlined" onClick={reset} disabled={loading || !dirty}>
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={updateNft}
                        disabled={loading || !dirty || !isValid}
                      >
                        Update
                      </Button>
                    </Stack>
                  </>
                )}
              </>
            </Stack>
            <NftSelector
              nfts={createdNfts}
              open={nftModalOpen}
              onClose={toggleNftModal}
              onSelect={selectNft}
              selected={publicKey}
            />
            <NftSelector
              nfts={collections.filter((c: DigitalAsset) => {
                if (isCollection) {
                  return c.publicKey !== publicKey
                }
                return true
              })}
              open={collectionModalOpen}
              onClose={toggleCollectionModal}
              onSelect={selectCollection}
              selected={collection || undefined}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={5}>
        <Card>
          <CardContent>
            <PreviewNft
              name={name}
              isCollection={isCollection}
              image={newImage ? URL.createObjectURL(newImage) : image ? imageCdn(image) : image}
              multimedia={newMultimedia ? URL.createObjectURL(newMultimedia) : multimedia}
              multimediaType={multimediaType}
              description={description}
              attributes={attributes}
              createMany={false}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
