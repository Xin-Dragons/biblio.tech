"use client"
import { useUiSettings } from "@/context/ui-settings"
import {
  Card,
  CardContent,
  Stack,
  SvgIcon,
  Typography,
  Link as MuiLink,
  Chip,
  alpha,
  Box,
  Tooltip,
  Avatar,
  Table,
  TableBody,
  TableRow,
  TableCell,
  FormControlLabel,
  Switch,
  ToggleButton,
  IconButton,
  TextField,
  Dialog,
  Container,
  Radio,
  RadioGroup,
} from "@mui/material"
import Link from "next/link"
import { ImageWithFallback } from "./ImageWithFallback"
import { FC, useState } from "react"
import { useTheme } from "@/context/theme"
import { DigitalAsset as DigitalAssetType } from "@/app/models/DigitalAsset"
import { Rarity } from "./Rarity"
import Tensor from "@/../public/tensor.svg"
import Solana from "@/../public/solana.svg"
import Plane from "@/../public/plane.svg"
import { lamportsToSol } from "@/helpers/utils"
import { useSelection } from "@/context/selection"
import {
  AcUnit,
  ArrowDownward,
  ArrowUpward,
  Cancel,
  Check,
  Diamond,
  Edit,
  InfoOutlined,
  LocalFireDepartment,
  LocalOffer,
  Lock,
  LockOpen,
  Paid,
  QuestionMark,
  Sell,
  ShoppingCart,
} from "@mui/icons-material"
import dayjs from "@/helpers/dayjs"
import { MARKETPLACE_IMAGES } from "@/constants/images"
import { getTier } from "@/helpers/rarity"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { format } from "date-fns"
import Vault from "./Vault/vault.svg"
import { useTensor } from "@/context/tensor"
import { CircularProgressWithLabel } from "./CircularProgressWithLabel"
import { useTransactionStatus } from "@/context/transactions"
import { noop } from "lodash"

const transactionIcons = {
  send: <Plane />,
  burn: <LocalFireDepartment />,
  freeze: <Lock />,
  thaw: <LockOpen />,
  repay: <Paid />,
  delist: <Sell />,
  list: <Sell />,
  sell: <Sell />,
  buy: <ShoppingCart />,
}

export const margins = {
  small: 0.5,
  medium: 0.75,
  large: 1,
  collage: 5,
}

export const avatarSizes = {
  small: 30,
  medium: 40,
  large: 50,
}

export const fontSizes = {
  small: "body2",
  medium: "body1",
  large: "h6",
}

export const iconSizes = {
  small: 14,
  medium: 18,
  large: 25,
}

export function DigitalAsset({
  item,
  basePath,
  Overlay,
  condensed,
  numMints = 1,
  walletView,
  edit,
}: {
  item: DigitalAssetType
  basePath?: string
  Overlay?: FC<any>
  condensed?: boolean
  numMints?: number
  walletView?: boolean
  edit?: boolean
}) {
  const theme = useTheme()
  const { layoutSize, zenMode } = useUiSettings()
  const { delist } = useTensor()
  const { selected, select } = useSelection()
  const { easySelect } = useUiSettings()
  const [editValueShowing, setEditValueShowing] = useState(false)

  function toggleEditValueShowing() {
    setEditValueShowing(!editValueShowing)
  }

  const price = item.listing?.price ? item.listing.price / LAMPORTS_PER_SOL : null

  async function delistItem(e: any) {
    e.preventDefault()
    e.stopPropagation()
    await delist([item])
  }

  const { transactions } = useTransactionStatus()
  const transaction = transactions.find((t) => t.id === item.id)

  return (
    <>
      <Card
        sx={{
          margin: margins[layoutSize as keyof typeof margins],
          outline: selected.includes(item.id) ? "3px solid white" : "none",
          outlineOffset: "-3px",
          cursor: easySelect ? "copy" : "pointer",
          zIndex: 999,
          position: "relative",
        }}
        onMouseEnter={(e) => console.log(item)}
        onClick={(e) => {
          if (easySelect) {
            e.preventDefault()
            select(item.id)
          }
        }}
      >
        <Box>
          {item.isNew && item.listing && (
            <Tooltip
              sx={{
                ".MuiTooltip": {
                  backgroundColor: "background.default",
                },
              }}
              title={
                <Stack>
                  <Typography textTransform="uppercase" variant="body2">
                    New listing
                  </Typography>
                  <Typography variant="body2">Listed {dayjs(item.listing.blocktime).fromNow()}</Typography>
                </Stack>
              }
            >
              <Chip
                color="success"
                label="NEW"
                size="small"
                sx={{
                  position: "absolute",
                  top: "0.5em",
                  right: "0.5em",
                  zIndex: 100,
                  color: "white",
                  fontWeight: "bold",
                }}
              />
            </Tooltip>
          )}
          {item.collection && !zenMode && (
            <Link href={`/collection/${item.collection.slugDisplay || item.collection.slug}`}>
              <Avatar
                sx={{
                  position: "absolute",
                  top: "0.5em",
                  right: "0.5em",
                  border: "2px solid white",
                  width: avatarSizes[layoutSize as keyof typeof avatarSizes],
                  height: avatarSizes[layoutSize as keyof typeof avatarSizes],
                  backgroundColor: "black",
                }}
                children={!item.collection.imageUri && <QuestionMark sx={{ color: "white" }} />}
                src={
                  item.collection.imageUri && item.collection.imageUri.includes("https://img-cdn.magiceden.dev")
                    ? item.collection.imageUri
                    : `https://img-cdn.magiceden.dev/rs:fill:100:100:0:0/plain/${item.collection.imageUri}`
                }
              />
            </Link>
          )}

          {transaction && (
            <Box
              sx={{
                backgroundColor: alpha(theme.palette.background.default, 0.8),
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
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

          {!walletView && !zenMode && (
            <MuiLink component={Link} href={`/wallet/${item.owner}`}>
              <Chip
                label={item.owner?.substring(0, 4)}
                avatar={<Avatar />}
                size="small"
                sx={{
                  position: "absolute",
                  top: "0.5em",
                  left: "0.5em",
                  color: "primary.light",
                  fontWeight: "bold",
                  backgroundColor: alpha(theme.palette.background.default, 0.7),
                }}
              />
            </MuiLink>
          )}
          <Link
            href={`${basePath || "/digital-asset"}/${item.id}`}
            style={{ cursor: easySelect ? "copy" : "pointer" }}
            onClick={(e) => {
              if (easySelect) {
                e.preventDefault()
              }
            }}
          >
            <Box
              sx={{
                aspectRatio: "1 / 1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "black",
                width: "100%",
              }}
            >
              <ImageWithFallback src={item.image!} jsonUri={item.jsonUri} />
            </Box>
          </Link>
          {item.sold && (
            <Box
              position="absolute"
              display="flex"
              alignItems="center"
              justifyContent="center"
              top={0}
              left={0}
              right={0}
              bottom={0}
              sx={{
                backgroundColor: alpha(theme.palette.background.default, 0.8),
              }}
            >
              <Typography textTransform="uppercase" variant="h4">
                SOLD
              </Typography>
            </Box>
          )}
        </Box>
        {Overlay && (
          <Box
            sx={{
              backgroundColor: alpha(theme.palette.background.default, 0.8),
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
              opacity: 0,
            }}
          >
            {Overlay && <Overlay item={item} />}
          </Box>
        )}
        {!zenMode && (
          <CardContent sx={{ position: "relative" }}>
            {item.rarity && (
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
                {item.rarity.howRare ? (
                  <Rarity
                    type="howRare"
                    rank={item.rarity.howRare}
                    tier={getTier(item.rarity.howRare, item.numMints || numMints)}
                  />
                ) : item.rarity.moonRank ? (
                  <Rarity
                    type="moonRank"
                    rank={item.rarity.moonRank}
                    tier={getTier(item.rarity.moonRank, item.numMints || numMints)}
                  />
                ) : item.rarity.tt ? (
                  <Rarity type="tt" rank={item.rarity.tt} tier={getTier(item.rarity.tt, numMints)} />
                ) : (
                  <Box />
                )}
                {item.listing && !zenMode && condensed && (
                  <Tooltip
                    title={
                      <Stack>
                        <Typography variant="body2">
                          Listed for ◎{(item.listing.price / LAMPORTS_PER_SOL).toLocaleString()}
                        </Typography>
                        {edit && <Typography variant="body2">Click to delist</Typography>}
                      </Stack>
                    }
                  >
                    <IconButton
                      sx={{
                        backgroundColor: alpha(theme.palette.background.default, 0.8),
                        borderRadius: "100%",
                        color: "#a6e3e0",
                        width: "34px",
                        height: "34px",
                        cursor: edit ? "pointer" : "default",
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.background.default, 1),
                        },
                      }}
                      onClick={edit ? delistItem : noop}
                      // size="small"
                    >
                      <LocalOffer fontSize="small" color="success" />
                    </IconButton>
                  </Tooltip>
                )}
                {item.status === "SECURED" && !zenMode && (
                  <Tooltip title={"Asset Secured. Click to unsecure."}>
                    <IconButton
                      sx={{
                        backgroundColor: alpha(theme.palette.background.default, 0.8),
                        borderRadius: "100%",
                        padding: 0.5,
                        paddingLeft: 0.75,
                        paddingRight: 0.25,
                        color: "#a6e3e0",
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.background.default, 1),
                        },
                      }}
                    >
                      <SvgIcon>
                        <Vault />
                      </SvgIcon>
                    </IconButton>
                  </Tooltip>
                )}
                {item.status === "FROZEN" && !zenMode && (
                  <Tooltip title={"Frozen"}>
                    <IconButton
                      sx={{
                        backgroundColor: alpha(theme.palette.background.default, 0.8),
                        borderRadius: "100%",
                        color: "#a6e3e0",
                        "&:hover": {
                          backgroundColor: alpha(theme.palette.background.default, 1),
                        },
                      }}
                      size="small"
                    >
                      <SvgIcon>
                        <AcUnit />
                      </SvgIcon>
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            )}
            <Stack spacing={2}>
              <Stack direction="row">
                <Typography
                  textTransform="uppercase"
                  fontWeight="bold"
                  variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}
                  sx={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}
                >
                  {item.name || "Unnamed item"}
                </Typography>
              </Stack>
              {walletView && (
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={margins[layoutSize] / 2}>
                    <Diamond
                      fontSize="small"
                      sx={{ color: "#baf2ef", width: iconSizes[layoutSize as keyof typeof iconSizes] }}
                    />
                    <Typography variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}>
                      {item.estimatedValue && `${lamportsToSol(item.estimatedValue)}`}
                    </Typography>
                    {edit && (
                      <Tooltip title="Customize value">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleEditValueShowing()
                          }}
                        >
                          <Edit sx={{ color: "text.secondary", fontSize: "0.9em" }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography
                      fontWeight="bold"
                      sx={{ color: "gold.main" }}
                      variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}
                    >
                      FP:
                    </Typography>
                    <Typography variant={fontSizes[layoutSize as keyof typeof fontSizes] as any}>
                      {item.floor ? `${lamportsToSol(item.floor)}` : "-"}
                    </Typography>
                  </Stack>
                </Stack>
              )}

              {item.listing && !condensed && (
                <Stack spacing={1} alignItems="center" direction="row" justifyContent="space-between">
                  {["ME"].includes(item.listing.marketplace) && <img src="/me.png" width={30} />}
                  {["TENSOR"].includes(item.listing.marketplace) && (
                    <SvgIcon>
                      <Tensor />
                    </SvgIcon>
                  )}
                  <Stack alignItems="flex-end">
                    <Stack direction="row" alignItems="center">
                      <SvgIcon sx={{ color: "transparent" }}>
                        <Solana />
                      </SvgIcon>
                      <Typography variant="h5" color="primary">
                        {price! < 1
                          ? price?.toLocaleString(undefined, {
                              maximumSignificantDigits: 3,
                            })
                          : price?.toLocaleString()}
                      </Typography>
                      {item.prevPrice && (
                        <Tooltip
                          sx={{
                            ".MuiTooltip": {
                              backgroundColor: "background.default",
                            },
                          }}
                          title={
                            <Stack>
                              <Typography textTransform="uppercase" variant="body2">
                                {item.prevPrice > item.listing.price ? "Price decreased" : "Price increased"}
                              </Typography>
                              <Typography variant="body2">Previous price: {lamportsToSol(item.prevPrice)}</Typography>
                              <Typography variant="body2">Changed {dayjs(item.listing.blocktime).fromNow()}</Typography>
                            </Stack>
                          }
                        >
                          {item.prevPrice > item.listing.price ? (
                            <ArrowDownward color="error" />
                          ) : (
                            <ArrowUpward color="success" />
                          )}
                        </Tooltip>
                      )}
                    </Stack>
                    <Tooltip title={item.lastSale ? dayjs(item.lastSale.txAt).fromNow() : "No previous sales detected"}>
                      <Typography variant="body2" color="text.secondary" fontWeight="bold">
                        Last: {item.lastSale ? lamportsToSol(item.lastSale.price) : "-"}
                      </Typography>
                    </Tooltip>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </CardContent>
        )}
      </Card>
      {edit && (
        <Dialog open={editValueShowing} onClose={toggleEditValueShowing} fullWidth maxWidth="md">
          <Card sx={{ overflowY: "auto" }}>
            <CardContent>
              <EditValue item={item} />
            </CardContent>
          </Card>
        </Dialog>
      )}
    </>
  )
}

function EditValue({ item }: { item: DigitalAsset }) {
  const [editing, setEditing] = useState(false)
  const [editingTopTrait, setEditingTopTrait] = useState(false)
  const [userValuation, setUserValuation] = useState<number | null>((item.userValuation || 0) / LAMPORTS_PER_SOL)
  function toggleEditing() {
    setEditing(!editing)
  }

  function toggleEditingTopTrait() {
    setEditingTopTrait(!editingTopTrait)
  }

  function onInputChange(e) {
    const value = e.target.value
    setUserValuation(value ? Number(value) : null)
  }

  async function saveValuation() {
    await item.setUserValuation(userValuation ? userValuation * LAMPORTS_PER_SOL : undefined)
    item.updateValuationMethod("userValuation")
  }

  async function onTopTraitChange(e) {
    await item.setTopTrait(e.target.value)
    item.updateValuationMethod("topTrait")
  }

  function onValuationMethodChange(e) {
    item.updateValuationMethod(e.target.value)
  }

  const maxVal = Math.max(...item.attributes.map((a) => a.floor || 0))

  const topTrait = item.topTrait
    ? item.attributes.find((att) => att.trait_type === item.topTrait)
    : item.attributes.find((att) => att.floor >= maxVal) || null

  const valuationMethod =
    item.valuationMethod || ((item.attributes || []).find((att) => att.floor) ? "topTrait" : "floor")

  return (
    <Container maxWidth="sm">
      <Stack spacing={4}>
        <Typography variant="h4" color="primary" textTransform="uppercase" textAlign="center">
          Item valuation
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography fontWeight="bold" color="primary" variant="h5">
            Estimated value
          </Typography>
          <Typography color="primary" fontWeight="bold" variant="h5">
            ◎{((item.estimatedValue || 0) / LAMPORTS_PER_SOL).toLocaleString()}
          </Typography>
        </Stack>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography>Value override</Typography>
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" alignItems="center" justifyContent="right">
                  {editing ? (
                    <TextField type="number" value={userValuation} onChange={onInputChange} />
                  ) : (
                    <Typography>
                      {item.userValuation ? (item.userValuation / LAMPORTS_PER_SOL).toLocaleString() : "NONE"}
                    </Typography>
                  )}
                  {!editing ? (
                    <IconButton onClick={() => toggleEditing()} size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                  ) : (
                    <Stack direction="row">
                      <IconButton onClick={() => saveValuation()}>
                        <Check color="success" />
                      </IconButton>
                      <IconButton onClick={() => toggleEditing()}>
                        <Cancel color="error" />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Radio
                  value="userValuation"
                  checked={valuationMethod === "userValuation"}
                  disabled={!item.userValuation}
                  onChange={onValuationMethodChange}
                />
              </TableCell>
            </TableRow>

            {editingTopTrait ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <RadioGroup value={item.topTrait} onChange={onTopTraitChange}>
                    {item.attributes.map((att) => (
                      <FormControlLabel
                        control={<Radio value={att.trait_type} checked={topTrait.trait_type === att.trait_type} />}
                        label={`${att.trait_type}: ${att.value} - ${
                          att.floor ? att.floor / LAMPORTS_PER_SOL : "Unknown"
                        }`}
                        disabled={!att.floor && att.floor !== 0}
                      />
                    ))}
                  </RadioGroup>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell>
                  <Stack>
                    <Typography sx={{ whiteSpace: "nowrap" }}>Top trait</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography color="primary" fontWeight="bold">
                        {topTrait ? `${topTrait?.trait_type}: ${topTrait?.value}` : "None"}
                      </Typography>
                      {!!item.attributes.length && (
                        <IconButton onClick={() => toggleEditingTopTrait()} size="small">
                          <Edit fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Typography>
                    {topTrait ? `◎${((topTrait.floor || 0) / LAMPORTS_PER_SOL).toLocaleString()}` : "Unknown"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Radio
                    value="topTrait"
                    checked={valuationMethod === "topTrait"}
                    disabled={!topTrait}
                    onChange={onValuationMethodChange}
                  />
                </TableCell>
              </TableRow>
            )}

            <TableRow>
              <TableCell>
                <Typography sx={{ whiteSpace: "nowrap" }}>Floor</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography>
                  {item.floor ? `◎${(item.floor / LAMPORTS_PER_SOL).toLocaleString()}` : "Unknown"}
                </Typography>
              </TableCell>
              <TableCell>
                <Radio
                  value="floor"
                  checked={valuationMethod === "floor"}
                  onChange={onValuationMethodChange}
                  disabled={!item.floor && item.floor !== 0}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Stack>
                  <Typography sx={{ whiteSpace: "nowrap" }}>Last sale</Typography>
                  {item.lastSale && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography>{dayjs(item.lastSale?.txAt).fromNow()}</Typography>
                      <Tooltip title={format(new Date(item.lastSale.txAt), "yyyy/MM/dd hh:mm:ss")}>
                        <InfoOutlined sx={{ cursor: "help" }} />
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography>
                  {item.lastSale ? `◎${(item.lastSale.price / LAMPORTS_PER_SOL).toLocaleString()}` : "Unknown"}
                </Typography>
              </TableCell>
              <TableCell>
                <Radio
                  checked={valuationMethod === "lastSale"}
                  value="lastSale"
                  disabled={!item.lastSale}
                  onChange={onValuationMethodChange}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Stack>
    </Container>
  )
}
