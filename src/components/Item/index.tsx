import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  CircularProgressProps,
  Container,
  Dialog,
  FormControlLabel,
  IconButton,
  Link,
  Rating,
  Stack,
  SvgIcon,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
} from "@mui/material"
import { getAssetWithProof, delegate } from "@metaplex-foundation/mpl-bubblegum"

import { default as NextLink } from "next/link"
import { findKey, isEmpty, uniq } from "lodash"
import { LayoutSize, useUiSettings } from "../../context/ui-settings"
import { FC, MouseEvent, ReactElement, ReactNode, SyntheticEvent, useEffect, useRef, useState } from "react"
import LockIcon from "@mui/icons-material/Lock"
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked"
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"
import { useDatabase } from "../../context/database"
import axios from "axios"
import { ArrowBackIosNew, ArrowForwardIos, Close, LocalFireDepartment, Paid, Sync } from "@mui/icons-material"
import { useDialog } from "../../context/dialog"
import { useTags } from "../../context/tags"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import { useLiveQuery } from "dexie-react-hooks"
import { useRouter } from "next/router"
import { toast } from "react-hot-toast"
import HowRare from "./howrare.svg"
import CornerRibbon from "react-corner-ribbon"
import { Loan as CitrusLoan } from "@famousfoxfederation/citrus-sdk"

import { useAccess } from "../../context/access"
import { useTransactionStatus } from "../../context/transactions"
import PlaneIcon from "../Actions/plane.svg"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { CopyAddress } from "../CopyAddress"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { type Listing, type Loan, type Nft, type RarityTier, type Tag } from "../../db"
import {
  DigitalAssetWithToken,
  TokenDelegateRole,
  TokenStandard,
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithTokenByMint,
  fetchJsonMetadata,
  revokeUtilityV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../../context/umi"
import { useNfts } from "../../context/nfts"
import { useBasePath } from "../../context/base-path"
import { useSharky } from "../../context/sharky"
import { useTheme } from "../../context/theme"
import { useTensor } from "../../context/tensor"
import SellIcon from "@mui/icons-material/Sell"
import { isFungible, isNonFungible, lamportsToSol, shorten } from "../../helpers/utils"
import ExchangeArt from "./exchange-art.svg"
import Tensor from "./tensor.svg"
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart"
import Crown from "../Listing/crown.svg"
import { useSelection } from "../../context/selection"
import { OfferedLoan, OrderBook } from "@sharkyfi/client"
import { useCitrus } from "../../context/citrus"
import { publicKey, transactionBuilder, unwrapOption } from "@metaplex-foundation/umi"
import { useCrow } from "../../apps/crow"
import { Crow, CrowWithAssets, CrowWithPublicKeyAndAssets } from "../../apps/crow/types/types"
import { findCrowPda } from "../../apps/crow/pdas"
import { toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import { SPL_TOKEN_PROGRAM_ID } from "@metaplex-foundation/mpl-toolbox"
import {
  ASSET_PROGRAM_ID,
  Asset,
  ExtensionType,
  State,
  delegateInput,
  fetchAsset,
  getExtension,
  revoke as revokeNifty,
} from "@nifty-oss/asset"
import {
  AssetV1,
  CollectionV1,
  MPL_CORE_PROGRAM_ID,
  PluginType,
  fetchAssetV1,
  fetchCollectionV1,
  removePluginV1,
} from "@metaplex-foundation/mpl-core"
import { packTx, sendAllTxsWithRetries } from "../../helpers/transactions"
import { usePriorityFees } from "../../context/priority-fees"
import { base64 } from "@metaplex-foundation/umi/serializers"
import { useStake } from "../../apps/stake"
import { StakeRecord, StakeRecordWithPublicKey, Staker, StakerWithPublicKey } from "../../apps/stake/types/types"

type Category = "image" | "video" | "audio" | "vr" | "web"
const SECONDS_PER_DAY = 86_400

const statusTitles = {
  staked: "Staked",
  inVault: "In Vault",
  frozen: "Frozen",
  listed: "Listed",
  "loan-taken": "On loan",
  "loan-given": "Lent on",
  linked: "Linked",
}

const tokenStandards = {
  0: "NFT",
  1: "SFT",
  2: "Token",
  3: "NFT Edition",
  4: "pNFT",
  5: "OCP NFT",
  6: "Nifty OSS",
  7: "Core",
}

interface CircularProgressWithLabelProps extends CircularProgressProps {
  children: ReactNode
}

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

const CircularProgressWithLabel: FC<CircularProgressWithLabelProps> = (props) => {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress {...props} size="5rem" />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.children}
      </Box>
    </Box>
  )
}

interface OfferedLoanWithApy extends OfferedLoan {
  interestRatio?: number
  interestWithFeeLamports?: number
  totalOwedLamports?: number
  apyAfterFee?: number
}

const Loan: FC<{ loan: Loan; isTouchDevice?: Boolean; item: Nft }> = ({ loan, isTouchDevice, item }) => {
  const { repayLoan, extendLoan, getBestLoan, getOrderBook } = useSharky()
  const { repayCitrusLoan, extendCitrusLoan, getBestCitrusLoanFromLoan } = useCitrus()
  const { isInScope, dandies } = useAccess()
  const [timeRemaining, setTimeRemaining] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [extendShowing, setExtendShowing] = useState(false)
  const [bestLoan, setBestLoan] = useState<OfferedLoanWithApy | null>(null)
  const { showInfo } = useUiSettings()
  const [loading, setLoading] = useState(false)
  const [citrusBestLoan, setCitrusBestLoan] = useState<CitrusLoan | null>(null)
  const [fetchingBestLoan, setFetchingBestLoan] = useState(false)
  const theme = useTheme()

  function getTimeRemaining() {
    const seconds = loan.defaults - Date.now() / 1000
    const days = Math.floor(seconds / 24 / 60 / 60)
    const hoursLeft = Math.floor(seconds - days * 86400)
    const hours = Math.floor(hoursLeft / 3600)
    const minutesLeft = Math.floor(hoursLeft - hours * 3600)
    const minutes = Math.floor(minutesLeft / 60)
    const remainingSeconds = 60 + Math.floor(seconds % 60)
    setTimeRemaining(`${days > 0 ? `${days}d ` : ""}${hours > 0 ? `${hours}h ` : ""}${minutes}m ${remainingSeconds}s`)
    setUrgent(days <= 0)
  }

  useEffect(() => {
    if (item.status === "loan-given" || !isInScope) {
      return
    }
    ;(async () => {
      try {
        setFetchingBestLoan(true)
        if (loan.market === "Sharky") {
          const orderBook = await getOrderBook(item)
          const bestLoan = await getBestLoan(orderBook)
          setBestLoan(bestLoan)
        } else if (loan.market === "Citrus") {
          const bestCitrusLoan = await getBestCitrusLoanFromLoan(loan.loanId)
          setCitrusBestLoan(bestCitrusLoan)
        }
      } catch {
      } finally {
        setFetchingBestLoan(false)
      }
    })()
  }, [])

  useEffect(() => {
    getTimeRemaining()
    const interval = setInterval(getTimeRemaining, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  async function onRepayClick(e: any) {
    e.stopPropagation()
    try {
      setLoading(true)
      let repayPromise
      if (loan.market === "Sharky") {
        repayPromise = repayLoan(loan.collateralMint)
      } else if (loan.market === "Citrus") {
        repayPromise = repayCitrusLoan(loan.loanId)
      } else {
        throw new Error("Unsupported supplier")
      }

      toast.promise(repayPromise, {
        loading: "Repaying loan...",
        success: "Loan repaid",
        error: "Error repaying loan",
      })

      await repayPromise
    } catch (err: any) {
      toast.error(err.message || "Error repaying loan")
    } finally {
      setLoading(false)
    }
  }

  async function onExtendClick(e: any) {
    e.stopPropagation()
    try {
      setLoading(true)
      let extendPromise
      if (loan.market === "Sharky") {
        extendPromise = extendLoan(loan.collateralMint)
      } else if (loan.market === "Citrus") {
        extendPromise = extendCitrusLoan(loan.loanId)
      } else {
        throw new Error("Supplier not supported")
      }

      toast.promise(extendPromise, {
        loading: "Extending loan...",
        success: "Loan extended",
        error: "Error extending loan",
      })
      await extendPromise
    } catch (err: any) {
      toast.error(err.message || "Error extending loan")
    } finally {
      setLoading(false)
    }
  }

  if (loan.status !== "active") {
    return null
  }

  function toggleExtendShowing(e: any) {
    e.stopPropagation()
    setExtendShowing(!extendShowing)
  }

  const newLoanHigher =
    loan.amountToRepay <
    (loan.market === "Sharky"
      ? bestLoan?.data?.principalLamports?.toNumber() || 0
      : citrusBestLoan?.terms.principal || 0)
  const canExtend = loan.market === "Sharky" ? bestLoan : citrusBestLoan

  const serviceFee = dandies.length
    ? 0
    : loan.market === "Sharky"
    ? (bestLoan?.data.principalLamports ? Number(bestLoan?.data.principalLamports) : 0) * 0.005
    : (citrusBestLoan?.terms.principal || 0) * 0.005

  const difference = Math.abs(
    (loan.market === "Sharky"
      ? bestLoan?.data?.principalLamports?.toNumber() || 0
      : citrusBestLoan?.terms.principal || 0) -
      loan.amountToRepay -
      serviceFee
  )

  return (
    <Stack
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: alpha(theme.palette.background.default, 0.8),
        opacity: urgent || isTouchDevice ? 1 : 0,
        transition: "opacity 0.2s",
        zIndex: 1000,
      }}
      justifyContent="center"
      alignItems="center"
      spacing={1}
    >
      <Stack justifyContent="center" alignItems="center">
        <Typography variant="h5">{loan.market}</Typography>
        <Typography variant="h5">◎{(loan.amountToRepay / LAMPORTS_PER_SOL).toLocaleString()}</Typography>
        <Typography
          variant={urgent ? "h6" : "body2"}
          color={urgent ? "error" : "inherit"}
          fontWeight={urgent ? "bold" : "default"}
        >
          {timeRemaining}
        </Typography>
      </Stack>
      {["Sharky", "Citrus"].includes(loan.market) && isInScope && (
        <Stack direction="row" spacing={1}>
          <Button onClick={onRepayClick} variant="contained" size="small">
            Repay
          </Button>
          <Button
            onClick={toggleExtendShowing}
            size="small"
            variant="contained"
            color={newLoanHigher ? "success" : "warning"}
            disabled={fetchingBestLoan || !canExtend}
          >
            {fetchingBestLoan ? "Loading" : bestLoan || citrusBestLoan ? "Extend" : "Unavailable"}
          </Button>
        </Stack>
      )}
      <Dialog open={extendShowing} onClose={toggleExtendShowing} maxWidth="sm" fullWidth>
        <Card sx={{ overflowY: "auto" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4" color="primary" textAlign="center" textTransform="uppercase">
                Extend loan
              </Typography>
              <Stack direction="row" spacing={2} width="100%" justifyContent="center">
                <Stack spacing={2} sx={{ textAlign: "right", color: "#888!important" }} width="50%">
                  <Typography variant="h6">Current</Typography>
                  <Stack>
                    <Typography variant="body2">Principal</Typography>
                    <Typography variant="h4" fontWeight="normal">
                      ◎{lamportsToSol(loan.principalAmount)}
                    </Typography>
                  </Stack>
                  <Stack>
                    <Typography variant="body2">Interest</Typography>
                    <Typography variant="h4" fontWeight="normal">
                      ◎{lamportsToSol(loan.amountToRepay - loan.principalAmount)}
                    </Typography>
                    <Typography>{loan.apy}%</Typography>
                  </Stack>
                  <Stack>
                    <Typography variant="body2">Remaining time</Typography>
                    <Typography variant="h4" fontWeight="normal">
                      <Typography
                        variant="h6"
                        color={urgent ? "error" : "inherit"}
                        fontWeight={urgent ? "bold" : "default"}
                      >
                        {timeRemaining}
                      </Typography>
                    </Typography>
                  </Stack>
                </Stack>
                <Stack spacing={2} width="50%">
                  <Typography variant="h6">New loan</Typography>
                  {bestLoan && (
                    <>
                      <Stack>
                        <Typography variant="body2">Principal</Typography>
                        <Typography
                          variant="h4"
                          fontWeight="normal"
                          color={newLoanHigher ? "success" : "error"}
                          sx={newLoanHigher ? { color: "#66bb6a!important" } : {}}
                        >
                          ◎{lamportsToSol(bestLoan?.data?.principalLamports)}
                        </Typography>
                      </Stack>
                      <Stack>
                        <Typography variant="body2">Interest</Typography>
                        <Typography variant="h4" fontWeight="normal">
                          ◎{lamportsToSol(bestLoan.interestWithFeeLamports!)}
                        </Typography>
                        <Typography>{bestLoan.apyAfterFee}%</Typography>
                      </Stack>
                      <Stack>
                        <Typography variant="body2">New duration</Typography>
                        <Typography variant="h4" fontWeight="normal">
                          <Typography variant="h6">
                            {(bestLoan?.data?.loanState?.offer?.offer?.termsSpec?.time?.duration?.toNumber() || 1) /
                              SECONDS_PER_DAY}
                            d
                          </Typography>
                        </Typography>
                      </Stack>
                    </>
                  )}
                  {citrusBestLoan && (
                    <>
                      <Stack>
                        <Typography variant="body2">Principal</Typography>
                        <Typography
                          variant="h4"
                          fontWeight="normal"
                          color={newLoanHigher ? "success" : "error"}
                          sx={newLoanHigher ? { color: "#66bb6a!important" } : {}}
                        >
                          ◎{lamportsToSol(citrusBestLoan.terms.principal)}
                        </Typography>
                      </Stack>
                      <Stack>
                        <Typography variant="body2">Interest</Typography>
                        <Typography variant="h4" fontWeight="normal">
                          ◎{lamportsToSol(citrusBestLoan.terms.interest || 0)}
                        </Typography>
                        <Typography>{citrusBestLoan.terms.apy / 100}%</Typography>
                      </Stack>
                      <Stack>
                        <Typography variant="body2">New duration</Typography>
                        <Typography variant="h4" fontWeight="normal">
                          <Typography variant="h6">{citrusBestLoan.terms.duration / SECONDS_PER_DAY}d</Typography>
                        </Typography>
                      </Stack>
                    </>
                  )}
                </Stack>
              </Stack>
              {serviceFee && (
                <Typography variant="body1" textAlign="center">
                  Service fee (0.5%): ◎{lamportsToSol(serviceFee)}
                </Typography>
              )}
              <Typography
                variant="h5"
                color={newLoanHigher ? "success" : "error"}
                textAlign="center"
                sx={newLoanHigher ? { color: "#66bb6a!important" } : {}}
              >
                {newLoanHigher
                  ? `You will receive ◎${lamportsToSol(difference)}`
                  : `You need to pay ◎${lamportsToSol(difference)} to extend`}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Button onClick={toggleExtendShowing} color="error" variant="outlined" size="large" disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  disabled={loading || (!bestLoan && !citrusBestLoan)}
                  size="large"
                  onClick={onExtendClick}
                >
                  Extend
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Stack>
  )
}

function getMultimediaType(ext: string): Category {
  const types = {
    image: ["jpg", "jpeg", "jpng", "gif", "png"],
    video: ["mp4", "mov"],
    audio: ["mp3", "wav", "flac", "mpeg"],
    web: ["html"],
    vr: ["glb", "gltf", "gltf-binary"],
  }
  return findKey(types, (items) => items.includes(ext)) as Category
}

export interface ItemProps {
  item: Nft
  DragHandle?: ReactNode
  lazyLoad?: boolean
  showInfo?: boolean
  enlarged?: boolean
  layoutSize?: LayoutSize
}

type Media = {
  type?: string
  uri: string
  contentType: string
}

export const Media: FC<{ asset?: Media | null }> = ({ asset }) => {
  const { lightMode } = useUiSettings()
  if (!asset) {
    return (
      <img
        src={lightMode ? "/books-lightest.svg" : "/books-lighter.svg"}
        width="100%"
        style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}
      />
    )
  }
  const multimediaType = getMultimediaType(asset.contentType.split("/")[1].split(";")[0]) || "image"

  if (multimediaType === "image") {
    return (
      <img
        src={`${asset.uri}`}
        style={{ display: "block", width: "100%" }}
        onError={(e: any) => {
          e.target.src = asset.uri
          e.target.onerror = (er: any) => {
            er.target.src = lightMode ? "/books-lightest.svg" : "/books-lighter.svg"
          }
        }}
      />
    )
  }

  if (multimediaType === "web") {
    return (
      <iframe
        src={asset.uri}
        style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}
        onLoad={(event: any) => event.target.focus()}
      />
    )
  }

  if (multimediaType === "video") {
    return (
      <video
        src={asset.uri}
        autoPlay
        width="100%"
        style={{ display: "block", aspectRatio: "1 / 1" }}
        muted
        controls
        loop
      />
    )
  }

  if (multimediaType === "audio") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <audio src={asset.uri} autoPlay controls loop />
      </Box>
    )
  }

  if (multimediaType === "vr") {
    return (
      <model-viewer
        src={asset.uri}
        alt="Model"
        camera-controls
        ar-modes="webxr"
        width="100%"
        height="100%"
        style={{ width: "100%", height: "100%", background: "transparent" }}
      ></model-viewer>
    )
  }

  return null
}

async function getType(uri: string) {
  if (!uri) {
    return
  }
  uri = uri.replace("ipfs://", "https://ipfs.io/ipfs/")
  try {
    const { headers } = await axios.get(uri)
    const contentType = headers["content-type"]

    return contentType
  } catch (err) {
    console.error(err)
    return
  }
}

const Listing = ({
  listing,
  sellerFeeBasisPoints,
  defaultPayRoyalties,
  royaltiesEnforced,
}: {
  listing: Listing
  defaultPayRoyalties: boolean
  sellerFeeBasisPoints: number
  royaltiesEnforced: boolean
}) => {
  const { isInScope } = useAccess()
  const [payRoyalties, setPayRoyalties] = useState(royaltiesEnforced || defaultPayRoyalties)
  const [loading, setLoading] = useState(false)
  const { buy } = useTensor()

  if (isInScope) {
    return null
  }

  async function buyItem() {
    try {
      setLoading(true)
      const buyPromise = buy([
        {
          owner: listing.seller,
          maxPrice: listing.price,
          mint: listing.nftMint,
          royalties: payRoyalties,
          marketplace: listing.marketplace,
        },
      ]) as unknown as Promise<void>

      toast.promise(buyPromise, {
        loading: "Buying item",
        success: "Item bought successfully",
        error: "Error buying item",
      })

      await buyPromise
    } catch (err: any) {
      toast.error(err.message || "Error buying item")
    } finally {
      setLoading(false)
    }
  }

  const price = listing?.price || 0
  const fee = (price / 100) * 1.5
  const rent = 2030000
  const royalties = ((listing?.price || 0) / 10000) * sellerFeeBasisPoints
  const total = payRoyalties ? price + fee + rent + royalties : price + fee + rent

  return (
    <Stack spacing={2} width="100%">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Listed for sale:</Typography>
        <Typography color="primary" variant="h5">
          {lamportsToSol(price)} SOL
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <FormControlLabel
          label="Pay full royalties"
          control={
            <Switch
              checked={payRoyalties}
              onChange={(e) => setPayRoyalties(e.target.checked)}
              disabled={royaltiesEnforced}
            />
          }
        />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <SvgIcon
            // @ts-ignore
            color={payRoyalties ? "gold" : "disabled"}
          >
            <Crown />
          </SvgIcon>
          <Typography variant="h6" color="primary">
            {lamportsToSol(royalties)}
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography>Marketplace fee (1.5%)</Typography>
        <Typography color="primary">{lamportsToSol(fee)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography>Account opening rent</Typography>
        <Typography color="primary">{lamportsToSol(rent)}</Typography>
      </Stack>
      <Button size="large" variant="contained" onClick={buyItem} disabled={loading}>
        <Stack direction={"row"} spacing={1} alignItems="center">
          <Typography>BUY NOW for {lamportsToSol(total)}</Typography>
          {listing?.marketplace === "MEv2" && <img src="/me.png" height="18px" />}
          {listing?.marketplace === "TensorSwap" && (
            <SvgIcon>
              <Tensor />
            </SvgIcon>
          )}
        </Stack>
      </Button>
      <Alert severity="info">
        Marketplace fee assumed to be 1.5% but is subject to change. The actual total including marketplace fee can be
        seen in your wallet simulation
      </Alert>
    </Stack>
  )
}

const BestLoan: FC<{ item: Nft; onClose: Function }> = ({ item, onClose }) => {
  const { setLoaned } = useDatabase()
  const { getBestCitrusLoan, takeCitrusLoan } = useCitrus()
  const [fetchingOrderBook, setFetchingOrderBook] = useState(false)
  const [fetchingBestLoan, setFetchingBestLoan] = useState(false)
  const [sharkyFetching, setSharkyFetching] = useState(false)
  const [loading, setLoading] = useState(false)
  const { isInScope } = useAccess()
  const [bestLoan, setBestLoan] = useState<OfferedLoanWithApy | null>(null)
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const { takeLoan, getBestLoan, getOrderBook } = useSharky()
  const [bestCitrusLoan, setBestCitrusLoan] = useState<CitrusLoan | null>(null)
  const [citrusFetching, setCitrusFetching] = useState(false)

  const isDisabled = !isInScope

  async function fetchCitrus() {
    try {
      setCitrusFetching(true)
      const bestLoan = await getBestCitrusLoan(item)
      if (bestLoan) {
        setBestCitrusLoan(bestLoan)
      } else {
        setBestCitrusLoan(null)
      }
    } catch (err: any) {
      toast.error(err.message || "Error communicating with Citrus")
    } finally {
      setCitrusFetching(false)
    }
  }

  useEffect(() => {
    fetchCitrus()
  }, [])

  async function fetchSharky() {
    try {
      setFetchingOrderBook(true)
      const orderBook = await getOrderBook(item)
      setOrderBook(orderBook)
      setFetchingOrderBook(false)
    } catch {
      toast.error("Error communicating with Sharky")
    }
  }

  useEffect(() => {
    setSharkyFetching(fetchingBestLoan || fetchingOrderBook)
  }, [fetchingOrderBook, fetchingBestLoan])

  useEffect(() => {
    fetchSharky()
  }, [])

  const isSmall = useMediaQuery("(max-width: 580px)")

  async function updateBestLoan() {
    if (orderBook) {
      try {
        setFetchingBestLoan(true)
        const bestLoan = await getBestLoan(orderBook)
        setBestLoan(bestLoan)
        setFetchingBestLoan(false)
      } catch {
        toast.error("Error communicating with Sharky")
      }
    } else {
      setBestLoan(null)
    }
  }

  useEffect(() => {
    updateBestLoan()
  }, [orderBook])

  async function onTakeLoanClick() {
    try {
      setLoading(true)
      const takeLoanPromise = takeLoan(bestLoan, item.nftMint)
      toast.promise(takeLoanPromise, {
        loading: "Taking loan...",
        success: "Success",
        error: "Error taking loan",
      })

      await takeLoanPromise
      await setLoaned(item.nftMint)
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Error taking loan")
    } finally {
      setLoading(false)
    }
  }

  const onTakeCitrusLoanClick = (loanDetails: any) => async (e: any) => {
    try {
      setLoading(true)
      const takeLoanPromise = takeCitrusLoan(loanDetails, item.nftMint)

      toast.promise(takeLoanPromise, {
        loading: "Taking loan...",
        success: "Success",
        error: "Error taking loan",
      })

      await takeLoanPromise
      await setLoaned(item.nftMint)
    } catch (err: any) {
      toast.error(err.message || "Error taking loan")
    } finally {
      setLoading(false)
    }
  }

  function sync() {
    fetchSharky()
    fetchCitrus()
  }

  const sharky = (
    <TableRow
      sx={
        isSmall
          ? {
              display: "flex",
              flexDirection: "column",
              td: {
                textAlign: "right",
                display: "flex",
                justifyContent: "space-between",
              },
              "td[data-th]": {
                border: 0,
                "&:before": {
                  content: "attr(data-th)",
                  fontWeight: "bold",
                },
              },
            }
          : {}
      }
    >
      <TableCell data-th="Provider">
        <Link href="https://sharky.fi/borrow" target="_blank" rel="noreferrer">
          <img src="/sharky-long.png" height="40px" />
        </Link>
      </TableCell>
      <TableCell colSpan={sharkyFetching || !orderBook ? 4 : 1} data-th="Best offer">
        {sharkyFetching ? (
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <Typography>Fetching data...</Typography>
            <CircularProgress size="20px" />
          </Stack>
        ) : orderBook ? (
          <Typography>{bestLoan ? `◎${lamportsToSol(bestLoan.data.principalLamports)}` : "-"}</Typography>
        ) : (
          <Typography textAlign="center">No offers found</Typography>
        )}
      </TableCell>
      {orderBook && !sharkyFetching && (
        <>
          <TableCell data-th="Interest">
            <Stack>
              <Typography sx={{ whiteSpace: "nowrap" }} variant="body2">
                {bestLoan?.apyAfterFee || 0}%
              </Typography>
              <Typography variant="body2">
                ◎
                {lamportsToSol(
                  (((((bestLoan?.data?.principalLamports.toNumber() || 0) / 100) * (orderBook?.apy?.fixed?.apy || 0)) /
                    1000 /
                    365) *
                    (orderBook?.loanTerms?.fixed?.terms.time?.duration?.toNumber() || 0)) /
                    SECONDS_PER_DAY
                )}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell data-th="Duration">
            {orderBook ? (orderBook.loanTerms.fixed?.terms.time?.duration.toNumber() || 0) / SECONDS_PER_DAY : 0}d
          </TableCell>
          <TableCell>
            <Tooltip
              title={
                item.status
                  ? "Cannot take loan on frozen item"
                  : "By taking this loan you agree to the terms set out by the supplier. Biblio and Dandies have no affiliation with any providers or their terms."
              }
              placement="top"
            >
              <span style={{ width: "100%" }}>
                <Button
                  variant="outlined"
                  onClick={onTakeLoanClick}
                  disabled={loading || Boolean(item.status) || isDisabled}
                  sx={{ whiteSpace: "nowrap" }}
                  fullWidth
                >
                  <Typography>Take loan</Typography>
                </Button>
              </span>
            </Tooltip>
          </TableCell>
        </>
      )}
    </TableRow>
  )

  const citrus = (
    <TableRow
      sx={
        isSmall
          ? {
              display: "flex",
              flexDirection: "column",
              td: {
                textAlign: "right",
                display: "flex",
                justifyContent: "space-between",
              },
              "td[data-th]": {
                border: 0,
                "&:before": {
                  content: "attr(data-th)",
                  fontWeight: "bold",
                },
              },
            }
          : {}
      }
    >
      <TableCell data-th="Provider">
        <Link href="https://citrus.famousfoxes.com/borrow" target="_blank" rel="noreferrer">
          <img src="/citrus.webp" height="40px" />
        </Link>
      </TableCell>
      <TableCell colSpan={bestCitrusLoan && !citrusFetching ? 1 : 4} data-th="Best offer">
        {citrusFetching ? (
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <Typography>Fetching data...</Typography>
            <CircularProgress size="20px" />
          </Stack>
        ) : bestCitrusLoan ? (
          <Typography>{bestCitrusLoan ? `◎${lamportsToSol(bestCitrusLoan.terms.principal)}` : "-"}</Typography>
        ) : (
          <Typography textAlign="center">No offers found</Typography>
        )}
      </TableCell>
      {bestCitrusLoan && !citrusFetching && (
        <>
          <TableCell data-th="Interest">
            <Stack>
              <Typography sx={{ whiteSpace: "nowrap" }} variant="body2">
                {((bestCitrusLoan.terms.apy || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%
              </Typography>
              <Typography variant="body2">
                ◎{bestCitrusLoan.terms.interest ? lamportsToSol(bestCitrusLoan.terms.interest) : "-"}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell data-th="Duration">{bestCitrusLoan.terms.duration / SECONDS_PER_DAY}d</TableCell>
          <TableCell>
            <Tooltip
              title={
                item.status
                  ? "Cannot take loan on frozen item"
                  : "By taking this loan you agree to the terms set out by the supplier. Biblio and Dandies have no affiliation with any providers or their terms."
              }
              placement="top"
            >
              <span style={{ width: "100%" }}>
                <Button
                  variant="outlined"
                  onClick={onTakeCitrusLoanClick(bestCitrusLoan)}
                  disabled={loading || Boolean(item.status) || isDisabled}
                  sx={{ whiteSpace: "nowrap" }}
                  fullWidth
                >
                  <Typography>Take loan</Typography>
                </Button>
              </span>
            </Tooltip>
          </TableCell>
        </>
      )}
    </TableRow>
  )

  return (
    <Stack spacing={2} width="100%">
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Available loans</Typography>
        {isSmall && (
          <IconButton onClick={sync} disabled={citrusFetching || sharkyFetching}>
            <Sync />
          </IconButton>
        )}
      </Stack>
      <Table>
        {!isSmall && (
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Provider</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Best offer</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Interest</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Duration</TableCell>
              <TableCell sx={{ textAlign: "right" }}>
                <IconButton onClick={sync} disabled={citrusFetching || sharkyFetching}>
                  <Sync />
                </IconButton>
              </TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {(bestCitrusLoan?.terms.principal || 0) > (bestLoan?.data.principalLamports.toNumber() || 0)
            ? [citrus, sharky]
            : [sharky, citrus]}
        </TableBody>
      </Table>
    </Stack>
  )
}

export const ItemDetails = ({ item }: { item: Nft }) => {
  const { setOpen } = useDialog()
  const [assetIndex, setAssetIndex] = useState(0)
  const [assets, setAssets] = useState<Media[]>([])
  const [asset, setAsset] = useState<Media | null>(null)
  const { db } = useDatabase()
  const { tags, removeNftsFromTag, addNftsToTag } = useTags()
  const { isInScope } = useAccess()
  const [revoking, setRevoking] = useState(false)
  const router = useRouter()
  const { collections, revokeDelegate } = useDatabase()
  const basePath = useBasePath()
  const umi = useUmi()
  const { lightMode, payRoyalties } = useUiSettings()
  const [metadataShowing, setMetadataShowing] = useState(false)
  const [da, setDa] = useState<DigitalAssetWithToken | Asset | AssetV1 | null>(null)
  const [collectionAsset, setCollectionAsset] = useState<Asset | CollectionV1 | null>(null)
  const [crow, setCrow] = useState<CrowWithPublicKeyAndAssets | null>(null)
  const crowProgram = useCrow()
  const [stakeRecord, setStakeRecord] = useState<StakeRecordWithPublicKey | null>(null)
  const [staker, setStaker] = useState<Staker | null>(null)
  const stakeProgram = useStake()
  const { connection } = useConnection()
  const { feeLevel } = usePriorityFees()
  const [json, setJson] = useState(item.json)
  const wallet = useWallet()

  useEffect(() => {
    if (!da) {
      setCollectionAsset(null)
      return
    }
    ;(async () => {
      if ("extensions" in da) {
        if (da.group) {
          const collectionAsset = await fetchAsset(umi, da.group)
          setCollectionAsset(collectionAsset)
        } else {
          setCollectionAsset(null)
        }
      } else if ("uri" in da) {
        if (da.updateAuthority.type === "Collection" && da.updateAuthority.address) {
          const collectionAsset = await fetchCollectionV1(umi, da.updateAuthority.address)
          setCollectionAsset(collectionAsset)
        } else {
          setCollectionAsset(null)
        }
      }
    })()
  }, [da])

  useEffect(() => {
    if (!crowProgram || !item || isFungible(item.metadata.tokenStandard)) {
      setCrow(null)
      return
    }

    ;(async () => {
      try {
        const crowPda = findCrowPda(publicKey(item.id))
        const crowAcc = await crowProgram?.account.crow.fetch(crowPda)
        const assets = await crowProgram?.account.asset.all([
          {
            memcmp: {
              bytes: crowPda,
              offset: 8,
            },
          },
        ])
        setCrow({
          account: crowAcc,
          publicKey: toWeb3JsPublicKey(crowPda),
          assets,
        })
      } catch {
        setCrow(null)
      }
    })()
  }, [crowProgram, item])

  useEffect(() => {
    if (!stakeProgram || !item || isFungible(item.metadata.tokenStandard)) {
      setStaker(null)
      setStakeRecord(null)
      return
    }

    ;(async () => {
      try {
        const stakeRecord = (
          await stakeProgram.account.stakeRecord.all([
            {
              memcmp: {
                bytes: item.nftMint,
                offset: 72,
              },
            },
          ])
        )[0]

        setStakeRecord(stakeRecord)
        const staker = await stakeProgram.account.staker.fetch(stakeRecord.account.staker)
        setStaker(staker)
      } catch {
        setStakeRecord(null)
      }
    })()
  }, [stakeProgram, item])

  function toggleMetadataShowing() {
    setMetadataShowing(!metadataShowing)
  }

  const isDisabled = !isInScope

  const selectedTags =
    useLiveQuery(() => db && db.taggedNfts.where({ nftId: item.nftMint }).toArray(), [item, db], []) || []

  function forward() {
    setAssetIndex(assets[assetIndex + 1] ? assetIndex + 1 : 0)
  }

  function back() {
    setAssetIndex(assets[assetIndex - 1] ? assetIndex - 1 : assets.length - 1)
  }

  async function getAssets() {
    const assets: Media[] = []
    if (da && "extensions" in da) {
      const blob = getExtension(da, ExtensionType.Blob)
      if (blob) {
        const [base64Image] = base64.deserialize(new Uint8Array(blob.data))
        const uri = `data:${blob.contentType};base64, ${base64Image}`
        assets.push({
          type: "blob",
          uri,
          contentType: blob.contentType,
        })
      }
    }

    if (json?.animation_url) {
      assets.push({
        uri: json.animation_url,
        contentType: await getType(json.animation_url),
      })
    }

    if (json?.image) {
      assets.push({
        uri: json.image,
        contentType: await getType(json.image),
      })
    }

    if (json?.properties?.files?.length) {
      await Promise.all(
        json.properties.files
          .filter((f) => f.uri)
          .map(async (file) => {
            if (!assets.find((a) => a.uri === file.uri)) {
              assets.push({
                uri: file.uri!,
                contentType: await getType(file.uri!),
              })
            }
          })
      )
    }

    setAssets(assets)
  }

  useEffect(() => {
    getAssets()
  }, [da, json])

  useEffect(() => {
    getJson()
  }, [da])

  async function getJson() {
    if (!da) {
      return
    }

    let uri

    if ("metadata" in da) {
      uri = da.metadata.uri
    } else if ("extensions" in da) {
      uri = getExtension(da, ExtensionType.Metadata)?.uri
    } else if ("uri" in da) {
      uri = da.uri
    }

    if (uri) {
      try {
        const json = await fetchJsonMetadata(umi, uri)
        setJson(json)
      } catch (err) {}
    }
  }

  async function fetchItem() {
    if (!item.compression?.compressed) {
      const pk = publicKey(item.nftMint)
      const acc = await umi.rpc.getAccount(pk)
      if (acc.exists && acc.owner === SPL_TOKEN_PROGRAM_ID) {
        const da = await fetchDigitalAssetWithTokenByMint(umi, publicKey(item.nftMint))
        setDa(da)
      } else if (acc.exists && acc.owner === ASSET_PROGRAM_ID) {
        const asset = await fetchAsset(umi, pk)
        setDa(asset)
      } else if (acc.exists && acc.owner === MPL_CORE_PROGRAM_ID) {
        const asset = await fetchAssetV1(umi, pk)
        setDa(asset)
      }
    }
  }

  useEffect(() => {
    fetchItem()
  }, [])

  useEffect(() => {
    const asset = assets[assetIndex]
    setAsset(asset)
  }, [assets, assetIndex])

  async function addTag(tag: Tag) {
    await addNftsToTag(tag.id, [item.nftMint])
    toast.success(`Added item to ${tag.name}`)
  }

  async function removeTag(tag: Tag) {
    await removeNftsFromTag(tag.id, [item.nftMint])
    toast.success(`Removed item from ${tag.name}`)
  }

  const collection = collections.find((c) => c.id === item.collectionIdentifier)

  let tokenDelegate = item.ownership.delegate

  async function revoke() {
    try {
      if (isDisabled) {
        throw new Error("You're not signed in")
      }
      if (!da && !item.compression?.compressed) {
        throw new Error("still fetching")
      }
      if (!tokenDelegate) {
        throw new Error("Delegate not found")
      }
      if (umi.identity.publicKey !== item.ownership.owner) {
        throw new Error(`Connect with ${shorten(item.ownership.owner)} to revoke this delegation`)
      }
      setRevoking(true)
      const promise = Promise.resolve().then(async () => {
        let tx = transactionBuilder()
        if (item.compression?.compressed) {
          const assetWithProof = await getAssetWithProof(umi, publicKey(item.id))
          tx = tx.add(
            delegate(umi, {
              ...assetWithProof,
              leafOwner: umi.identity,
              previousLeafDelegate: publicKey(item.ownership.delegate!),
              newLeafDelegate: publicKey(item.ownership.owner),
            })
          )
        } else if (da && "metadata" in da && tokenDelegate) {
          tx = tx.add(
            revokeUtilityV1(umi, {
              mint: publicKey(item.nftMint),
              authority: umi.identity,
              tokenStandard: unwrapOption(da!.metadata.tokenStandard) || 0,
              delegate: publicKey(tokenDelegate),
            })
          )
        } else if (da && "extensions" in da) {
          if (da.state === State.Locked) {
            throw new Error("Asset is locked")
          }
          tx = tx.add(
            revokeNifty(umi, {
              asset: publicKey(item.nftMint),
              delegateInput: delegateInput("All"),
            })
          )
        } else if (da && "uri" in da) {
          if (da.freezeDelegate?.frozen || da.permanentFreezeDelegate?.frozen) {
            throw new Error("Asset is frozen, cannot remove delegate")
          }
          if (!da.freezeDelegate && !da.transferDelegate) {
            throw new Error("No delegate to remove")
          }
          if (da.freezeDelegate) {
            tx = tx.add(
              removePluginV1(umi, {
                asset: publicKey(item.nftMint),
                pluginType: PluginType.FreezeDelegate,
              })
            )
          }

          if (da.transferDelegate) {
            tx = tx.add(
              removePluginV1(umi, {
                asset: publicKey(item.nftMint),
                pluginType: PluginType.TransferDelegate,
              })
            )
          }
        }

        const { chunks, txFee } = await packTx(umi, tx, feeLevel)
        const signed = await Promise.all(chunks.map((c) => c.buildAndSign(umi)))
        await sendAllTxsWithRetries(umi, connection, signed)
      })

      toast.promise(promise, { loading: "Revoking authority", success: "Revoked", error: "Error revoking authority" })

      await promise

      await revokeDelegate([item])
    } catch (err: any) {
      console.log(err)
      toast.error(err.message || "Error revoking")
    } finally {
      setRevoking(false)
    }
  }

  const isLegacy = da && "metadata" in da
  const isNifty = da && "extensions" in da
  const isCore = da && "uri" in da

  let royalties = item.metadata.sellerFeeBasisPoints

  if (royalties === undefined || royalties === null) {
    if (collectionAsset) {
      if ("extensions" in collectionAsset) {
        const royaltiesExtension = getExtension(collectionAsset, ExtensionType.Royalties)
        if (royaltiesExtension) {
          royalties = Number(royaltiesExtension.basisPoints)
        }
      } else if ("uri" in collectionAsset) {
        if (collectionAsset.royalties) {
          royalties = Number(collectionAsset.royalties.basisPoints)
        }
      }
    }
  }

  type Trait = { trait_type: string; value: any }

  let traits: Array<Trait> = (json?.attributes as Trait[]) || []

  if (isNifty) {
    const ext = getExtension(da, ExtensionType.Attributes)
    if (ext) {
      traits = ext.values.map((v) => {
        return {
          trait_type: v.name,
          value: v.value,
        }
      })
    }
  } else if (isCore) {
    if (da.attributes) {
      traits = da.attributes.attributeList.map((t) => {
        return {
          trait_type: t.key,
          value: t.value,
        }
      })
    }
  }

  return (
    <Card sx={{ height: "100%", outline: "none !important", width: "100%", overflowY: "auto", padding: 2 }}>
      <Stack direction={{ md: "row", sm: "column" }}>
        <Box sx={{ width: "100%" }}>
          <Stack spacing={2} justifyContent="center" alignItems="center">
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: "auto",
                aspectRatio: "1 / 1",
                "&:hover": {
                  ".MuiStack-root": {
                    opacity: 1,
                  },
                },
              }}
            >
              {item.nftMint === USDC ? <img src="/usdc.png" width="100%" /> : <Media asset={asset} />}

              {assets.length > 1 && (
                <Stack
                  sx={{
                    width: "100%",
                    position: "absolute",
                    height: "100%",
                    opacity: 0,
                    transition: "opacity .2s",
                    top: 0,
                    pointerEvents: "none",
                  }}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box
                    onClick={back}
                    sx={{
                      pointerEvents: "all",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      padding: "1em",
                      cursor: "pointer",
                      left: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ArrowBackIosNew />
                  </Box>
                  <Box
                    onClick={forward}
                    sx={{
                      pointerEvents: "all",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      padding: "1em",
                      cursor: "pointer",
                      right: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <ArrowForwardIos />
                  </Box>
                </Stack>
              )}
            </Box>
            <Stack direction="row" spacing={2}>
              {asset && (
                <Button href={asset.uri} target="_blank" rel="noreferrer" variant="outlined" size="large">
                  View full asset
                </Button>
              )}
              <Button size="large" onClick={toggleMetadataShowing} variant="outlined">
                {metadataShowing ? "View image" : "View metadata"}
              </Button>
            </Stack>
            {item.listing && ["MEv2", "TensorSwap"].includes(item.listing?.marketplace as string) && (
              <Listing
                listing={item.listing}
                defaultPayRoyalties={payRoyalties}
                sellerFeeBasisPoints={item.metadata.sellerFeeBasisPoints}
                royaltiesEnforced={[4, 5].includes(item.metadata.tokenStandard || 0)}
              />
            )}
            {item.status !== "loaned" &&
              item.chain === "solana" &&
              isInScope &&
              !item.compression?.compressed &&
              isLegacy && <BestLoan item={item} onClose={() => setOpen(false)} />}
          </Stack>
        </Box>
        <CardContent sx={{ width: "100%" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" fontFamily="Lato" fontWeight="bold">
              {json?.name || item.metadata.name}
            </Typography>
            <Typography color="primary">{json?.symbol || item.metadata.symbol}</Typography>
          </Stack>
          <hr />
          <Stack spacing={2}>
            <Typography variant="h5" color="primary" fontFamily="Lato" fontWeight="bold">
              Details
            </Typography>
            <Table>
              <TableBody>
                {item.chain === "solana" && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Address
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <CopyAddress>{item.nftMint}</CopyAddress>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      Owner
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <CopyAddress>{item.owner || item.ownership.owner}</CopyAddress>
                  </TableCell>
                </TableRow>
                {crow && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Crow account
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <CopyAddress crow={item.id}>{crow.publicKey.toBase58()}</CopyAddress>
                      <Typography>
                        {crow.assets?.length} asset{crow.assets?.length === 1 ? "" : "s"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {item.loan && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        {item.status === "loan-taken" ? "Lender" : "Borrower"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>
                        <CopyAddress wallet>
                          {item.status === "loan-taken" ? item.loan.lender : item.loan.borrower}
                        </CopyAddress>
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {["eth", "matic"].includes(item.chain!) && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Contract address
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <CopyAddress chain={item.chain}>{item.collectionIdentifier}</CopyAddress>
                    </TableCell>
                  </TableRow>
                )}

                {[0, 1, 4].includes(item.metadata.tokenStandard!) && collection && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Collection
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>
                        <NextLink href={`${basePath}/collections/${collection.id}`} passHref>
                          <Link underline="hover">{collection.collectionName}</Link>
                        </NextLink>
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {item.chain === "solana" && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Token standard
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>
                        {item.compression?.compressed ? (
                          "Compressed NFT"
                        ) : (
                          <>
                            {item.metadata.collectionDetails && "Collection "}
                            {tokenStandards[item.metadata.tokenStandard as keyof object] || "Unknown"}
                          </>
                        )}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {["eth", "matic"].includes(item.chain!) && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Token type
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>{item.tokenType}</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {item.metadata.tokenStandard === TokenStandard.NonFungibleEdition && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Edition #
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>
                        {item.editionDetails?.edition.toString()} of {item.editionDetails?.supply.toString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {item.chain === "solana" && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Royalties
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>{royalties || 0 / 100}%</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {item.status && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Status
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {staker ? (
                        <Link href={`https://stake.xinlabs.io/${staker.slug}`}>STAKED</Link>
                      ) : (
                        <Typography>
                          {item.status === "linked" ? "Linked to Biblio" : statusTitles[item.status as keyof object]}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {tokenDelegate && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Delegate
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={2}>
                        {wallet.publicKey?.toBase58() === item.ownership.owner && !item.status && (
                          <Button variant="outlined" color="error" disabled={revoking} onClick={revoke}>
                            Revoke
                          </Button>
                        )}
                        <Typography>
                          <CopyAddress>{tokenDelegate}</CopyAddress>
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Typography>{item.content?.metadata?.description}</Typography>
            <Typography variant="h5" fontWeight="bold" fontFamily="Lato" color="primary">
              Traits
            </Typography>
            {traits.length ? (
              <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
                {(traits || []).map((att, index) => (
                  <Box
                    key={index}
                    sx={{ borderRadius: "5px", border: "1px solid", padding: 1, borderColor: "primary.main" }}
                  >
                    <Typography color="primary" textTransform="uppercase">
                      {att?.trait_type}
                    </Typography>
                    <Typography>{att?.value}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="h6">None</Typography>
            )}

            {isInScope && !router.query.publicKey && (
              <>
                <Typography variant="h5" fontFamily="Lato" color="primary" fontWeight="bold">
                  Tags
                </Typography>
                <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
                  {tags.map((tag) => {
                    const isSelected = selectedTags.map((item) => item.tagId).includes(tag.id)
                    return (
                      <Chip
                        label={tag.name}
                        key={tag.id}
                        onDelete={isInScope ? () => (isSelected ? removeTag(tag) : addTag(tag)) : undefined}
                        onClick={() => router.push(`/tags/${tag.id}`)}
                        // @ts-ignore
                        color={tag.id}
                        variant={isSelected ? "filled" : "outlined"}
                        deleteIcon={!isSelected ? <AddCircleIcon /> : undefined}
                      />
                    )
                  })}
                </Stack>
              </>
            )}
          </Stack>
        </CardContent>
      </Stack>
      <Dialog fullScreen onClose={toggleMetadataShowing} open={metadataShowing}>
        <IconButton sx={{ position: "fixed", top: 1, right: 1 }} size="large">
          <Close fontSize="large" onClick={toggleMetadataShowing} />
        </IconButton>
        <Card
          sx={{
            overflow: "auto",
            backgroundColor: "background.default",
            backgroundImage: lightMode ? "url(/tapestry.svg)" : "url(/tapestry-dark.svg)",
            backgroundAttachment: "fixed",
            backgroundSize: "100px",
            height: "100vh",
            borderRadius: 0,
          }}
        >
          <CardContent>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(json, null, 2)}</pre>
          </CardContent>
        </Card>
      </Dialog>
    </Card>
  )
}

const colors = {
  Mythic: "#c62828",
  Legendary: "#e65100",
  Epic: "#7b1fa2",
  Rare: "#1565c0",
  Uncommon: "#1b5e20",
  Common: "#333333",
}

type RarityProps = {
  rank: number
  type: "moonRank" | "howRare"
  tier: RarityTier
}

const Rarity: FC<RarityProps> = ({ rank, type, tier }) => {
  const { layoutSize } = useUiSettings()

  const sizes = {
    small: "12px",
    medium: "16x",
    large: "16px",
  }

  return (
    <Chip
      icon={type === "howRare" ? <HowRare style={{ marginLeft: "0.5em" }} /> : undefined}
      label={`${type === "moonRank" ? "⍜" : ""} ${rank}`}
      sx={{
        backgroundColor: colors[tier as keyof object],
        fontSize: sizes[layoutSize as keyof object] || "inherit",
        color: "white",
      }}
      size={"small"}
    />
  )
}

export const Item: FC<ItemProps> = ({
  item,
  DragHandle,
  showInfo: defaultShowInfo,
  layoutSize: defaultLayoutSize,
  enlarged,
}) => {
  const { selected, select } = useSelection()
  const theme = useTheme()
  const { setImage } = useDatabase()
  const { layoutSize: settingsLayoutSize, showInfo: settingsShowInfo, showAllWallets, lightMode } = useUiSettings()
  const { rarity } = useNfts()
  const { renderItem } = useDialog()
  const { publicKey: actualPublicKey, publicKeys, isInScope } = useAccess()
  const { addNftToStarred, removeNftFromStarred, starredNfts } = useTags()
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [crow, setCrow] = useState<Crow | null>(null)
  const [stakeRecord, setStakeRecord] = useState<StakeRecordWithPublicKey | null>(null)
  const [image, setImageState] = useState(item.content?.links?.image)
  const crowProgram = useCrow()
  const stakeProgram = useStake()
  const umi = useUmi()

  useEffect(() => {
    if (image) {
      return
    }

    ;(async () => {
      let image
      if (item.nftMint === USDC) {
        image = "/usdc.png"
      } else if (item.content?.links?.image) {
        image = item.content?.links?.image.replace("ipfs://", "https://ipfs.io/ipfs/")
      } else if (item.content?.json_uri) {
        try {
          const json = await fetchJsonMetadata(umi, item.content.json_uri)
          await setImage(item, json.image)
          image = json.image
        } catch {
          console.log(item.content.json_uri)
        }
      }

      if (image) {
        setImageState(
          layoutSize === "collage" || enlarged
            ? `https://img-cdn.magiceden.dev/rs:fill:600/plain/${image}`
            : `https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${image}`
        )
      } else {
        setImageState(lightMode ? "/books-lightest.svg" : "/books-lighter.svg")
      }
    })()
  }, [])

  useEffect(() => {
    if (isFungible(item.metadata.tokenStandard)) {
      setCrow(null)
      return
    }

    ;(async () => {
      try {
        const crow = await crowProgram.account.crow.fetch(findCrowPda(publicKey(item.id)))
        setCrow(crow || null)
      } catch {
        setCrow(null)
      }
    })()
  }, [])

  useEffect(() => {
    if (isFungible(item.metadata.tokenStandard)) {
      setStakeRecord(null)
      return
    }

    ;(async () => {
      try {
        const stakeRecord = (
          await stakeProgram.account.stakeRecord.all([
            {
              memcmp: {
                bytes: item.nftMint,
                offset: 72,
              },
            },
          ])
        )[0]

        setStakeRecord(stakeRecord)
      } catch {
        setStakeRecord(null)
      }
    })()
  }, [])

  const isSelected = selected.includes(item.nftMint)

  const showInfo = defaultShowInfo || settingsShowInfo
  const layoutSize = defaultLayoutSize || settingsLayoutSize

  const itemRarity = rarity.find((r) => r.nftMint === item.nftMint)

  const { transactions } = useTransactionStatus()
  const transaction = transactions.find((t) => t.nftMint === item.nftMint)

  const isDisabled = !isInScope

  function onItemClick(e: any) {
    renderItem(ItemDetails, { item })
  }

  const starred = starredNfts.includes(item.nftMint)

  async function onStarredChange(e: SyntheticEvent) {
    if (isDisabled) {
      toast("You're not signed in")
      return
    }
    if (!isInScope) return
    if (starred) {
      await removeNftFromStarred(item.nftMint)
    } else {
      await addNftToStarred(item.nftMint)
    }
  }

  const onNftClick = (e: MouseEvent) => {
    if (!isInScope) return
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (["LABEL", "INPUT"].includes(target.tagName)) {
      return
    }
    if (isDisabled) {
      toast("You're not signed in")
      return
    } else {
      select(item.nftMint)
    }
  }

  const fontSizes = {
    small: "14px",
    medium: "20px",
    large: "28px",
    collage: "30px",
  }

  const nameFontSizes = {
    small: "12px",
    medium: "16px",
    large: "20px",
    collage: "24px",
  }

  const RadioIndicator = isSelected ? RadioButtonCheckedIcon : RadioButtonUncheckedIcon

  const margins = {
    small: 0.5,
    medium: 0.75,
    large: 1,
    collage: 5,
  }

  const infoShowing = showInfo && layoutSize !== "collage"

  const transactionIcons = {
    send: <PlaneIcon />,
    burn: <LocalFireDepartment />,
    freeze: <LockIcon />,
    thaw: <LockOpenIcon />,
    repay: <Paid />,
    delist: <SellIcon />,
    list: <SellIcon />,
    sell: <SellIcon />,
    buy: <ShoppingCartIcon />,
  }

  const statusColors = {
    listed: theme.palette.primary.dark,
    "loan-taken": theme.palette.error.dark,
    "loan-given": theme.palette.success.dark,
    staked: theme.palette.secondary.dark,
    inVault: theme.palette.success.dark,
    frozen: theme.palette.warning.dark,
    linked: theme.palette.info.dark,
  }

  const balance =
    (isInScope && showAllWallets
      ? publicKeys.reduce((sum, pk) => sum + (item.balance?.[pk as keyof object] || 0), 0)
      : item.balance?.[actualPublicKey as keyof object]) || 0

  const price = item.price || 0
  const value = price * balance

  function enlarge(e: any) {
    if (enlarged) {
      return true
    }
    e.preventDefault()
    e.stopPropagation()
    renderItem(Item, { item, showInfo: true, layoutSize: "large", enlarged: true }, true)
  }

  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0
    setIsTouchDevice(isTouchDevice)
  }, [])

  const isNextGen = [6, 7].includes(item.metadata.tokenStandard)

  return (
    <Card
      sx={{
        outline:
          isSelected && layoutSize !== "collage" && !enlarged ? `${layoutSize === "small" ? 2 : 3}px solid` : "none",
        // outlineOffset: "-2px",
        cursor: "pointer",
        position: "relative",
        color: "primary.main",
        margin: margins[layoutSize],
        userSelect: "none",
        overflow: "visible",
        "-webkit-touch-callout": "none !important",
        "*": {
          MozUserSelect: "none !important",
          WebkitTouchCallout: "none !important",
        },

        "&:hover": {
          ".MuiStack-root, .MuiSvgIcon-root": {
            opacity: 1,
          },
        },
      }}
      onClick={onItemClick}
      onContextMenu={enlarge}
    >
      {transaction && (
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.default, 0.8),
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {transaction.status === "pending" && (
            <CircularProgressWithLabel>
              <SvgIcon fontSize="large" color={transaction.type === "burn" ? "error" : "primary"}>
                {transactionIcons[transaction.type as keyof object]}
              </SvgIcon>
            </CircularProgressWithLabel>
          )}

          {transaction.status === "success" && (
            <SvgIcon fontSize="large" color={transaction.type === "burn" ? "error" : "success"}>
              {transactionIcons[transaction.type as keyof object]}
            </SvgIcon>
          )}

          {transaction.status === "error" && (
            <SvgIcon fontSize="large" color={transaction.type === "burn" ? "disabled" : "error"}>
              {transactionIcons[transaction.type as keyof object]}
            </SvgIcon>
          )}
        </Box>
      )}
      <>
        {(!isTouchDevice || showInfo) && (
          <Stack
            direction="row"
            justifyContent={isInScope ? "space-between" : "center"}
            alignItems="center"
            onClick={onNftClick}
            sx={{
              position: infoShowing ? "static" : "absolute",
              top: 0,
              zIndex: 100000,
              overflow: "visible",
              width: "100%",
              padding: "0.5em",
              background: !item.loan ? alpha(theme.palette.background.default, 0.8) : "transparent",
              opacity: infoShowing || (layoutSize === "collage" && isSelected) ? 1 : 0,
              transition: infoShowing ? "none" : "opacity 0.2s",
              "&:hover": {
                ".plus-minus.MuiSvgIcon-root": {
                  color: alpha(theme.palette.text.disabled, 0.7),
                },
              },
              // background: "linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)"
            }}
          >
            {isInScope && (
              <Tooltip title={starred ? "Remove from starred" : "Add to starred"}>
                <Rating
                  max={1}
                  value={starred ? 1 : 0}
                  onChange={onStarredChange}
                  size={layoutSize === "collage" ? "large" : layoutSize}
                  disabled={isDisabled}
                />
              </Tooltip>
            )}

            {DragHandle && !isDisabled && <Tooltip title="Drag to reorder">{DragHandle as ReactElement}</Tooltip>}

            {isInScope && (
              <Tooltip title={isSelected ? "Remove from selection" : "Add to selection"}>
                <RadioIndicator
                  className="plus-minus"
                  sx={{
                    fontSize: fontSizes[layoutSize],
                    color: theme.palette.text.disabled,
                  }}
                />
              </Tooltip>
            )}
          </Stack>
        )}

        <Box
          sx={{
            width: "100%",
            aspectRatio: layoutSize === "collage" ? "auto" : "1 / 1",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            backgroundImage: lightMode ? "url(/books-lightest.svg)" : "url(/books-lighter.svg)",
            backgroundSize: "100%",
            borderRadius: "4px",
          }}
        >
          <img
            src={image}
            onError={(e: any) => {
              e.target.src = item.json?.image
              e.target.onerror = (er: any) => {
                er.target.src = lightMode ? "/books-lightest.svg" : "/books-lighter.svg"
              }
            }}
            width="100%"
            style={{
              display: "block",
              backgroundColor: alpha(theme.palette.background.default, 0.8),
              borderRadius: infoShowing ? 0 : "4px",
              aspectRatio: layoutSize === "collage" || enlarged ? "unset" : "1 / 1",
              objectFit: layoutSize === "collage" || enlarged ? "unset" : "cover",
            }}
          />

          {isFungible(item.metadata.tokenStandard) ? (
            <Stack>
              {value ? (
                <>
                  <Chip
                    avatar={<Avatar src="/birdeye.png" />}
                    label={`$${value.toLocaleString()}`}
                    component="a"
                    href={`https://birdeye.so/token/${item.nftMint}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e: any) => {
                      e.stopPropagation()
                    }}
                    sx={{
                      position: "absolute",
                      backgroundColor: alpha(theme.palette.background.default, 0.8),
                      right: "0.5em",
                      top: "0.5em",
                      fontWeight: "bold",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: alpha(theme.palette.background.default, 0.5),
                      },
                    }}
                  />
                </>
              ) : null}
              <Chip
                label={balance.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
                sx={{
                  position: "absolute",
                  backgroundColor: alpha(theme.palette.background.default, 0.8),
                  right: "0.5em",
                  bottom: "0.5em",
                  fontWeight: "bold",
                }}
              />
            </Stack>
          ) : (
            crow && (
              <Link href={`https://crow.so/crow/${item.id}`} target="_blank">
                <Box
                  sx={{
                    position: "absolute",
                    top: "3%",
                    left: "3%",
                    width: "15%",
                    height: "15%",
                    cursor: "pointer",
                  }}
                >
                  <img width={"100%"} src="/crow.png" style={{ display: "block" }} />
                </Box>
              </Link>
            )
          )}
          {isInScope && DragHandle && isTouchDevice && !showInfo && (
            <Box sx={{ position: "absolute", zIndex: 10, top: 0 }}>{DragHandle}</Box>
          )}
          {/* {item.status && ["frozen", "staked", "inVault"].includes(item.status) && (
              <Box
                sx={{
                  position: "absolute",
                  top: "0.25em",
                  right: "0.25em",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  padding: "5px",
                  // auto: "40px",
                  // height: "40px",
                  aspectRatio: "1 / 1",
                  borderRadius: "100%",
                }}
              >
                <Tooltip title={statusTitles[item.status as keyof object]}>
                  <SvgIcon
                    sx={{
                      color: colors[item.status as keyof object],
                      display: "block",
                    }}
                    fontSize="small"
                  >
                    <Frozen />
                  </SvgIcon>
                </Tooltip>
              </Box>
            )} */}
          {(item.status || item.delegate) && showInfo && (
            <CornerRibbon
              style={{
                textTransform: "uppercase",
                fontSize: { small: "10px", medium: "12px", large: "14px", collage: "16px" }[layoutSize],
              }}
              backgroundColor={
                item.delegate && !item.status
                  ? theme.palette.error.dark
                  : statusColors[(stakeRecord ? "staked" : item.status) as keyof object]
              }
            >
              {stakeRecord
                ? "STAKED"
                : item.delegate && !item.status
                ? "DELEGATED"
                : statusTitles[item.status as keyof object]}
            </CornerRibbon>
          )}
          {isNextGen && showInfo && (
            <Box
              sx={{
                position: "absolute",
                bottom: "3%",
                left: "3%",
                width: "15%",
                height: "15%",
              }}
            >
              <img
                src={item.metadata.tokenStandard === 6 ? "/nifty-dark.png" : "/metaplex.png"}
                style={{ display: "block" }}
                width="100%"
              />
            </Box>
          )}
          {showInfo &&
            item.status === "listed" &&
            ["MEv2", "TensorSwap", "ExchangeArt"].includes(item.listing?.marketplace!) && (
              <Tooltip title={`${lamportsToSol(item.listing?.price!)} SOL`}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "absolute",
                    top: "0.25em",
                    left: "0.25em",
                    width: "40px",
                    height: "40px",
                    padding: "7px",
                    borderRadius: "100%",
                    backgroundColor: alpha(theme.palette.background.default, 0.8),
                  }}
                >
                  {item.listing?.marketplace === "MEv2" && (
                    <Link
                      href={`https://magiceden.io/item-details/${item.nftMint}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img src="/me.png" width="100%" style={{ display: "block" }} />
                    </Link>
                  )}
                  {item.listing?.marketplace === "TensorSwap" && (
                    <SvgIcon sx={{ color: "text.primary" }}>
                      <Tensor />
                    </SvgIcon>
                  )}
                  {item.listing?.marketplace === "ExchangeArt" && (
                    <Link
                      href={`https://exchange.art/single/${item.nftMint}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      sx={{ display: "block", height: "100%" }}
                    >
                      <SvgIcon sx={{ color: "text.primary", padding: "4px", height: "100%" }}>
                        <ExchangeArt />
                      </SvgIcon>
                    </Link>
                  )}
                </Box>
              </Tooltip>
            )}
          {item.loan && <Loan loan={item.loan} isTouchDevice={isTouchDevice} item={item} />}
        </Box>

        {infoShowing && (
          <CardContent sx={{ position: "relative", paddingBottom: "1em !important" }}>
            <Tooltip title={item.content?.metadata.name || "Unknown"}>
              <Typography
                sx={{
                  fontSize: nameFontSizes[layoutSize],
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  fontWeight: "bold",
                  lineHeight: "2em",
                }}
              >
                {item.content?.metadata.name || "Unknown"}
                {item.metadata.tokenStandard === 2 && (
                  <Typography display="inline" variant="body2" color="primary" fontWeight="bold">
                    {" "}
                    - ({item.metadata.symbol || item.json?.symbol})
                  </Typography>
                )}
              </Typography>
            </Tooltip>
            {itemRarity && layoutSize !== "small" && (!item.loan || !isTouchDevice) && (
              <Stack
                sx={{
                  position: "absolute",
                  top: "-15px",
                  width: "calc(100% - 1em)",
                  right: "0.5em",
                }}
                direction={"row"}
                justifyContent={"space-between"}
                alignItems={"center"}
                spacing={1}
              >
                {itemRarity.howRare ? (
                  <Rarity type="howRare" rank={itemRarity.howRare} tier={itemRarity.howRareTier!} />
                ) : (
                  <Box />
                )}
                {itemRarity.moonRank ? (
                  <Rarity type="moonRank" rank={itemRarity.moonRank} tier={itemRarity.moonRankTier} />
                ) : (
                  <Box />
                )}
              </Stack>
            )}
          </CardContent>
        )}
        {layoutSize === "collage" && showInfo && (
          <CardContent>
            <Stack direction="row" justifyContent="center">
              {item.json?.name || item.metadata?.name}
            </Stack>
          </CardContent>
        )}
      </>
    </Card>
  )
}
