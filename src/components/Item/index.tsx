import { Box, Card, CardContent, Chip, CircularProgress, Dialog, IconButton, Link, Modal, Rating, Skeleton, Stack, SvgIcon, Table, TableCell, TableRow, Typography, styled } from "@mui/material";
import { findKey, isEqual, uniq } from "lodash";
import { useSelection } from "../../context/selection";
import { useUiSettings } from "../../context/ui-settings";
import { FC, MouseEvent, SyntheticEvent, forwardRef, memo, useEffect, useRef, useState } from "react";
import { useFrozen } from "../../context/frozen";
import AcUnitIcon from '@mui/icons-material/AcUnit';
import LockIcon from '@mui/icons-material/Lock';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useDatabase } from "../../context/database";
import axios from "axios";
import { ArrowBackIosNew, ArrowForward, ArrowForwardIos, Public } from "@mui/icons-material";
import { useDialog } from "../../context/dialog";
import { useTags } from "../../context/tags";
import AddCircleIcon from "@mui/icons-material/AddCircle"
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import useOnScreen from "../../hooks/use-on-screen";
import { useMetaplex } from "../../context/metaplex";
import { PublicKey } from "@metaplex-foundation/js";
import HowRare from './howrare.svg';
import { useSorting } from "../../context/sorting";
import { cols } from "../Items";

type Category = "image" | "video" | "audio" | "vr";

const tokenStandards = {
  0: "NFT",
  1: "SFT",
  2: "Token",
  3: "NFT Edition",
  4: "pNFT"
}

function getMultimediaType(ext: string): Category {
  const types = {
    image: ["jpg", "jpeg", "jpng", "gif", "png"],
    video: ["mp4", "mov"],
    audio: ["mp3", "wav", "flac"],
    web: ["html"],
    vr: ["glb", "gltf"]
  } 
  return findKey(types, items => items.includes(ext)) as Category
}

export function shorten(address: string) {
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}

export type Item = {
  mint: string;
  image?: string | null;
  starred?: boolean;
}

export interface ItemProps {
  item: Item
}

export const Asset = ({ asset }) => {
  console.log(asset)
  if (!asset) {
    return <img src="/books.svg" width="100%" style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }} />
  }
  const multimediaType = getMultimediaType(asset.type.split('/')[1]);

  if (multimediaType === "image") {
    return <img
      src={`https://img-cdn.magiceden.dev/rs:fill:800/plain/${asset.uri}`}
      style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}
    />      

  }

  if (multimediaType === "web") {
    return <iframe
      src={asset.uri}
      style={{ display: "block", width: "100%", aspectRatio: "1 / 1" }}
      onLoad={(event) => event.target.focus()}
    />      
  }
  
  if (multimediaType === "video") {
    return <video
      src={asset.uri}
      autoPlay
      width="100%"
      style={{ display: "block", aspectRatio: "1 / 1" }}
      muted
      controls
      loop
    />
  }

  if (multimediaType === "audio") {
    return <audio
      src={asset.uri}
      style={{ display: "block", aspectRatio: "1 / 1" }}
      autoPlay
      controls
      loop
    />
  }

  if (multimediaType === 'vr') {
    return <model-viewer
      src={asset.uri}
      alt="Model"
      camera-controls
      ar-modes="webxr"
      width="100%"
      style={{ width: "55px", height: "55px", background: "transparent" }}
    >
    </model-viewer>
  }

  return null;
}

async function getType(uri: string) {
  if (!uri) {
    return;
  }
  try {
    const { headers } = await axios.get(uri);
    console.log(headers)
    const type = headers["content-type"];
  
    return {
      uri,
      type
    }
  } catch (err) {
    console.error(err);
    return;
  }
}

export const ItemDetails = ({ item }) => {
  const [assetIndex, setAssetIndex] = useState(0);
  const [assets, setAssets] = useState([])
  const [asset, setAsset] = useState(null);
  const { db } = useDatabase();
  const { tags, removeNftsFromTag, addNftsToTag } = useTags();
  const router = useRouter()

  const selectedTags = useLiveQuery(() => db && db
    .taggedNfts
    .where({ nftId: item.nftMint })
    .toArray(),
    [item, db],
    []
  ) || [];

  function forward() {
    setAssetIndex(assets[assetIndex + 1] ? assetIndex + 1 : 0)
  }

  function back() {
    setAssetIndex(assets[assetIndex - 1] ? assetIndex - 1 : assets.length - 1)
  }

  async function getAssets() {
    const assets = (await Promise.all(uniq([
      ...(item.json?.animation_url ? [item.json.animation_url] : []),
      ...(item.json?.image ? [item.json.image] : []),
      ...(item.json?.properties?.files ? item.json?.properties.files.map(f => f.uri) : []),
      ...(item.json?.properties?.dna ? item.json.properties.dna.map(child => child.metadata.image) : [])
    ]).map(getType))).filter(item => item && item.type)
    console.log({assets})

    setAssets(assets)
  }

  useEffect(() => {
    getAssets()
  }, [])
  
  useEffect(() => {
    const asset = assets[assetIndex];
    setAsset(asset)
  }, [assets, assetIndex])

  async function addTag(tag) {
    await addNftsToTag(tag.id, [item.nftMint])
    toast.success(`Added item to ${tag.name}`)
  }

  async function removeTag(tag) {
    await removeNftsFromTag(tag.id, [item.nftMint]);
    toast.success(`Removed item from ${tag.name}`)
  }
  console.log(item)

  return (
    <Card sx={{ height: "100%", outline: 'none !important', width: "100%", overflowY: "auto" }}>
      <Stack direction="row">
        <Box sx={{ width: "100%", }}>
          <Stack spacing={2} justifyContent="center">
            <Box sx={{
              position: "relative",
              width: "100%",
              height: "auto",
              "&:hover": {
                ".MuiStack-root": {
                  opacity: 1
                }
            }}}>
              <Asset asset={asset} />
              {
                assets.length > 1 && (
                  <Stack
                    sx={{
                      width: "100%",
                      position: "absolute",
                      height: "100%",
                      opacity: 0,
                      transition: "opacity .2s",
                      top: 0,
                      pointerEvents: "none"
                    }}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box onClick={back} sx={{
                      pointerEvents: "all",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      padding: "1em",
                      cursor: "pointer",
                      left: 0,
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <ArrowBackIosNew />
                    </Box>
                    <Box onClick={forward} sx={{
                      pointerEvents: "all",
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      padding: "1em",
                      cursor: "pointer",
                      right: 0,
                      display: "flex",
                      alignItems: "center"
                    }}>
                      <ArrowForwardIos />
                    </Box>
                  </Stack>
                )
              }
            </Box>
            {
              asset && <Link href={asset.uri} sx={{ textAlign: "center", display: "block", marginBottom: "2em !important" }} underline="hover" variant="h6">View full asset</Link>
            }
          </Stack>
              
        </Box>
        <CardContent sx={{ width: "100%"}}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h4">
              {item.json?.name || item.name}
            </Typography>
            <Typography>
              {item.json?.symbol || item.symbol}
            </Typography>
          </Stack>
          <hr />
          <Stack spacing={2}>
            <Typography variant="h5">Details</Typography>
            <Table>
              <TableRow>
                <TableCell>Mint address</TableCell>
                <TableCell sx={{ textAlign: "right" }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                    <Link href={`https://solscan.io/token/${item.nftMint}`}>
                      <img src="/solscan.png" width="15px" style={{ display: "block" }}/>
                    </Link>
                    <Typography>
                      {shorten(item.nftMint)}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Token standard</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{tokenStandards[item.tokenStandard] || "NFT"}</TableCell>
              </TableRow>
              {
                item.tokenStandard === 3 && (
                  <TableRow>
                    <TableCell>Edition #</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>Editions</TableCell>
                  </TableRow>
                )
              }
              <TableRow>
                <TableCell>Royalties</TableCell>
                <TableCell sx={{ textAlign: "right" }}>{item.sellerFeeBasisPoints / 100}%</TableCell>
              </TableRow>
            </Table>
            <Typography>{item.json?.description}</Typography>
            <Typography variant="h5">Traits</Typography>
            {
              item.json?.attributes?.length
                ? <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {
                      (item.json?.attributes || []).map((att, index) => (
                        <Box key={index} sx={{ borderRadius: "5px", border: "1px solid GrayText", padding: 1 }}>
                          <Typography color="GrayText" textTransform="uppercase">{ att.trait_type }</Typography>
                          <Typography>{ att.value }</Typography>
                        </Box>
                      ))
                    }
                  </Stack>
                : <Typography variant="h6">None</Typography>
            }
            <Typography variant="h6">Tags</Typography>
            <Stack direction="row"
              spacing={0}
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
            {
              tags.map(tag => {
                const isSelected = selectedTags.map(item => item.tagId).includes(tag.id);
                return (
                  <Chip
                    label={tag.name}
                    key={tag.id}
                    onDelete={() => isSelected ? removeTag(tag) : addTag(tag)}
                    onClick={() => router.push(`/tag/${tag.id}`)}
                    color={tag.id}
                    variant={isSelected ? "contained" : "outlined"}
                    deleteIcon={!isSelected && <AddCircleIcon />}
                  />
                )
              })
            }
            </Stack>
            
          </Stack>
        </CardContent>
      </Stack>
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

const Rarity = ({ rank, type, tier }) => {
  return <Chip
    icon={type === "howRare" && <HowRare style={{marginLeft: "0.5em" }} />}
    label={`${type === "moonRank" ? "⍜" : ""} ${rank}`}
    sx={{ backgroundColor: colors[tier] }}
    size="small"
  />
}

export const Item: FC<ItemProps> = memo(({ item, selected, select, DragHandle, affected = false }) => {
  const { updateStarred, updateItem } = useDatabase();
  const { layoutSize, showInfo } = useUiSettings()
  const { frozen, inVault } = useFrozen();
  const { renderItem } = useDialog();
  const metaplex = useMetaplex();

  async function loadNft() {
    try {
      const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(item.nftMint) });
      await updateItem({
        ...item,
        ...nft
      })
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    loadNft()
  }, [item])

  async function onStarredChange(e: SyntheticEvent) {
    await updateStarred(item.nftMint, !item.starred)
  }

  const onNftClick = (e: MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (['LABEL', 'INPUT'].includes(target.tagName)) {
      return;
    }
    select(item.nftMint)
  }

  const LockedIndicator = styled(Rating)({
    '& .MuiRating-iconFilled': {
      color: '#ff6d75',
    },
    '& .MuiRating-iconHover': {
      color: '#ff3d47',
    },
  });

  const FrozenIndicator = styled(Rating)({
    '& .MuiRating-iconFilled': {
      color: "#a6e3e0"
    },
    '& .MuiRating-iconHover': {
      color: "#a6e3e0"
    },
  });

  const fontSizes = {
    small: "14px",
    medium: "20px",
    large: "28px",
    collage: "3opx"
  }

  const RadioIndicator = selected ? RadioButtonCheckedIcon : RadioButtonUncheckedIcon

  const margins = {
    small: 0.5,
    medium: 0.75,
    large: 1,
    collage: 5
  }

  const infoShowing = showInfo && layoutSize !== "collage";

  return (
    <Card
      sx={{
        outline: selected && layoutSize !== "collage" ? `${layoutSize === "small" ? 2 : 3}px solid white` : "none",
        // outlineOffset: "-2px",
        cursor: "pointer",
        position: "relative",
        margin: margins[layoutSize],
        userSelect: "none",

        "&:hover": {
          ".MuiStack-root, .MuiSvgIcon-root": {
            opacity: 1
          }
        }
      }}
      
      onClick={() =>  renderItem(ItemDetails, { item })}>
          <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            onClick={onNftClick}
            sx={{
              position: infoShowing ? "static" : "absolute",
              top: 0,
              width: "100%",
              padding: "0.5em",
              background: "rgba(20, 20, 20, 0.8)",
              opacity: infoShowing || (layoutSize === "collage" && selected) ? 1 : 0,
              transition: infoShowing ? "none" : 'opacity 0.2s',
              "&:hover": {
                ".plus-minus.MuiSvgIcon-root": {
                  color: "white"
                }
              }
              // background: "linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0) 100%)"
            }}
          >
            {/* <FrozenIndicator
              max={1}
              value={frozen.includes(item.nftMint) ? 1 : 0}
              icon={<AcUnitIcon fontSize="inherit" />}
              emptyIcon={<AcUnitIcon fontSize="inherit" />}
              size={layoutSize}
            /> */}
            <Rating
              max={1}
              value={item.starred ? 1 : 0}
              onChange={onStarredChange}
              size={layoutSize === "collage" ? "large" : "layoutSize"}
            />
            { DragHandle }
            <RadioIndicator
              className="plus-minus"
              sx={{
                fontSize: fontSizes[layoutSize],
                color: "grey"
              }}
            />
            {/* <LockedIndicator
              max={1}
              value={inVault.includes(item.nftMint) ? 1 : 0}
              icon={<LockIcon fontSize="inherit" />}
              emptyIcon={<LockOutlinedIcon fontSize="inherit" />}
              size={layoutSize}
            /> */}
          </Stack>
          {
            
            item.jsonLoaded
              ? <Box sx={{
                width: "100%",
                aspectRatio: layoutSize === "collage" ? "auto" : "1 / 1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}><img
              src={item.json?.image
                ? `https://img-cdn.magiceden.dev/${layoutSize === "collage" ? "rs:fill:600" : "rs:fill:400:400:0:0"}/plain/${item.json?.image}`
                : "/books.svg"
              }
              onError={e => e.target.src = "./books.svg"}
              width="100%"
              style={{ display: "block" }}
            /></Box>
              : <Box sx={{
                width: "100%",
                aspectRatio: "1 / 1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <CircularProgress />
              </Box>
            }      
            {
              infoShowing && <CardContent sx={{ position: "relative" }}>
                <Typography sx={{
                  // fontSize: `${7 / cols[layoutSize]}vw`,
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  fontWeight: "bold"
                }}>{item.json?.name || item.name || "Unknown"}</Typography>
                <Stack sx={{ position: "absolute", top: "-15px", width: "calc(100% - 1em)", right: "0.5em" }} direction="row" justifyContent="space-between" spacing={2}>
                  {
                    item.howRare && <Rarity type="howRare" rank={item.howRare} tier={item.howRareTier} />
                  }
                  {
                    item.moonRank && <Rarity type="moonRank" rank={item.moonRank} tier={item.moonRankTier} />
                  }
                </Stack>
              </CardContent>
            }
            {
              layoutSize === "collage" && <CardContent>
                <Stack direction="row" justifyContent="center">{ item.name }</Stack>
              </CardContent>
            }
          </>
    </Card>
  )
}, (prev, next) => {
  return isEqual(prev.item, next.item) &&
    prev.selected === next.selected
})