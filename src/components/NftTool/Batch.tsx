import {
  updateV1,
  verifyCollectionV1,
  DigitalAsset,
  fetchDigitalAsset,
  unverifyCreatorV1,
  fetchAllDigitalAssetByOwner,
  fetchAllDigitalAsset,
  TokenStandard,
  createAndMint,
  verifyCreatorV1,
  unverifyCollectionV1,
  Creator,
  mplTokenMetadata,
  UpdateV1InstructionDataArgs,
  UpdateV1InstructionAccounts,
} from "@metaplex-foundation/mpl-token-metadata"
import {
  publicKey,
  PublicKey as UmiPublicKey,
  transactionBuilder,
  unwrapOption,
  sol,
  TransactionBuilder,
  unwrapOptionRecursively,
  generateSigner,
  percentAmount,
  Keypair,
  isSome,
  signerIdentity,
  createSignerFromKeypair,
  Umi,
} from "@metaplex-foundation/umi"
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Icon,
  IconButton,
  ListItemText,
  Alert,
  Switch,
  Checkbox,
  Box,
  LinearProgress,
  Snackbar,
  SnackbarContent,
  CircularProgress,
  LinearProgressProps,
  Slider,
} from "@mui/material"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"
import base58 from "bs58"
import {
  isEqual,
  uniqBy,
  flatten,
  uniq,
  sample,
  chunk,
  filter,
  findKey,
  intersection,
  groupBy,
  upperFirst,
} from "lodash"
import { useState, useEffect, ReactNode } from "react"
import toast from "react-hot-toast"
import { METAPLEX_RULE_SET, METAPLEX_COMPATIBILITY_RULE_SET, SYSTEM_PROGRAM_PK, FEES_WALLET } from "./constants"
import { useNfts } from "./context/nft"
import { getFee, shorten } from "./helpers/utils"
import { NftSelector } from "./NftSelector"
import { NftsList } from "./NftsList"
import { AddCircleRounded, CheckCircleRounded, ExpandMore, RemoveCircleRounded } from "@mui/icons-material"
import { useUmi } from "./context/umi"
import { findAssociatedTokenPda, mplToolbox, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { getAnonUmi } from "./helpers/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { takeSnapshot } from "../../helpers/snapshot"
import { getMintlist } from "../../helpers/helius"
import { useAccess } from "../../context/access"
import { packTx } from "../../helpers/transactions"
import { usePriorityFees } from "../../context/priority-fees"
import { useTxs } from "../../context/txs"
import { useUmiSetSigner } from "../../context/umi"
import { ACCOUNT_TYPE, MAX_BATCH_SIZES, TX_THROTTLE } from "../../constants"
import { SliderWithLabel } from "../SliderWithLabel"
import { PriorityFeesSelector } from "../PriorityFeesSelector"

const BATCH_SIZE = 100

export const BatchUpdateNfts = () => {
  const {
    process,
    confirmedMints,
    speed,
    onSpeedChange,
    batchSize,
    onBatchSizeChange,
    active,
    isComplete,
    setUseNonce,
    useNonce,
  } = useTxs()

  const [immutableChecked, setImmutableChecked] = useState(false)
  const { collections, loading: nftsLoading } = useNfts()
  const { account, dandies, dandiesNeeded, nextLevel } = useAccess()
  const [secretKey, setSecretKey] = useState("")
  const [secretKeyError, setSecretKeyError] = useState<string | null>(null)
  const [keypair, setKeypair] = useState<Keypair | null>(null)
  const [lookupType, setLookupType] = useState("collections")
  const [hashlist, setHashlist] = useState("")
  const [hashlistError, setHashlistError] = useState<string | null>(null)
  const [parsed, setParsed] = useState([])
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [nfts, setNfts] = useState<DigitalAsset[]>([])
  const [nft, setNft] = useState<DigitalAsset | null>(null)
  const [royalties, setRoyalties] = useState("")
  const [royaltiesMismatch, setRoyaltiesMismatch] = useState(false)
  const [creators, setCreators] = useState<Creator[]>([])
  const [creatorsMismatch, setCreatorsMismatch] = useState(false)
  const [updateAuthority, setUpdateAuthority] = useState("")
  const [updateAuthorityMismatch, setUpdateAuthorityMismatch] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const [royaltiesError, setRoyaltiesError] = useState<string | null>(null)
  const [updateAuthorityError, setUpdateAuthorityError] = useState<string | null>(null)
  const [creatorToRemove, setCreatorToRemove] = useState("")
  const [sellerFeeBasisPoints, setSellerFeeBasisPoints] = useState(0)
  const wallet = useWallet()
  const [done, setDone] = useState([])
  const [creatorFilter, setCreatorFilter] = useState("")
  const [royaltiesFilter, setRoyaltiesFilter] = useState("")
  const [updateAuthorityFilter, setUpdateAuthorityFilter] = useState("")
  const [filtered, setFiltered] = useState<DigitalAsset[]>([])
  const [collection, setCollection] = useState<UmiPublicKey | "">("")
  const [collectionError, setCollectionError] = useState(null)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [tokenStandard, setTokenStandard] = useState(TokenStandard.NonFungible)
  const [negateFilter, setNegateFilter] = useState(false)
  const setUmiSigner = useUmiSetSigner()

  const [findReplaceCreators, setFindReplaceCreators] = useState([
    {
      find: "",
      replace: "",
    },
  ])
  const [uniqueCreators, setUniqueCreators] = useState<(Creator | null)[]>([])
  const [uniqueRoyalties, setUniqueRoyalties] = useState<number[]>([])
  const [uniqueUpdateAuthorities, setUniqueUpdateAuthorities] = useState<UmiPublicKey[]>([])
  const [toUpdate, setToUpdate] = useState<DigitalAsset[]>([])
  const { connection } = useConnection()

  const [ruleSet, setRuleSet] = useState<UmiPublicKey | string>("")
  const [ruleSetError, setRuleSetError] = useState<string | null>(null)
  const [programmableConfigType, setProgrammableConfigType] = useState("metaplex")

  const umi = useUmi()

  useEffect(() => {
    if (!ruleSet) {
      setRuleSetError(null)
      return
    }

    try {
      new PublicKey(ruleSet)
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
      setRuleSet((unwrapOptionRecursively(nft?.metadata.programmableConfig)?.ruleSet as UmiPublicKey) || "")
    }
  }, [programmableConfigType])

  function toggleCollectionModal() {
    setCollectionModalOpen(!collectionModalOpen)
  }

  const [expanded, setExpanded] = useState("lookup")

  const handleChange = (panel: any) => (_: any, isExpanded: any) => {
    setExpanded(isExpanded ? panel : false)
  }

  function selectCollection(mint: UmiPublicKey) {
    setCollection(mint)
    toggleCollectionModal()
  }

  const globalIsDirty =
    nft &&
    (nft.metadata.sellerFeeBasisPoints !== sellerFeeBasisPoints ||
      royaltiesMismatch ||
      nft.metadata.updateAuthority !== updateAuthority ||
      updateAuthorityMismatch ||
      unwrapOption(nft.metadata.collection)?.key !== collection)

  useEffect(() => {
    setUniqueCreators(
      uniqBy(flatten(nfts.map((n: DigitalAsset) => unwrapOption(n.metadata.creators))), "address").filter(Boolean)
    )
    setUniqueRoyalties(uniq(nfts.map((n: DigitalAsset) => n.metadata.sellerFeeBasisPoints)))
    setUniqueUpdateAuthorities(uniq(nfts.map((n: DigitalAsset) => n.metadata.updateAuthority)))
    const uniqueCollections = uniq(nfts.map((nft) => unwrapOption(nft.metadata.collection)?.key))
    if (uniqueCollections.length === 1) {
      setCollection(uniqueCollections[0] || "")
    }
    const uniqueTokenStandards = uniq(nfts.map((nft) => unwrapOption(nft.metadata.tokenStandard)))
    if (uniqueTokenStandards.length === 1) {
      setTokenStandard(uniqueTokenStandards[0] || TokenStandard.NonFungible)
    }
  }, [nfts])

  useEffect(() => {
    if (royalties) {
      const val = Number(royalties) * 100
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
    let filtered: DigitalAsset[] = [...nfts]
    if (creatorFilter) {
      filtered = filtered.filter((n) => unwrapOption(n.metadata.creators)?.find((c) => c.address === creatorFilter))
    }
    if (royaltiesFilter) {
      filtered = filtered.filter((n) => n.metadata.sellerFeeBasisPoints === Number(royaltiesFilter))
    }
    if (updateAuthorityFilter) {
      filtered = filtered.filter((n) => n.metadata.updateAuthority === updateAuthorityFilter)
    }
    if (negateFilter) {
      const keys = filtered.map((f) => f.publicKey)
      filtered = [...nfts].filter((n) => !keys.includes(n.publicKey))
    }
    setFiltered(filtered)
    if (!filtered.length) {
      setExpanded("lookup")
      setCreatorFilter("")
      setRoyaltiesFilter("")
    }
  }, [nfts, creatorFilter, royaltiesFilter, updateAuthorityFilter, negateFilter])

  async function checkReminted() {
    const ownedNfts = await fetchAllDigitalAssetByOwner(umi, umi.identity.publicKey)

    const toUpdate = filtered.filter((item) => !ownedNfts.map((n) => n.metadata.name).includes(item.metadata.name))

    setToUpdate(toUpdate)
  }

  useEffect(() => {
    if (expanded === "lookup") {
      setToUpdate([])
    } else if (expanded === "global") {
      if (globalIsDirty) {
        setToUpdate(filtered)
      } else {
        setToUpdate([])
      }
    } else if (expanded === "creators") {
      if (creatorsIsDirty) {
        setToUpdate(filtered)
      } else {
        setToUpdate([])
      }
    } else if (expanded === "find-replace") {
      const filters = findReplaceCreators.filter((item) => item.find && item.replace)
      setToUpdate(
        filtered.filter((n: DigitalAsset) =>
          unwrapOption(n.metadata.creators)?.find((c) => filters.map((c) => c.find).includes(c.address))
        )
      )
    } else if (expanded === "remove-creator") {
      setToUpdate(filtered.filter((n) => unwrapOption(n.metadata.creators)?.find((c) => c.address === creatorToRemove)))
    } else if (expanded === "verify-creator") {
      setToUpdate(
        filtered.filter((n) =>
          unwrapOption(n.metadata.creators)?.find((c) => c.address === umi.identity.publicKey && !c.verified)
        )
      )
    } else if (expanded === "certified-collection") {
      if (!collection) {
        setToUpdate([])
      } else {
        setToUpdate(
          filtered.filter((n) => {
            const coll = unwrapOption(n.metadata.collection)
            return !coll || !coll.verified || coll.key !== collection
          })
        )
      }
    } else if (expanded === "unverify-creator") {
      setToUpdate(
        filtered.filter((n) =>
          unwrapOption(n.metadata.creators)?.find((c) => c.address === umi.identity.publicKey && c.verified)
        )
      )
    } else if (expanded === "update-metadata") {
      setToUpdate(filtered)
    } else if (expanded === "remint-nfts") {
      checkReminted()
    } else if (expanded === "pnft-config") {
      setToUpdate(
        filtered.filter((n) => {
          return unwrapOptionRecursively(n.metadata.programmableConfig)?.ruleSet !== ruleSet
        })
      )
    } else if (expanded === "make-immutable") {
      setToUpdate(
        filtered.filter((n) => {
          return n.metadata.isMutable
        })
      )
    } else if (!expanded) {
      setToUpdate([])
    }
  }, [filtered, findReplaceCreators, expanded, creatorToRemove, globalIsDirty, collection, ruleSet])

  useEffect(() => {
    validateCollection()
  }, [collection, wallet.publicKey, wallet.connected])

  async function validateUa() {
    try {
      const pk = new PublicKey(updateAuthority)
      const accInfo = await connection.getParsedAccountInfo(pk)
      if (accInfo.value?.owner.toBase58() === SYSTEM_PROGRAM_PK) {
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

  async function lookupMints() {
    try {
      setLoading(true)
      const nftsPromise = fetchAllDigitalAsset(
        umi,
        parsed.map((mint) => publicKey(mint))
      )

      toast.promise(nftsPromise, {
        loading: "Parsing NFTs",
        success: "Done",
        error: "Error parsing NFTs",
      })

      const nfts = (await nftsPromise).filter(Boolean).filter((item) => item.mint.supply === BigInt(1))

      setNfts(nfts.sort((a, b) => a.publicKey.localeCompare(b.publicKey)))
    } catch (err: any) {
      console.log(err.stack)
      toast.error("Error looking up nfts, please try again")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (filtered.length) {
      setCreatorsMismatch(
        filtered.some((nft, index, all) => {
          return !isEqual(unwrapOption(all[0].metadata.creators), unwrapOption(nft.metadata.creators))
        })
      )
      setUpdateAuthorityMismatch(
        filtered.some((nft, index, all) => {
          return all[0].metadata.updateAuthority !== nft.metadata.updateAuthority
        })
      )
      setRoyaltiesMismatch(
        filtered.some((nft, index, all) => {
          return all[0].metadata.sellerFeeBasisPoints !== nft.metadata.sellerFeeBasisPoints
        })
      )
    } else {
      setRoyaltiesMismatch(false)
      setCreatorsMismatch(false)
      setUpdateAuthorityMismatch(false)
    }
  }, [filtered])

  useEffect(() => {
    if (filtered) {
      setNft(sample(filtered) || null)
    } else {
      setNft(null)
    }
  }, [filtered])

  useEffect(() => {
    if (nft) {
      setRoyalties(`${nft.metadata.sellerFeeBasisPoints / 100}`)
      setCreators(unwrapOption(nft.metadata.creators) || [])
      setUpdateAuthority(nft.metadata.updateAuthority)
      if (unwrapOption(nft.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible) {
        const rules = (unwrapOptionRecursively(nft.metadata.programmableConfig)?.ruleSet as UmiPublicKey) || null
        setRuleSet(rules || "")

        if (rules === METAPLEX_RULE_SET) {
          setProgrammableConfigType("metaplex")
        } else if (rules === METAPLEX_COMPATIBILITY_RULE_SET) {
          setProgrammableConfigType("compatibility")
        } else if (rules === "") {
          setProgrammableConfigType("none")
        } else {
          setProgrammableConfigType("custom")
        }
      }
    } else {
      setRoyalties("")
      setCreators([
        {
          address: "",
          share: 100,
        } as any,
      ])
      setUpdateAuthority("")
    }
  }, [nft])

  useEffect(() => {
    if (parsed.length) {
      try {
        parsed.forEach((item) => {
          const pk = new PublicKey(item)
        })
        setHashlistError(null)
        lookupMints()
      } catch {
        setHashlistError("Invalid hashlist")
      }
    }
  }, [parsed])

  useEffect(() => {
    if (hashlist) {
      try {
        const p = JSON.parse(hashlist.trim())
        setParsed(p)
        setHashlistError(null)
      } catch {
        setHashlistError("Invalid JSON")
        setParsed([])
      }
    } else {
      setParsed([])
      setHashlistError(null)
    }
  }, [hashlist])

  async function lookup() {
    try {
      setLoading(true)
      const trimmed = address.trim()

      if (!trimmed) {
        throw new Error("Enter a valid address")
      }

      try {
        const pk = new PublicKey(trimmed)
      } catch {
        throw new Error("Invalid public key")
      }

      const data = {
        [lookupType]: [trimmed],
      }

      const getHashlistPromise = getMintlist(data)

      toast.promise(getHashlistPromise, {
        loading: "Fetching hashlist",
        success: (res) => {
          if (!res.length) {
            throw new Error("No mints found, please double check the details you are entering.")
          }
          return `Found ${res.length} mints!`
        },
        error: (err) => err.message || "Error getting mints, please try again",
      })

      let mints = await getHashlistPromise
      setHashlist(JSON.stringify(mints, null, 2))
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
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

  function addFindReplaceCreator() {
    setFindReplaceCreators((prevState) => {
      return [
        ...prevState,
        {
          find: "",
          replace: "",
        },
      ]
    })
  }

  const removeFindReplaceCreator = (i: number) => () => {
    setFindReplaceCreators((prevState) => prevState.filter((item, index) => index !== i))
  }

  const updateFindReplaceCreator = (index: number, type: string) => (e: any) => {
    setFindReplaceCreators((prevValue) => {
      return prevValue.map((item, i) => {
        if (index === i) {
          return {
            ...item,
            [type]: e.target.value,
          }
        }
        return item
      })
    })
  }

  async function findAndReplaceCreators() {
    try {
      setLoading(true)

      const getInstruction = async (da: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        let tx = transactionBuilder()

        const creators = unwrapOption(da.metadata.creators)?.map((c) => {
          const toUpdate = findReplaceCreators.find((cr) => cr.find === c.address)
          if (!toUpdate) {
            return c
          }

          if (toUpdate.replace === umi.identity.publicKey) {
            return {
              address: publicKey(toUpdate.replace),
              share: c.share,
              verified: true,
            }
          }

          return {
            address: publicKey(toUpdate.replace),
            share: c.share,
            verified: false,
          }
        })

        tx = tx.add(
          updateV1(anonUmi, {
            mint: da.publicKey,
            authorizationRules: unwrapOptionRecursively(da.metadata.programmableConfig)?.ruleSet || undefined,
            edition: da.edition?.publicKey,
            data: {
              name: da.metadata.name,
              symbol: da.metadata.symbol,
              sellerFeeBasisPoints: da.metadata.sellerFeeBasisPoints,
              uri: da.metadata.uri,
              creators: creators || null,
            },
          })
        )

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }

      await sendUpdates(getInstruction)
      resetFindReplaceCreators()
    } catch (err) {
      console.log(err)
      toast.error("Error updating creators")
    } finally {
      setLoading(false)
    }
  }

  function resetFindReplaceCreators() {
    setFindReplaceCreators([
      {
        find: "",
        replace: "",
      },
    ])
  }

  async function validateCollection() {
    if (!collection) {
      setCollectionError(null)
      return
    }
    try {
      const nft = await fetchDigitalAsset(umi, publicKey(collection))
      if (!wallet.connected) {
        throw new Error("Wallet not connected")
      }
      if (!isSome(nft.metadata.collectionDetails)) {
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

  async function sendUpdates(getInstruction: Function) {
    async function doUpdate() {
      const updates = [...toUpdate.sort((a, b) => a.publicKey.localeCompare(b.publicKey))]
      const tx = transactionBuilder().add(await Promise.all(updates.map((da) => getInstruction(da))))
      const allMints = updates.map((u) => u.publicKey)

      await process(tx, allMints)
    }

    const updatePromise = doUpdate()

    toast.promise(updatePromise, {
      loading: `Building transactions for ${toUpdate.length} NFTs`,
      success: "Finished building txs, check progress below",
      error: "Error updating",
    })

    await updatePromise
  }

  async function verify() {
    try {
      setLoading(true)
      const getInstructions = (nft: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        const collection = unwrapOption(nft.metadata.collection)
        if (!collection) {
          return null
        }
        let tx = transactionBuilder().add(
          verifyCreatorV1(anonUmi, {
            // collectionMint: collection.key,
            metadata: nft.metadata.publicKey,
          })
        )

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }
      await sendUpdates(getInstructions)
    } catch (err) {
      toast.error("Error verifying")
    } finally {
      setLoading(false)
    }
  }

  async function addToCollection() {
    try {
      setLoading(true)

      const collectionMint = await fetchDigitalAsset(umi, publicKey(collection))

      const getInstruction = (digitalAsset: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        let tx = transactionBuilder()
        const daCollection = unwrapOption(digitalAsset.metadata.collection)
        if (daCollection && daCollection.key !== collection) {
          tx = tx.add(
            unverifyCollectionV1(umi, {
              collectionMint: daCollection.key,
              metadata: digitalAsset.metadata.publicKey,
            })
          )
        }

        tx = tx.add(
          updateV1(anonUmi, {
            authorizationRules: unwrapOptionRecursively(digitalAsset.metadata.programmableConfig)?.ruleSet || undefined,
            mint: digitalAsset.publicKey,
            collection: {
              __kind: "Set",
              fields: [
                {
                  key: publicKey(collection),
                  verified: false,
                },
              ],
            },
          })
        )

        if (collectionMint.metadata.updateAuthority === umi.identity.publicKey) {
          tx = tx.add(
            verifyCollectionV1(anonUmi, {
              collectionMint: publicKey(collectionMint.publicKey),
              metadata: publicKey(digitalAsset.metadata.publicKey),
            })
          )
        }

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }

      await sendUpdates(getInstruction)
    } catch (err: any) {
      console.log(err.stack)
      toast.error("Error adding to collection")
    } finally {
      setLoading(false)
    }
  }

  async function updatePnfts() {
    try {
      setLoading(true)

      const snapPromise = takeSnapshot(
        toUpdate.map((da) => da.publicKey),
        60,
        () => {}
      )

      toast.promise(snapPromise, {
        loading: "Taking snapshot of owners",
        success: "Snap completed",
        error: "Error taking snap",
      })

      const snap = await snapPromise

      const getInstruction = async (da: DigitalAsset) => {
        const owner = findKey(snap, (item) => item.mints.includes(da.publicKey))
        if (!owner) {
          return transactionBuilder()
        }
        let tx = transactionBuilder().add(
          updateV1(umi, {
            authorizationRules: unwrapOptionRecursively(da.metadata.programmableConfig)?.ruleSet || undefined,
            mint: da.publicKey,
            token: findAssociatedTokenPda(umi, {
              mint: da.publicKey,
              owner: publicKey(owner),
            }),
            ruleSet: ruleSet
              ? {
                  __kind: "Set",
                  fields: [publicKey(ruleSet)],
                }
              : {
                  __kind: "Clear",
                },
          })
        )

        return tx
      }

      await sendUpdates(getInstruction)
    } catch (err: any) {
      console.log(err.stack)
      toast.error("Error updating pNFTs")
    } finally {
      setLoading(false)
    }
  }

  async function unverify() {
    try {
      setLoading(true)
      const anonUmi = getAnonUmi(umi.identity.publicKey)
      const getInstruction = (da: DigitalAsset) => {
        let tx = transactionBuilder().add(
          unverifyCreatorV1(anonUmi, {
            metadata: da.metadata.publicKey,
          })
        )

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }

      await sendUpdates(getInstruction)
    } catch (err) {
      toast.error("Error unverfying")
    } finally {
      setLoading(false)
    }
  }

  async function updateCreators() {
    try {
      setLoading(true)

      if (creatorsMismatch) {
        throw new Error("Mismatched creators detected")
      }

      const getInstruction = (da: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        const updates: UpdateV1InstructionAccounts & UpdateV1InstructionDataArgs = {
          mint: da.publicKey,
          authorizationRules: unwrapOptionRecursively(da.metadata.programmableConfig)?.ruleSet || undefined,
          edition: da.edition?.publicKey,
          data: {
            name: da.metadata.name,
            symbol: da.metadata.symbol,
            uri: da.metadata.uri,
            sellerFeeBasisPoints: da.metadata.sellerFeeBasisPoints,
            creators,
          },
        }

        let tx = transactionBuilder().add(updateV1(anonUmi, updates))

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }
      await sendUpdates(getInstruction)
    } catch (err) {
      console.log(err)
      toast.error("Error updating")
    } finally {
      setLoading(false)
    }
  }

  async function updateGlobal() {
    try {
      setLoading(true)

      if (updateAuthorityError) {
        throw new Error("Invaid new update authority")
      }

      if (royaltiesError) {
        throw new Error("Invalid royalties")
      }

      const getInstruction = (da: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        const updates: UpdateV1InstructionAccounts & UpdateV1InstructionDataArgs = {
          mint: da.publicKey,
          authorizationRules: unwrapOptionRecursively(da.metadata.programmableConfig)?.ruleSet || undefined,
          edition: da.edition?.publicKey,
        }

        const originalCreators = unwrapOptionRecursively(da.metadata.creators)

        if (sellerFeeBasisPoints !== da.metadata.sellerFeeBasisPoints) {
          updates.data = {
            name: da.metadata.name,
            symbol: da.metadata.symbol,
            uri: da.metadata.uri,
            sellerFeeBasisPoints: da.metadata.sellerFeeBasisPoints,
            creators: originalCreators,
          }

          if (sellerFeeBasisPoints !== da.metadata.sellerFeeBasisPoints) {
            updates.data.sellerFeeBasisPoints = sellerFeeBasisPoints
          }
        }

        if (updateAuthority) {
          updates.newUpdateAuthority = publicKey(updateAuthority)
        }

        let tx = transactionBuilder().add(updateV1(anonUmi, updates))

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }
      await sendUpdates(getInstruction)
    } catch (err) {
      console.log(err)
      toast.error("Error updating")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isComplete) {
      lookupMints()
    }
  }, [isComplete])

  useEffect(() => {
    if (confirmedMints.length === 0) {
      setToUpdate([])
    }
  }, [confirmedMints.length])

  useEffect(() => {
    const total = creators.reduce((sum, item) => sum + (item.share || 0), 0)
    if (total !== 100) {
      setShareError("Total share must add up to 100")
    } else {
      setShareError(null)
    }
  }, [creators])

  function resetGlobal() {
    setRoyalties(`${(nft?.metadata.sellerFeeBasisPoints || 100) / 100}`)
    setUpdateAuthority(nft?.metadata.updateAuthority || "")
  }

  function resetCreators() {
    setCreators(nft ? unwrapOption(nft.metadata.creators) || [] : [])
  }

  const findReplaceCreatorsIsDirty = findReplaceCreators.find((f) => f.find && f.replace)
  const creatorsIsDirty = !isEqual(creators, unwrapOptionRecursively(nft?.metadata.creators))

  const isUpdateAuthority =
    nft &&
    (nft.metadata.updateAuthority === umi.identity.publicKey ||
      (keypair && nft.metadata.updateAuthority === keypair.publicKey))

  const isCreator = uniqueCreators.find((uc: any) => uc.address === umi.identity.publicKey)

  async function remint() {
    try {
      setLoading(true)
      const getInstruction = async (da: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        const mint = generateSigner(umi)
        let tx = transactionBuilder().add(
          createAndMint(anonUmi, {
            uri: da.metadata.uri,
            name: da.metadata.name,
            sellerFeeBasisPoints: percentAmount(da.metadata.sellerFeeBasisPoints / 100),
            mint,
            symbol: da.metadata.symbol,
            creators: unwrapOption(da.metadata.creators)?.map((c) => {
              if (c.address === umi.identity.publicKey) {
                return c
              }
              return {
                ...c,
                verified: false,
              }
            }),
            primarySaleHappened: da.metadata.primarySaleHappened,
            tokenStandard: tokenStandard || unwrapOption(da.metadata.tokenStandard) || 0,
          })
        )

        const fee = getFee("nft-suite.create", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }

      await sendUpdates(getInstruction)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function makeImmutable() {
    try {
      setLoading(true)
      const getInstruction = async (da: DigitalAsset) => {
        const anonUmi = getAnonUmi(umi.identity.publicKey)
        let tx = transactionBuilder().add(
          updateV1(anonUmi, {
            mint: da.publicKey,
            isMutable: false,
            authorizationRules: unwrapOptionRecursively(da.metadata.programmableConfig)?.ruleSet || undefined,
          })
        )

        const fee = getFee("nft-suite.batch", account)

        if (fee) {
          tx = tx.add(
            transferSol(anonUmi, {
              destination: FEES_WALLET,
              amount: sol(fee),
            })
          )
        }

        return tx
      }

      await sendUpdates(getInstruction)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={7}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Batch update NFTs</Typography>
              {wallet.connected ? (
                <Stack spacing={2}>
                  <Accordion expanded={expanded === "lookup"} onChange={handleChange("lookup")}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="h5">Lookup NFTs</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <FormControl>
                          <FormLabel id="hashlist-type-label">Lookup by:</FormLabel>
                          <RadioGroup
                            row
                            aria-labelledby="hashlist-type-label"
                            name="row-radio-buttons-group"
                            value={lookupType}
                            onChange={(e) => setLookupType(e.target.value)}
                          >
                            <FormControlLabel value="collections" control={<Radio />} label="Certified collection" />
                            <FormControlLabel value="creators" control={<Radio />} label="First verified creator" />
                            <FormControlLabel value="hashlist" control={<Radio />} label="Hashlist" />
                          </RadioGroup>
                        </FormControl>
                        {lookupType !== "hashlist" ? (
                          <Stack direction="row" spacing={2}>
                            <TextField
                              label={lookupType === "collections" ? "Certified collection" : "First verified creator"}
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              fullWidth
                            />
                            <Button variant="contained" onClick={lookup} disabled={loading || !address}>
                              Lookup
                            </Button>
                          </Stack>
                        ) : (
                          <TextField
                            multiline
                            fullWidth
                            error={!!hashlistError}
                            label="Hashlist"
                            value={hashlist}
                            onChange={(e) => setHashlist(e.target.value)}
                            rows={5}
                            InputProps={{
                              sx: {
                                fontFamily: "monospace !important",
                                whiteSpace: "prewrap",
                              },
                              spellCheck: false,
                            }}
                            helperText={hashlistError}
                          />
                        )}
                        {nfts.length > 1 && (
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="h6">Filters</Typography>
                              <FormControlLabel
                                label="Negate"
                                control={
                                  <Switch checked={negateFilter} onChange={(e) => setNegateFilter(e.target.checked)} />
                                }
                              />
                            </Stack>
                            <Typography>
                              Use these filters to target the correct mints in a partially updated collection, or if you
                              need to update creators and minted with multiple CMs
                            </Typography>
                            <FormControl fullWidth>
                              <InputLabel id="demo-simple-select-label">Filter by creator</InputLabel>
                              <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={creatorFilter}
                                label="Filter by creator"
                                onChange={(e) => setCreatorFilter(e.target.value)}
                              >
                                {uniqueCreators.map((c: any, index) => (
                                  <MenuItem key={index} value={c.address}>
                                    {shorten(c.address)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl fullWidth>
                              <InputLabel id="demo-simple-select-label">Filter by royalties</InputLabel>
                              <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={royaltiesFilter}
                                label="Filter by creator"
                                onChange={(e) => setRoyaltiesFilter(e.target.value)}
                              >
                                {uniqueRoyalties.map((c, index) => (
                                  <MenuItem key={index} value={c}>
                                    {c / 100}%
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl fullWidth>
                              <InputLabel id="demo-simple-select-label">Filter by update authority</InputLabel>
                              <Select
                                labelId="demo-simple-select-label"
                                value={updateAuthorityFilter}
                                label="Filter by update uthority"
                                onChange={(e) => setUpdateAuthorityFilter(e.target.value)}
                              >
                                {uniqueUpdateAuthorities.map((c, index) => (
                                  <MenuItem key={index} value={c}>
                                    {shorten(c)}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Stack>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={expanded === "global"}
                    onChange={handleChange("global")}
                    disabled={!filtered.length || !isUpdateAuthority}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Global updates</Typography>
                        {nft && !isUpdateAuthority && <Typography color="error">Connect with UA wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          Useful for blanket updates, setting all royalties to a new percentage, or setting a new update
                          authority.
                        </Typography>

                        <Typography fontWeight="bold" color="error">
                          WARNING: Updating this config will overwrite any bespoke or individual config
                        </Typography>

                        <Typography variant="h6">Royalties</Typography>
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
                        {royaltiesMismatch && (
                          <FormHelperText color="error">
                            WARNING: Multiple royalties percentages detected in provided hashlist. Batch update will
                            overwrite any custom configuration.
                          </FormHelperText>
                        )}

                        <Typography variant="h6">Update authority</Typography>
                        <TextField
                          label="Update authority"
                          value={updateAuthority}
                          error={!!updateAuthorityError}
                          onChange={(e) => setUpdateAuthority(e.target.value)}
                          helperText={updateAuthorityError}
                          fullWidth
                        />
                        {updateAuthorityMismatch && (
                          <FormHelperText color="error">
                            WARNING: Multiple update authorities detected in provided hashlist. We can only update NFTs
                            you hold authority for.
                          </FormHelperText>
                        )}
                        <Stack direction="row" spacing={2} justifyContent="space-between">
                          <Button variant="outlined" onClick={resetGlobal} disabled={loading || !globalIsDirty}>
                            Cancel
                          </Button>
                          <Button variant="contained" onClick={updateGlobal} disabled={loading || !globalIsDirty}>
                            Update
                          </Button>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={expanded === "make-immutable"}
                    onChange={handleChange("make-immutable")}
                    disabled={!filtered.length || !isUpdateAuthority}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Make immutable</Typography>
                        {nft && !isUpdateAuthority && <Typography color="error">Connect with UA wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>Make the selected NFTs immutable</Typography>
                        <Alert severity="error">
                          There is no going back from this! Make sure you know what you are doing.
                        </Alert>
                        <FormControlLabel
                          label="I know what I'm doing, once immutable, these NFTs can never be changed"
                          control={
                            <Checkbox
                              checked={immutableChecked}
                              onChange={(e) => setImmutableChecked(e.target.checked)}
                            />
                          }
                        />
                        {immutableChecked && (
                          <Button onClick={makeImmutable} color="error" variant="contained">
                            Make NFTs immutable
                          </Button>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion
                    expanded={expanded === "creators"}
                    onChange={handleChange("creators")}
                    disabled={!filtered.length || !isUpdateAuthority}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Creators</Typography>
                        {nft && !isUpdateAuthority && <Typography color="error">Connect with UA wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          You can only update unverified creators, or your own address if you are a verified creator. To
                          update other verified creators, you must first unverify them by connecting with the creator
                          wallet and unverifying below.
                        </Typography>

                        {(creators || []).map((creator, index) => {
                          return (
                            <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
                              <Icon color={creatorsMismatch ? "disabled" : "success"}>
                                {creator.verified ? <CheckCircleRounded /> : null}
                              </Icon>
                              <TextField
                                label="Address"
                                value={creator.address}
                                onChange={updateCreator(index, "address")}
                                disabled={creatorsMismatch}
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
                                disabled={creatorsMismatch}
                                inputProps={{
                                  min: 0,
                                  max: 100,
                                  step: 1,
                                }}
                                helperText={shareError}
                              />
                              {index === 0 ? (
                                <IconButton color="primary" onClick={addCreator} disabled={creatorsMismatch}>
                                  <AddCircleRounded />
                                </IconButton>
                              ) : (
                                <IconButton color="error" onClick={removeCreator(index)} disabled={creatorsMismatch}>
                                  <RemoveCircleRounded />
                                </IconButton>
                              )}
                            </Stack>
                          )
                        })}
                        {creatorsMismatch && (
                          <FormHelperText color="error">
                            Multiple creator configurations detected in provided hashlist. A global batch update can
                            only be performed on a consitent set of creators.
                            <br />
                            <br />
                            This is often the case if a collection is minted using multiple Candy Machines.
                            <br />
                            <br />
                            You can either update each subset separately by entering a hashlist for each part of the
                            collection
                            <br />
                            <br />
                            Alternatively you can use the find and replace functionality below to swap out existing
                            creator wallets but keep the shares the same.
                          </FormHelperText>
                        )}

                        <Stack direction="row" spacing={2} justifyContent="space-between">
                          <Button
                            variant="outlined"
                            onClick={resetCreators}
                            disabled={loading || !creatorsIsDirty || creatorsMismatch}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={updateCreators}
                            disabled={loading || !creatorsIsDirty || creatorsMismatch || !!royaltiesError}
                          >
                            Update
                          </Button>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion
                    expanded={expanded === "find-replace"}
                    onChange={handleChange("find-replace")}
                    disabled={!filtered.length || !isUpdateAuthority}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Find & replace creators</Typography>
                        {nft && !isUpdateAuthority && <Typography color="error">Connect with UA wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          You can only update unverified creators, or your own address if you are a verified creator. To
                          update other verified creators, you must first unverify them by connecting with the creator
                          wallet and unverifying below.
                        </Typography>

                        {findReplaceCreators.map((c, index) => {
                          return (
                            <Stack key={index} direction="row" spacing={2} alignItems="center">
                              <FormControl fullWidth>
                                <InputLabel id="demo-simple-select-label">Find</InputLabel>
                                <Select
                                  labelId="demo-simple-select-label"
                                  id="demo-simple-select"
                                  value={c.find}
                                  label="Age"
                                  onChange={updateFindReplaceCreator(index, "find")}
                                >
                                  {uniqueCreators
                                    .filter((uc: any) => !uc.verified || uc.address === umi.identity.publicKey)
                                    .filter(
                                      (uc: any) =>
                                        uc.address === c.find ||
                                        !findReplaceCreators.map((f) => f.find).includes(uc.address)
                                    )
                                    .map((c: any, index) => (
                                      <MenuItem key={index} value={c.address}>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                          <Icon color={c.verified ? "success" : "disabled"}>
                                            <CheckCircleRounded />
                                          </Icon>
                                          <Stack direction="row" spacing={2} flexGrow={1} alignItems="center">
                                            <ListItemText primary={shorten(c.address)} />
                                            <Typography>{c.share}%</Typography>
                                          </Stack>
                                        </Stack>
                                      </MenuItem>
                                    ))}
                                </Select>
                              </FormControl>

                              <TextField
                                label="Replace"
                                value={c.replace}
                                onChange={updateFindReplaceCreator(index, "replace")}
                                fullWidth
                              />
                              {index === 0 ? (
                                <IconButton color="primary" onClick={addFindReplaceCreator}>
                                  <AddCircleRounded />
                                </IconButton>
                              ) : (
                                <IconButton color="error" onClick={removeFindReplaceCreator(index)}>
                                  <RemoveCircleRounded />
                                </IconButton>
                              )}
                            </Stack>
                          )
                        })}
                        <Stack direction="row" spacing={2} justifyContent="space-between">
                          <Button
                            variant="outlined"
                            onClick={resetFindReplaceCreators}
                            disabled={loading || !findReplaceCreatorsIsDirty}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            onClick={findAndReplaceCreators}
                            disabled={loading || !findReplaceCreatorsIsDirty}
                          >
                            Update
                          </Button>
                        </Stack>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={expanded === "certified-collection"}
                    onChange={handleChange("certified-collection")}
                    disabled={!filtered.length}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Metaplex certified collection</Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          {toUpdate.length > 0
                            ? `${toUpdate.length} NFT${toUpdate.length === 1 ? "" : "s"} to be added to collection`
                            : "All NFTs added to this collection"}
                        </Typography>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                          <TextField
                            label="Certified collection"
                            error={!!collectionError}
                            value={collection}
                            color={collection && !collectionError ? "success" : "primary"}
                            onChange={(e: any) => setCollection(e.target.value)}
                            helperText={collectionError}
                            fullWidth
                          />
                          <Button variant="outlined" onClick={toggleCollectionModal} sx={{ height: "55px" }}>
                            Choose collection
                          </Button>
                        </Stack>

                        <Button variant="contained" disabled={!toUpdate.length || loading} onClick={addToCollection}>
                          Add to collection
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  {/* <Accordion expanded={expanded === 'remove-creator'} onChange={handleChange('remove-creator')} disabled={!nfts.length || !isUpdateAuthority}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h5">Remove creator</Typography>
              {
                nft && !isUpdateAuthority && <Typography color="error">Connect with UA wallet</Typography>
              }
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
              <Typography>Unilaterally remove a creator without replacing. Useful if you want to remove the CM to make room for adding another creator. Only 0% creators can be removed. If you remove a verified creator, we STRONGLY advise verifying a new creator by connecting with the relevant creator wallet and using the Verify Creator helper below</Typography>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth>
                <InputLabel id="remove-creator-label">Remove creator</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={creatorToRemove}
                  label="Remove creator"
                  onChange={e => setCreatorToRemove(e.target.value)}
                >
                  {
                  uniqueCreators.filter(c => c.share === 0).map((c, index) => (
                    <MenuItem value={c.address}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Icon color={c.verified ? "success" : "disabled"}><CheckCircleRoundedIcon /></Icon>
                      <Stack direction="row" spacing={2} flexGrow={1} alignItems="center">
                      <ListItemText
                        primary={shorten(c.address)}
                      />
                      <Typography>{c.share}%</Typography>
                      </Stack>
                    </Stack>
                    </MenuItem>
                  ))
                  }
                </Select>
                </FormControl>
                <Button variant="contained" color="error" disabled={!creatorToRemove || loading} onClick={removeCreatorAction}>Remove</Button>
              </Stack>
              </Stack>
            </AccordionDetails>
            </Accordion> */}
                  <Accordion
                    expanded={expanded === "verify-creator"}
                    onChange={handleChange("verify-creator")}
                    disabled={!filtered.length || !isCreator}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Verify creator</Typography>
                        {nft && !isCreator && <Typography color="error">Connect with creator wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          {toUpdate.length > 0
                            ? `${toUpdate.length} NFT${toUpdate.length === 1 ? "" : "s"} to be signed`
                            : "All NFTs signed by this creator"}
                        </Typography>
                        {toUpdate.length > 0 && (
                          <Typography>
                            Sign the NFTs with the creator wallet you are connected with to verify this creator.
                          </Typography>
                        )}

                        <Button variant="contained" disabled={!toUpdate.length || loading} onClick={verify}>
                          Verify creator {shorten(umi.identity.publicKey)}
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={expanded === "unverify-creator"}
                    onChange={handleChange("unverify-creator")}
                    disabled={!filtered.length || !isCreator}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Unverify creator</Typography>
                        {nft && !isCreator && <Typography color="error">Connect with creator wallet</Typography>}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>
                          {toUpdate.length > 0
                            ? `${toUpdate.length} NFT${toUpdate.length === 1 ? "" : "s"} to be unsigned`
                            : "All NFTs unverified by this creator"}
                        </Typography>
                        {toUpdate.length > 0 && (
                          <Typography>
                            Sign the NFTs with the creator wallet you are connected with to unverify this creator.
                          </Typography>
                        )}

                        <Button variant="contained" disabled={!toUpdate.length || loading} onClick={unverify}>
                          Unverify creator {shorten(umi.identity.publicKey)}
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  {/* <Accordion expanded={expanded === 'update-metadata'} onChange={handleChange('update-metadata')} disabled={!filtered.length || !isUpdateAuthority}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h5">Unilateral metadata update</Typography>
              {
                nft && !isUpdateAuthority && <Typography color="error">Connect with Update Authority wallet</Typography>
              }
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
              <Typography>Update the image and/or metadata for <strong>every</strong> NFT to the details below.</Typography>
              <Typography>Use with caution, all NFTs will updated to use the SAME image and meta.</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                value={name}
                label="Name"
                onChange={e => setName(e.target.value)}
                inputProps={{
                  'data-form-type': "other" 
                }}
                helperText={`The name of your NFT`}
                fullWidth
                />
                <FormControlLabel control={<Switch checked={includeSequentialNumber} onChange={e => setIncludeSequentialNumber(e.target.checked)
                } />} label="Include sequential number" />
                
              </Stack>

              <TextField
                multiline
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                helperText="A short description to be included in the off chain token metadata"
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                label="Website"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                fullWidth
                />
                <TextField
                label="Symbol"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                helperText="e.g. DANDY, JGNL"
                />
              </Stack>
          
              <Stack>
                <Stack direction="row" spacing={2} justifyContent="space-between">
                <Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    component="label"
                    sx={{ minWidth: 'max-content', height: "55px" }}
                  >
                    Select image
                    <input
                    type="file"
                    onChange={updateImage}
                    hidden
                    />
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
                <Button
                  variant="contained"
                  component="label"
                  sx={{ minWidth: 'max-content', height: "55px" }}
                >
                  Add multimedia
                  <input
                  type="file"
                  onChange={updateMultimedia}
                  hidden
                  />
                </Button>
                {
                  multimedia && (
                  <>
                    {
                    multimediaType === "video" && <video src={URL.createObjectURL(multimedia)} autoPlay width={55} loop></video>
                    }
                    {
                    multimediaType === "audio" && <audio src={URL.createObjectURL(multimedia)} autoPlay loop></audio>
                    }
                    {
                    multimediaType === 'vr' && <model-viewer
                      src={URL.createObjectURL(multimedia)}
                      alt="Model"
                      camera-controls
                      ar-modes="webxr"
                      width="100%"
                      style={{ height: "55px", background: "transparent"}}
                    >
                    </model-viewer>
                    }
                  </>
                  )
                }
                {multimedia && <Typography variant="body1">{multimedia.name}</Typography>}
                </Stack>
                <FormHelperText>Accepted types: mp4, mov, mp3, flac, wav, glb, gltf</FormHelperText>
              </Stack>

              <Stack spacing={2}>
                <Typography variant="h5">Attributes</Typography>
                {
                attributes.map((attribute, index) => {
                  return (
                  <Stack key={index} direction={{ xs: 'column', sm: 'row'}} spacing={2}>
                    <TextField
                    label="Trait type"
                    value={attribute.trait_type}
                    onChange={updateAttribute(index, 'trait_type')}
                    fullWidth
                    />
                    <TextField
                    label="Value"
                    value={attribute.value}
                    onChange={updateAttribute(index, 'value')}
                    fullWidth
                    />
                      {
                        index === 0
                        ? (
                          <IconButton color="primary" onClick={addAttribute}>
                          <AddCircleRoundedIcon />
                          </IconButton>
                        )
                        : (
                          <IconButton color="error" onClick={removeAttribute(index)}>
                          <RemoveCircleRoundedIcon />
                          </IconButton>
                        ) 
                      }
                      
                      </Stack>
                    )
                    })
                  }
                  
                  </Stack>
              
              <Button variant="contained" disabled={!toUpdate.length || loading} onClick={updateMetadata}>Update</Button>
              </Stack>
            </AccordionDetails>
            </Accordion> */}
                  <Accordion
                    expanded={expanded === "remint-nfts"}
                    onChange={handleChange("remint-nfts")}
                    disabled={!filtered.length}
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">Clone NFTs</Typography>
                        {nft && !isUpdateAuthority && (
                          <Typography color="error">Connect with Update Authority wallet</Typography>
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <Typography>Remint a set of NFTs or an entire collection.</Typography>
                        {/* <Typography>
                          Example use case: you need to migrate an NFT collection to pNFTs and you missed the Metaplex
                          deadline.
                        </Typography>
                        <Typography>
                          To prevent malicious users minting fake NFT collections, this function can only be performed
                          using the original update authority wallet.
                        </Typography> */}
                        <Alert severity="info">
                          {toUpdate.length > 0
                            ? `${toUpdate.length} NFT${toUpdate.length === 1 ? "" : "s"} to be reminted`
                            : "All NFTs reminted"}
                        </Alert>
                        {/* <FormControl>
                          <FormLabel>Token Standard</FormLabel>
                          <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            value={tokenStandard}
                            onChange={(e) =>
                              setTokenStandard(TokenStandard[Number(e.target.value) as keyof object] as )
                            }
                          >
                            <FormControlLabel value={TokenStandard.NonFungible} control={<Radio />} label="NFT" />
                            <FormControlLabel
                              value={TokenStandard.ProgrammableNonFungible}
                              control={<Radio />}
                              label="pNFT"
                            />
                          </RadioGroup>
                        </FormControl> */}
                        {toUpdate.length > 0 && (
                          <Typography>
                            Clone the selected NFTs - this will remint the selected NFTs into the connected wallet
                          </Typography>
                        )}

                        <Button variant="contained" disabled={!toUpdate.length || loading} onClick={remint}>
                          Clone NFTs
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                  <Accordion
                    expanded={expanded === "pnft-config"}
                    onChange={handleChange("pnft-config")}
                    disabled={
                      !filtered.length ||
                      !isUpdateAuthority ||
                      !filtered.find(
                        (n) => unwrapOption(n.metadata.tokenStandard) === TokenStandard.ProgrammableNonFungible
                      )
                    }
                  >
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Typography variant="h5">pNFT Config</Typography>
                        {nft && !isUpdateAuthority && (
                          <Typography color="error">Connect with Update Authority wallet</Typography>
                        )}
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        <FormControl>
                          <FormLabel>pNFT config</FormLabel>
                          <RadioGroup
                            aria-labelledby="demo-radio-buttons-group-label"
                            value={programmableConfigType}
                            onChange={(e) => setProgrammableConfigType(e.target.value)}
                          >
                            <FormControlLabel value="metaplex" control={<Radio />} label="Metaplex" />
                            <FormControlLabel value="compatibility" control={<Radio />} label="Compatibility" />
                            <FormControlLabel value="none" control={<Radio />} label="None" />
                            <FormControlLabel value="custom" control={<Radio />} label="Custom" />
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
                        </FormControl>
                        <Button variant="contained" disabled={!toUpdate.length || loading} onClick={updatePnfts}>
                          Update pNFTs
                        </Button>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Stack>
              ) : (
                <Typography>Wallet disconnected</Typography>
              )}
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
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                  <Typography variant="h5">Settings</Typography>
                  <Typography fontWeight="bold" textTransform="uppercase">
                    {account}
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <SliderWithLabel
                    label="Speed"
                    labelRight={`Max: ${1000 / (useNonce ? 400 : TX_THROTTLE[account])} Tx/s`}
                    min={1}
                    max={1000 / (useNonce ? 400 : TX_THROTTLE[account])}
                    value={speed}
                    onChange={onSpeedChange}
                    unit="Tx/s"
                    tooltip="This is the speed at which transactions are broadcasted to the blockchain. Each transaction is continually sent until it is picked up or expires. Reduce this number if you are getting rate-limit errors."
                    disabled={useNonce || active}
                  />

                  <SliderWithLabel
                    label="Batch size"
                    labelRight={`Max: ${MAX_BATCH_SIZES[account]}`}
                    min={1}
                    max={MAX_BATCH_SIZES[account]}
                    value={batchSize}
                    onChange={onBatchSizeChange}
                    tooltip="Reduce this number if you are getting a large percent of expired transactions. Also wallets will crash if too many transactions are signed at once, Solflare handles 200 per batch, whilst Phantom & Backpack can struggle with more than 100"
                    disabled={active}
                  />

                  {/* {account !== ACCOUNT_TYPE.unlimited && (
                    <Typography fontWeight="bold" color="primary">
                      Increase your dandies holdings by {dandiesNeeded} for tx speed of{" "}
                      {1000 / TX_THROTTLE[nextLevel as ACCOUNT_TYPE]} Tx/s.
                    </Typography>
                  )} */}
                  <Stack spacing={2}>
                    <Typography fontWeight="bold">Priority fees</Typography>
                    <PriorityFeesSelector disabled={active} />
                  </Stack>

                  {/* <Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                      <Typography fontWeight="bold">Use durable nonce?</Typography>
                      <Switch checked={useNonce} onChange={(e) => setUseNonce(e.target.checked)} />
                    </Stack>
                    <Typography variant="body2">
                      {useNonce
                        ? "Transactions will not expire, limited to one tx per slot (400ms) - useful for set-and-forget."
                        : "Full speed, unconfirmed transactions will expire and need resigning after ~150 blocks"}
                    </Typography>
                  </Stack> */}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h5">NFTs to update</Typography>
                  <Typography variant="h6">{filtered.length} NFTs found</Typography>
                </Stack>

                <NftsList nfts={toUpdate} done={confirmedMints} />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}
