import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  CircularProgressProps,
  Dialog,
  IconButton,
  Link,
  Rating,
  Stack,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import { default as NextLink } from "next/link"
import { findKey, uniq } from "lodash"
import { useUiSettings } from "../../context/ui-settings"
import { FC, MouseEvent, ReactElement, ReactNode, SyntheticEvent, useEffect, useState } from "react"
import Frozen from "@mui/icons-material/AcUnit"
import LockIcon from "@mui/icons-material/Lock"
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked"
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"
import { useDatabase } from "../../context/database"
import axios from "axios"
import { ArrowBackIosNew, ArrowForwardIos, Close, LocalFireDepartment } from "@mui/icons-material"
import { useDialog } from "../../context/dialog"
import { useTags } from "../../context/tags"
import AddCircleIcon from "@mui/icons-material/AddCircle"
import { useLiveQuery } from "dexie-react-hooks"
import { useRouter } from "next/router"
import { toast } from "react-hot-toast"
import useOnScreen from "../../hooks/use-on-screen"
import { useMetaplex } from "../../context/metaplex"
import { PublicKey } from "@metaplex-foundation/js"
import HowRare from "./howrare.svg"

import { useAccess } from "../../context/access"
import { useTransactionStatus } from "../../context/transactions"
import PlaneIcon from "../ActionBar/plane.svg"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { CopyAddress } from "../CopyAddress"
import LockOpenIcon from "@mui/icons-material/LockOpen"
import { unwrapSome } from "@metaplex-foundation/umi"
import { Loan, Nft, RarityTier, Tag } from "../../db"
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../../context/umi"
import { useNfts } from "../../context/nfts"
import { useBasePath } from "../../context/base-path"

type Category = "image" | "video" | "audio" | "vr" | "web"

const tokenStandards = {
  0: "NFT",
  1: "SFT",
  2: "Token",
  3: "NFT Edition",
  4: "pNFT",
  5: "OCP NFT",
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

const Loan: FC<{ loan: Loan }> = ({ loan }) => {
  const [timeRemaining, setTimeRemaining] = useState("")
  const [urgent, setUrgent] = useState(false)
  const { showInfo } = useUiSettings()

  function getTimeRemaining() {
    const seconds = loan.defaults - Date.now() / 1000
    const days = Math.floor(seconds / 24 / 60 / 60)
    const hoursLeft = Math.floor(seconds - days * 86400)
    const hours = Math.floor(hoursLeft / 3600)
    const minutesLeft = Math.floor(hoursLeft - hours * 3600)
    const minutes = Math.floor(minutesLeft / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    setTimeRemaining(`${days > 0 ? `${days}d ` : ""}${hours > 0 ? `${hours}h ` : ""}${minutes}m ${remainingSeconds}s`)
    setUrgent(days <= 0)
  }

  useEffect(() => {
    getTimeRemaining()
    const interval = setInterval(getTimeRemaining, 1000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <Stack
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(20, 20, 20, 0.8)",
        opacity: showInfo ? 1 : 0,
        transition: "opacity 0.2s",
      }}
      justifyContent="center"
      alignItems="center"
    >
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
  )
}

function getMultimediaType(ext: string): Category {
  const types = {
    image: ["jpg", "jpeg", "jpng", "gif", "png"],
    video: ["mp4", "mov"],
    audio: ["mp3", "wav", "flac"],
    web: ["html"],
    vr: ["glb", "gltf"],
  }
  return findKey(types, (items) => items.includes(ext)) as Category
}

export function shorten(address: string) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}

export interface ItemProps {
  item: Nft
  select?: Function
  selected?: boolean
  DragHandle?: ReactNode
  lazyLoad?: boolean
}

type Asset = {
  type: string
  uri: string
}

export const Asset: FC<{ asset?: Asset | null }> = ({ asset }) => {
  if (!asset) {
    return (
      <img src="/loading-slow.gif" width="100%" style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }} />
    )
  }
  const multimediaType = getMultimediaType(asset.type.split("/")[1].split(";")[0]) || "image"

  if (multimediaType === "image") {
    return <img src={asset.uri} style={{ display: "block", width: "100%" }} />
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
    return <audio src={asset.uri} style={{ display: "block", aspectRatio: "1 / 1" }} autoPlay controls loop />
  }

  if (multimediaType === "vr") {
    return (
      <model-viewer
        src={asset.uri}
        alt="Model"
        camera-controls
        ar-modes="webxr"
        width="100%"
        style={{ width: "55px", height: "55px", background: "transparent" }}
      ></model-viewer>
    )
  }

  return null
}

async function getType(uri: string) {
  if (!uri) {
    return
  }
  try {
    const { headers } = await axios.get(uri)
    const type = headers["content-type"]

    return {
      uri,
      type,
    }
  } catch (err) {
    console.error(err)
    return
  }
}

export const ItemDetails = ({ item }: { item: Nft }) => {
  const [assetIndex, setAssetIndex] = useState(0)
  const [assets, setAssets] = useState<Asset[]>([])
  const [asset, setAsset] = useState<Asset | null>(null)
  const { db } = useDatabase()
  const { tags, removeNftsFromTag, addNftsToTag } = useTags()
  const { isAdmin } = useAccess()
  const router = useRouter()
  const { connection } = useConnection()
  const { collections } = useDatabase()
  const metaplex = useMetaplex()
  const wallet = useWallet()
  const [gate, setgate] = useState(null)
  const basePath = useBasePath()
  const [metadataShowing, setMetadataShowing] = useState(false)

  function toggleMetadataShowing() {
    setMetadataShowing(!metadataShowing)
  }

  const selectedTags =
    useLiveQuery(() => db && db.taggedNfts.where({ nftId: item.nftMint }).toArray(), [item, db], []) || []

  function forward() {
    setAssetIndex(assets[assetIndex + 1] ? assetIndex + 1 : 0)
  }

  function back() {
    setAssetIndex(assets[assetIndex - 1] ? assetIndex - 1 : assets.length - 1)
  }

  async function getAssets() {
    const assets = (
      await Promise.all(
        uniq([
          ...(item.json?.animation_url ? [item.json.animation_url] : []),
          ...(item.json?.image ? [item.json.image] : []),
          ...(item.json?.properties?.files ? item.json?.properties.files.map((f) => f.uri) : []),
          ...(item.json?.properties?.dna
            ? (item.json.properties.dna as any).map((child: any) => child.metadata.image)
            : []),
        ]).map(getType)
      )
    ).filter((item) => item && item.type)

    setAssets(assets as Asset[])
  }

  useEffect(() => {
    getAssets()
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

  const statuses = {
    staked: "Staked",
    frozen: "Frozen",
    inVault: "In Vault",
  }

  return (
    <Card sx={{ height: "100%", outline: "none !important", width: "100%", overflowY: "auto", padding: 2 }}>
      <Stack direction="row">
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
              {item.nftMint === USDC ? <img src="/usdc.png" width="100%" /> : <Asset asset={asset} />}

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
                <Button href={asset.uri} target="_blank" rel="noreferrer" variant="contained" size="large">
                  View full asset
                </Button>
              )}
              <Button size="large" onClick={toggleMetadataShowing}>
                {metadataShowing ? "View image" : "View metadata"}
              </Button>
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ width: "100%" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" fontFamily="Lato" fontWeight="bold">
              {item.json?.name || item.metadata.name}
            </Typography>
            <Typography color="primary">{item.json?.symbol || item.metadata.symbol}</Typography>
          </Stack>
          <hr />
          <Stack spacing={2}>
            <Typography variant="h5" color="primary" fontFamily="Lato" fontWeight="bold">
              Details
            </Typography>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      Mint address
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <CopyAddress>{item.nftMint}</CopyAddress>
                  </TableCell>
                </TableRow>
                {[0, 1, 4].includes(unwrapSome(item.metadata.tokenStandard)!) && collection && (
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
                <TableRow>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      Token standard
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Typography>
                      {unwrapSome(item.metadata.collectionDetails) && "Collection "}
                      {tokenStandards[unwrapSome(item.metadata.tokenStandard)!] || "Unknown"}
                    </Typography>
                  </TableCell>
                </TableRow>
                {unwrapSome(item.metadata.tokenStandard) === TokenStandard.NonFungibleEdition && (
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
                <TableRow>
                  <TableCell>
                    <Typography fontWeight="bold" color="primary">
                      Royalties
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Typography>{item.metadata.sellerFeeBasisPoints / 100}%</Typography>
                  </TableCell>
                </TableRow>
                {item.status && (
                  <TableRow>
                    <TableCell>
                      <Typography fontWeight="bold" color="primary">
                        Status
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <Typography>{statuses[item.status as keyof object]}</Typography>
                    </TableCell>
                  </TableRow>
                )}

                {gate && (
                  <TableRow>
                    <TableCell>gate</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      <CopyAddress>{gate}</CopyAddress>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Typography>{item.json?.description}</Typography>
            <Typography variant="h5" fontWeight="bold" fontFamily="Lato" color="primary">
              Traits
            </Typography>
            {item.json?.attributes?.length ? (
              <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 1 }}>
                {(item.json?.attributes || []).map((att, index) => (
                  <Box
                    key={index}
                    sx={{ borderRadius: "5px", border: "1px solid", padding: 1, borderColor: "primary.main" }}
                  >
                    <Typography color="primary" textTransform="uppercase">
                      {att.trait_type}
                    </Typography>
                    <Typography>{att.value}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="h6">None</Typography>
            )}
            {isAdmin && !router.query.publicKey && (
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
                        onDelete={isAdmin ? () => (isSelected ? removeTag(tag) : addTag(tag)) : undefined}
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
            backgroundColor: "#111",
            backgroundImage: "url(/books-lighter.svg)",
            backgroundAttachment: "fixed",
            height: "100vh",
            borderRadius: 0,
          }}
        >
          <CardContent>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(item.json, null, 2)}</pre>
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
      sx={{ backgroundColor: colors[tier as keyof object], fontSize: sizes[layoutSize as keyof object] || "inherit" }}
      size={"small"}
    />
  )
}

export const Item: FC<ItemProps> = ({ item, selected, select, DragHandle }) => {
  const { updateItem } = useDatabase()
  const { layoutSize, showInfo } = useUiSettings()
  const { rarity } = useNfts()
  const { renderItem } = useDialog()
  const metaplex = useMetaplex()
  const { isAdmin } = useAccess()
  const { addNftToStarred, removeNftFromStarred, starredNfts } = useTags()

  const itemRarity = rarity.find((r) => r.nftMint === item.nftMint)

  const { transactions } = useTransactionStatus()
  const transaction = transactions.find((t) => t.nftMint === item.nftMint)

  async function loadNft() {
    try {
      const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(item.nftMint) })
      await updateItem({
        ...item,
        json: nft.json,
        jsonLoaded: true,
      })
    } catch (err) {
      console.log(err)
    }
  }

  function onItemClick(e: any) {
    renderItem(ItemDetails, { item })
  }

  useEffect(() => {
    if (item.json) return
    loadNft()
  }, [item])

  const starred = starredNfts.includes(item.nftMint)

  async function onStarredChange(e: SyntheticEvent) {
    if (!isAdmin) return
    if (starred) {
      await removeNftFromStarred(item.nftMint)
    } else {
      await addNftToStarred(item.nftMint)
    }
  }

  const onNftClick = (e: MouseEvent) => {
    if (!isAdmin) return
    e.stopPropagation()
    const target = e.target as HTMLElement
    if (["LABEL", "INPUT"].includes(target.tagName)) {
      return
    }
    select?.(item.nftMint)
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

  const RadioIndicator = selected ? RadioButtonCheckedIcon : RadioButtonUncheckedIcon

  const margins = {
    small: 0.5,
    medium: 0.75,
    large: 1,
    collage: 5,
  }

  const infoShowing = showInfo && layoutSize !== "collage"
  const colors = {
    frozen: "#c8ad7f",
    inVault: "#a6e3e0",
    staked: "#ffffff",
  }

  const transactionIcons = {
    send: <PlaneIcon />,
    burn: <LocalFireDepartment />,
    freeze: <LockIcon />,
    thaw: <LockOpenIcon />,
  }

  const statusTitles = {
    staked: "Staked",
    inVault: "In Vault",
    frozen: "Frozen",
  }

  return (
    <Card
      sx={{
        outline: selected && layoutSize !== "collage" ? `${layoutSize === "small" ? 2 : 3}px solid white` : "none",
        // outlineOffset: "-2px",
        cursor: "pointer",
        position: "relative",
        margin: margins[layoutSize],
        userSelect: "none",
        overflow: "visible",

        "&:hover": {
          ".MuiStack-root, .MuiSvgIcon-root": {
            opacity: 1,
          },
        },
      }}
      onClick={onItemClick}
    >
      {transaction && (
        <Box
          sx={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
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
        {isAdmin && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            onClick={onNftClick}
            sx={{
              position: infoShowing ? "static" : "absolute",
              top: 0,
              zIndex: 1,
              overflow: "visible",
              width: "100%",
              padding: "0.5em",
              background: "rgba(20, 20, 20, 0.8)",
              opacity: infoShowing || (layoutSize === "collage" && selected) ? 1 : 0,
              transition: infoShowing ? "none" : "opacity 0.2s",
              "&:hover": {
                ".plus-minus.MuiSvgIcon-root": {
                  color: "white",
                },
              },
              // background: "linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)"
            }}
          >
            <Tooltip title={starred ? "Remove from starred" : "Add to starred"}>
              <Rating
                max={1}
                value={starred ? 1 : 0}
                onChange={onStarredChange}
                size={layoutSize === "collage" ? "large" : layoutSize}
              />
            </Tooltip>
            {DragHandle && <Tooltip title="Drag to reorder">{DragHandle as ReactElement}</Tooltip>}

            <Tooltip title={selected ? "Remove from selection" : "Add to selection"}>
              <RadioIndicator
                className="plus-minus"
                sx={{
                  fontSize: fontSizes[layoutSize],
                  color: "grey",
                }}
              />
            </Tooltip>
          </Stack>
        )}

        {item.jsonLoaded ? (
          <Box
            sx={{
              width: "100%",
              aspectRatio: layoutSize === "collage" ? "auto" : "1 / 1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              backgroundImage: "url(/loading-slow.gif)",
              backgroundSize: "100%",
            }}
          >
            <img
              src={
                item.nftMint === USDC
                  ? "/usdc.png"
                  : item.json?.image
                  ? `https://img-cdn.magiceden.dev/${
                      layoutSize === "collage" ? "rs:fill:600" : "rs:fill:400:400:0:0"
                    }/plain/${item.json?.image}`
                  : "/books-lighter.svg"
              }
              onError={(e: any) => (e.target.src = "/books-lighter.svg")}
              width="100%"
              style={{ display: "block", background: "#121212" }}
            />
            {[1, 2].includes(unwrapSome(item.metadata.tokenStandard)!) && (
              <Stack>
                {item.price && item.balance ? (
                  <>
                    <Chip
                      avatar={<Avatar src="/birdeye.png" />}
                      label={`$${(item.price * item.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                      component="a"
                      href={`https://birdeye.so/token/${item.nftMint}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e: any) => {
                        e.stopPropagation()
                      }}
                      sx={{
                        position: "absolute",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        right: "0.5em",
                        top: "0.5em",
                        fontWeight: "bold",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.5)!important",
                        },
                      }}
                    />
                  </>
                ) : null}
                <Chip
                  label={(item.balance || 1).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  sx={{
                    position: "absolute",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    right: "0.5em",
                    bottom: "0.5em",
                    fontWeight: "bold",
                  }}
                />
              </Stack>
            )}
            {item.status && (
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
            )}
            {item.loan && <Loan loan={item.loan} />}
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              aspectRatio: "1 / 1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            <img src="/loading-slow.gif" width="100%" />
            {item.loan && <Loan loan={item.loan} />}
          </Box>
        )}

        {infoShowing && (
          <CardContent sx={{ position: "relative", paddingBottom: "1em !important" }}>
            <Tooltip title={item.json?.name || item.metadata?.name || "Unknown"}>
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
                {item.json?.name || item.metadata?.name || "Unknown"}
                {unwrapSome(item.metadata.tokenStandard) === 2 && (
                  <Typography display="inline" variant="body2" color="primary" fontWeight="bold">
                    {" "}
                    - ({item.metadata.symbol || item.json?.symbol})
                  </Typography>
                )}
              </Typography>
            </Tooltip>
            {itemRarity && (
              <Stack
                sx={{
                  position: "absolute",
                  top: layoutSize === "small" ? "-15px" : "-15px",
                  width: "calc(100% - 1em)",
                  right: layoutSize === "small" ? "unset" : "0.5em",
                  left: layoutSize === "small" ? "3px" : "unset",
                }}
                direction={layoutSize === "small" ? "row" : "row"}
                justifyContent={layoutSize === "small" ? "flex-start" : "space-between"}
                alignItems={layoutSize === "small" ? "flex-start" : "center"}
                spacing={layoutSize === "small" ? 0.25 : 1}
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
