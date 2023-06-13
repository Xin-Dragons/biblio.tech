import {
  Alert,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Link,
  Slider,
  Stack,
  SvgIcon,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  darken,
  useMediaQuery,
} from "@mui/material"
import { FC, useEffect, useRef, useState } from "react"
import { Nft } from "../../db"
import axios, { AxiosError } from "axios"
import { flatten, floor, groupBy, map, reduce, uniq } from "lodash"
import { lamportsToSol } from "../../helpers/utils"
import { useTensor } from "../../context/tensor"
import { toast } from "react-hot-toast"
import { useTransactionStatus } from "../../context/transactions"
import { useNfts } from "../../context/nfts"
import { BN } from "bn.js"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { unwrapSome } from "@metaplex-foundation/umi"
import { Sync } from "@mui/icons-material"
import HighlightOffIcon from "@mui/icons-material/HighlightOff"

import Tensor from "./tensor.svg"
import Crown from "./crown.svg"
import Solana from "./solana.svg"
import { useUiSettings } from "../../context/ui-settings"
import { useSelection } from "../../context/selection"
import { useTheme } from "../../context/theme"

type ListingProps = {
  items: Nft[]
  onClose: Function
}

type Pool = {
  price: string
  address: string
  whitelistAddress: string
  type: string
  slug: string
}

type PoolsByCollection = {
  [key: string]: {
    pools: Pool[]
  }
}

type FloorPrice = {
  floorPrice: number
  id: string
  name: string
}

type FloorPricesByCollection = {
  [key: string]: FloorPrice
}

type ListingPrice = {
  nftMint: string
  price: string
}

type MeFloorPrice = {
  symbol: string
  floorPrice: number
  listedCount: number
  volumeAll: number
  collectionId: string
}

type MeFloorPricesByCollection = {
  [key: string]: MeFloorPrice
}

export const Listing: FC<ListingProps> = ({ onClose }) => {
  const { selected, setSelected } = useSelection()
  const { nfts, filtered } = useNfts()
  const { list, sellNow } = useTensor()
  const { transactions } = useTransactionStatus()
  const [loading, setLoading] = useState(false)
  const { payRoyalties: globalPayRoyalties } = useUiSettings()
  const [isActive, setIsActive] = useState(false)
  const [marketplace, setMarketplace] = useState("me")

  const items = selected.map((nftMint) => nfts.find((n) => n.nftMint === nftMint)).filter(Boolean)
  const [pools, setPools] = useState<PoolsByCollection>({})
  const [floorPrices, setFloorPrices] = useState<FloorPricesByCollection>({})
  const [allRoyalties, setAllRoyalties] = useState<any[]>([])
  const [totalSellNow, setTotalSellNow] = useState(new BN(0))
  const [meFloorPrices, setMeFloorPrices] = useState<MeFloorPricesByCollection>({})
  const theme = useTheme()
  const [listingPrice, setListingPrice] = useState<ListingPrice[]>(
    selected.map((nftMint) => {
      return {
        nftMint,
        price: "",
      }
    })
  )

  const [payRoyalties, setPayRoyalties] = useState(globalPayRoyalties)

  useEffect(() => {
    const updates = selected
      .map((nftMint) => {
        const nft = nfts.find((n) => n.nftMint === nftMint)
        const identifier = nft.collectionId || nft.firstVerfiedCreator
        const fp = floorPrices[identifier as keyof object]
        if (!fp) {
          return
        }
        const lp = listingPrice.find((l) => l.nftMint === nftMint)
        if (!lp || !lp.price || Number(lp.price) < fp.floorPrice / LAMPORTS_PER_SOL) {
          return {
            nftMint: nftMint,
            price: (fp.floorPrice / LAMPORTS_PER_SOL).toString(),
          }
        }
        return lp
      })
      .filter(Boolean)

    setListingPrice(updates as ListingPrice[])
  }, [floorPrices])

  async function getFloorPrices() {
    try {
      setLoading(true)
      const [tensor, me] = await Promise.all([
        Promise.resolve().then(async () => {
          const { data } = await axios.post("/api/get-tensor-fp", {
            mints: items.map((item) => {
              return {
                mint: item.nftMint,
                collectionId: item.collectionId || item.firstVerifiedCreator,
              }
            }),
          })

          return data
        }),
        Promise.resolve().then(async () => {
          const { data } = await axios.post("/api/get-me-fp", {
            mints: items.map((item) => {
              return {
                mint: item.nftMint,
                collectionId: item.collectionId || item.firstVerifiedCreator,
              }
            }),
          })
          return data
        }),
      ])

      setPools(tensor.pools)
      setFloorPrices(tensor.floorPrices)
      setMeFloorPrices(me)
    } catch (err: any) {
      if (err instanceof AxiosError) {
        const message = err.response?.data
        if (typeof message === "string") {
          toast.error(err.response?.data)
        }
      } else {
        toast.error(err.message || "Unable to fetch prices")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const updates = items.map((nft) => {
      const identifier = nft.collectionId || nft.firstVerifiedCreator
      const fps = marketplace === "tensor" ? floorPrices : meFloorPrices
      const fp = ((fps[identifier as keyof object] || {}).floorPrice || 0) / LAMPORTS_PER_SOL
      const item = listingPrice.find((l) => l.nftMint === nft.nftMint)

      if (!item || !item.price || Number(item.price) < fp) {
        return {
          nftMint: nft.nftMint,
          price: `${fp}`,
        }
      }

      return item
    })
    setListingPrice(updates)
  }, [selected, floorPrices, meFloorPrices])

  function updateListingPrice(mint: string, price: string) {
    setListingPrice((prevState) => {
      return prevState.map((item) => {
        if (item.nftMint === mint) {
          return {
            ...item,
            price,
          }
        }
        return item
      })
    })
  }

  function updateAllListingPrice(percent?: number) {
    const prices = items.map((item) => {
      const fps = marketplace === "tensor" ? floorPrices : meFloorPrices
      let price = fps[(item.collectionId || item.firstVerifiedCreator) as keyof object].floorPrice
      if (percent) {
        const adjust = new BN(price).div(new BN(100)).mul(new BN(percent))
        price = new BN(price).add(adjust).toNumber()
      }
      return {
        nftMint: item.nftMint,
        price: `${price / LAMPORTS_PER_SOL}`,
      }
    })
    setListingPrice(prices)
  }

  useEffect(() => {
    if (!items.length || isActive || loading) {
      return
    }
    const collections = uniq(items.map((item) => item.collectionId || item.firstVerifiedCreator))
    if (collections.every((collection) => collection in floorPrices)) {
      return
    }
    getFloorPrices()
  }, [selected, isActive])

  async function onListClick(mint: string) {
    try {
      const nft = items.find((n) => n.nftMint === mint) as Nft
      const identifier = nft.collectionId || nft.firstVerifiedCreator
      const floorPrice = floorPrices[identifier as keyof object]?.floorPrice ?? 0
      const item = listingPrice.find((p) => p.nftMint === mint)
      if (!item?.price) {
        throw new Error("List price not set")
      }

      const number = Number(item.price)
      if (!number) {
        throw new Error("Invalid list price")
      }

      if (new BN(number * LAMPORTS_PER_SOL).lt(new BN(floorPrice))) {
        throw new Error("Dont list beneath the floor you bozo.")
      }

      await list(
        [
          {
            mint: item?.nftMint,
            price: item?.price,
          },
        ],
        marketplace
      )
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onListAllClick() {
    try {
      setLoading(true)
      const toList = listingPrice
        .filter((p) => p.price)
        .map((item) => {
          return {
            mint: item.nftMint,
            price: item.price,
          }
        })

      if (!toList.length) {
        toast.error("Please enter list prices")
        return
      }

      await Promise.all(
        toList.map(async (item) => {
          const nft = items.find((n) => n.nftMint === item.mint) as Nft
          const identifier = nft.collectionId || nft.firstVerifiedCreator
          const floorPrice = floorPrices[identifier as keyof object]?.floorPrice ?? 0
          if (!item?.price) {
            throw new Error("List price not set")
          }

          const number = Number(item.price)
          if (!number) {
            throw new Error("Invalid list price")
          }

          if (new BN(number * LAMPORTS_PER_SOL).lt(new BN(floorPrice))) {
            throw new Error("Dont list beneath the floor you bozo.")
          }
        })
      )

      await list(toList, marketplace)
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function onSellNowClick(mint: string) {
    try {
      setLoading(true)
      const item = items.find((item) => item.nftMint === mint) as Nft

      if (!item) {
        throw new Error("Unable to find item")
      }

      const identifier = item.collectionId || item.firstVerifiedCreator

      const pool = pools[identifier as keyof object]?.pools?.[0]
      const id = floorPrices[identifier as keyof object]?.id

      if (!pool || !Number(pool?.price)) {
        throw new Error("Sell pool not found")
      }

      const sellItem = {
        mint: item.nftMint,
        price: pool.price,
        pool: pool.address,
        royalties: payRoyalties,
        type: pool.type,
        slug: pool.slug,
        id,
      }

      await sellNow([sellItem])
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function onSellAllClick() {
    try {
      setLoading(true)
      const grouped = groupBy(items, (item) => item.collectionId || item.firstVerifiedCreator)

      const toSell = flatten(
        map(grouped, (items, collectionId) => {
          const collectionPools = pools[collectionId as keyof object]?.pools || []
          const id = floorPrices[collectionId as keyof object]?.id
          const itemsToSell = items
            .map((item, index) => {
              const pool = collectionPools[index]

              if (!pool || !Number(pool.price)) {
                return null
              }

              return {
                ...pool,
                mint: item.nftMint,
                price: pool.price,
                pool: pool.address,
                royalties: payRoyalties,
                type: pool.type,
                slug: pool.slug,
                id,
              }
            })
            .filter(Boolean)

          return itemsToSell
        })
      )
      await sellNow(toSell)
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const allRoyalties: any[] = []

    const totalSellNow = reduce(
      groupBy(items, (item) => item.collectionId || item.firstVerifiedCreator),
      (sum, items, collection) => {
        const collectionPools = (pools[collection as keyof object] || {}).pools || []
        console.log(collectionPools)

        const total = items.reduce((all, item, index) => {
          const price = new BN((collectionPools[index] || {}).price || 0)

          if (unwrapSome(item.metadata.tokenStandard) === 4 || payRoyalties) {
            const royaltiesRate = new BN(item.metadata.sellerFeeBasisPoints)
            const royalties = price.div(new BN(10000)).mul(royaltiesRate)
            allRoyalties.push(royalties)
            const net = price.sub(royalties)
            const fee = getFee(net)
            return all.add(net.sub(fee))
          }
          const fee = getFee(price)
          return all.add(price.sub(fee))
        }, new BN(0))

        return sum.add(total)
      },
      new BN(0)
    )
    setAllRoyalties(allRoyalties)
    setTotalSellNow(totalSellNow)
  }, [selected, pools])

  const totalListings = items.reduce((sum, item) => {
    const price = Number((listingPrice.find((l) => l.nftMint === item.nftMint) || {}).price || 0)
    return sum.add(new BN(price * LAMPORTS_PER_SOL))
  }, new BN(0))

  const totalRoyalties = allRoyalties.reduce((sum, item) => sum.add(item), new BN(0))

  function getSellNowPrice(item: Nft, price: string, royaltiesEnforced: boolean) {
    const totalPrice = new BN(price)
    if (royaltiesEnforced || payRoyalties) {
      const royalties = getRoyalties(item)
      const withRoyaltiesDeducted = new BN(price).sub(royalties)
      const fee = getFee(withRoyaltiesDeducted)
      return lamportsToSol(withRoyaltiesDeducted.sub(fee))
    }
    const fee = getFee(totalPrice)
    return lamportsToSol(totalPrice.sub(fee))
  }

  function getRoyalties(item: Nft) {
    const identifier = item.collectionId || item.firstVerifiedCreator
    const pool = pools[identifier as keyof object]?.pools?.[0]

    const price = new BN(pool?.price)
    const royaltiesRate = new BN(item.metadata.sellerFeeBasisPoints)
    return price.div(new BN(10000)).mul(royaltiesRate)
  }

  function getFee(price: any) {
    const feeRate = new BN(150)
    return price.div(new BN(10000)).mul(feeRate)
  }

  function removeItem(nftMint: string) {
    setSelected((prevState: string[]) => {
      return prevState.filter((item) => item !== nftMint)
    })
  }

  const timeout = useRef<any>()

  function handleSelectionChange(value: number) {
    clearTimeout(timeout.current)
    setIsActive(true)
    timeout.current = setTimeout(() => {
      setIsActive(false)
    }, 500)
    setSelected(
      filtered
        .filter((item) => !item.status)
        .slice(0, value)
        .map((item) => item.nftMint)
    )
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"))
  const moveMarketplace = useMediaQuery("(max-width:400px)")

  const marketplaceSelector = (
    <ToggleButtonGroup
      value={marketplace}
      exclusive
      onChange={(e, value) => setMarketplace(value)}
      aria-label="text alignment"
    >
      <ToggleButton value="tensor" aria-label="left aligned">
        <SvgIcon>
          <Tensor />
        </SvgIcon>
      </ToggleButton>
      <ToggleButton value="me" aria-label="centered">
        <img src="/me.png" width="30px" />
      </ToggleButton>
    </ToggleButtonGroup>
  )

  const showing = (
    <Typography variant="h6">
      Showing {items.length} item{items.length === 1 ? "" : "s"}
    </Typography>
  )

  return (
    <>
      {marketplace === "tensor" && (
        <Alert severity="info">
          Subject to Tensor API rate limits. If you are hitting limits please try again later
        </Alert>
      )}

      <Table stickyHeader>
        <TableHead>
          <TableRow sx={isXs ? { display: "flex", flexDirection: "column", width: "100%" } : {}}>
            <TableCell colSpan={2} sx={isXs ? { display: "flex", position: "static" } : {}}>
              <Stack width="100%">
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} width="100%">
                  <Slider
                    aria-label="Selection"
                    value={selected.length}
                    onChange={(e, value) => handleSelectionChange(value as number)}
                    max={filtered.length < 20 ? filtered.length : 20}
                  />
                  {isXs && marketplaceSelector}
                </Stack>
                {!isXs && showing}
              </Stack>
            </TableCell>
            <TableCell sx={isXs ? { display: "flex", position: "static" } : {}}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems="center"
                justifyContent="space-between"
                width="100%"
                spacing={1}
              >
                {isXs && showing}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Chip
                    size="small"
                    label="Set all FP"
                    color="primary"
                    variant="outlined"
                    onClick={() => updateAllListingPrice()}
                    disabled={loading}
                    sx={{ fontSize: "10px", textTransform: "uppercase" }}
                  />
                  <Chip
                    size="small"
                    label="10% FP"
                    color="primary"
                    variant="outlined"
                    onClick={() => updateAllListingPrice(10)}
                    disabled={loading}
                    sx={{ fontSize: "10px", textTransform: "uppercase" }}
                  />
                  <Chip
                    size="small"
                    label="20% FP"
                    color="primary"
                    variant="outlined"
                    onClick={() => updateAllListingPrice(20)}
                    disabled={loading}
                    sx={{ fontSize: "10px", textTransform: "uppercase" }}
                  />
                  <Chip
                    size="small"
                    label="30% FP"
                    color="primary"
                    variant="outlined"
                    onClick={() => updateAllListingPrice(30)}
                    disabled={loading}
                    sx={{ fontSize: "10px", textTransform: "uppercase" }}
                  />
                </Stack>
              </Stack>
            </TableCell>
            {!isXs && (
              <TableCell
                sx={isXs ? { textAlign: "right", display: "flex", position: "static" } : { textAlign: "right" }}
              >
                {marketplaceSelector}
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
          {items.map((item: Nft) => {
            const isDisabled = loading || transactions.map((t) => t.nftMint).includes(item.nftMint) || !!item.status
            const identifier = item.collectionId || item.firstVerifiedCreator
            const price = floorPrices[identifier as keyof object] || {}
            const mePrice = meFloorPrices[identifier as keyof object] || {}
            const { name, floorPrice: tensorFloorPrice } = price
            const { floorPrice: meFloorPrice } = mePrice
            const floorPrice = marketplace === "tensor" ? tensorFloorPrice : meFloorPrice
            const royaltiesEnforced = unwrapSome(item.metadata.tokenStandard) === 4
            const poolsForCollection = pools[identifier as keyof object] || {}
            const pool = (poolsForCollection.pools || [])[0]
            const royalties = getRoyalties(item)
            const listingPriceItem = (listingPrice.find((price) => price.nftMint === item.nftMint) || {}).price || ""
            const sellNowPrice = getSellNowPrice(item, pool?.price, royaltiesEnforced)

            return (
              <TableRow key={item.nftMint}>
                <TableCell colSpan={marketplace === "me" ? 2 : 1} sx={isXs ? { display: "flex", border: 0 } : {}}>
                  <Stack direction="row" justifyContent="space-between" width="100%" alignItems="flex-start">
                    <Stack direction="row" spacing={2} alignItems="center">
                      <img
                        src={`https://img-cdn.magiceden.dev/rs:fill:100:100:0:0/plain/${item?.json?.image}`}
                        width={50}
                      />
                      <Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography color="primary" fontWeight="bold">
                            {name}
                          </Typography>
                          {royaltiesEnforced && (
                            <Tooltip title="Enforced royalties">
                              <SvgIcon
                                // @ts-ignore
                                color="gold"
                                fontSize="small"
                              >
                                <Crown />
                              </SvgIcon>
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography variant="body2">{item.json?.name || item.metadata.name}</Typography>
                      </Stack>
                    </Stack>
                    {isXs && (
                      <IconButton color="error" onClick={() => removeItem(item.nftMint)}>
                        <HighlightOffIcon />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
                {marketplace === "tensor" && (
                  <TableCell sx={isXs ? { display: "flex", borderBottom: 0 } : {}}>
                    <Stack spacing={0.5} width="100%">
                      <Button
                        sx={{ whiteSpace: "nowrap", height: "40px" }}
                        variant="outlined"
                        disabled={isDisabled || !Number(pool?.price)}
                        onClick={() => onSellNowClick(item.nftMint)}
                        fullWidth
                      >
                        <Stack direction="row" spacing={0.5}>
                          <Typography>Sell now</Typography>
                          <SvgIcon>
                            <Tensor />
                          </SvgIcon>
                        </Stack>
                      </Button>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {pool ? (
                            <>
                              <Typography fontWeight="bold" variant="body2" fontSize="1em">
                                {sellNowPrice}
                              </Typography>
                              <SvgIcon fontSize="inherit">
                                <Solana />
                              </SvgIcon>
                            </>
                          ) : (
                            <Typography fontWeight="bold" variant="body2" fontSize="1em">
                              No pool
                            </Typography>
                          )}
                        </Stack>

                        <FormHelperText>
                          <Tooltip title="Royalties paid to project">
                            <Stack
                              direction="row"
                              alignItems="center"
                              sx={{
                                background: darken(theme.palette.background.default, 0.1),
                                padding: "2px 5px 2px 0px",
                                borderRadius: "10px",
                              }}
                            >
                              <SvgIcon
                                // @ts-ignore
                                color="gold"
                                fontSize="small"
                                sx={{ height: "10px" }}
                              >
                                <Crown fontSize="small" />
                              </SvgIcon>
                              <Stack spacing={0.5} direction="row">
                                <span style={{ lineHeight: "1em" }}>
                                  {royaltiesEnforced || payRoyalties ? lamportsToSol(royalties) : 0}
                                </span>
                                <SvgIcon fontSize="inherit">
                                  <Solana />
                                </SvgIcon>
                              </Stack>
                            </Stack>
                          </Tooltip>
                        </FormHelperText>
                      </Stack>
                    </Stack>
                  </TableCell>
                )}
                <TableCell colSpan={2} sx={isXs ? { display: "flex" } : {}}>
                  <Stack spacing={0.5} width="100%">
                    <Stack direction="row" spacing={1} justifyContent="space-between">
                      <TextField
                        label="List for"
                        size="small"
                        onChange={(e) => updateListingPrice(item.nftMint, e.target.value)}
                        value={listingPriceItem}
                        disabled={isDisabled}
                        fullWidth
                      />
                      <Button
                        variant="outlined"
                        onClick={() => onListClick(item.nftMint)}
                        disabled={isDisabled}
                        fullWidth
                      >
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography>List</Typography>
                          {marketplace === "tensor" && (
                            <SvgIcon>
                              <Tensor />
                            </SvgIcon>
                          )}
                          {marketplace === "me" && <img src="/me.png" height="18px" />}
                        </Stack>
                      </Button>
                      {!isXs && (
                        <IconButton color="error" onClick={() => removeItem(item.nftMint)}>
                          <HighlightOffIcon />
                        </IconButton>
                      )}
                    </Stack>
                    {lamportsToSol(floorPrice) === listingPriceItem ? (
                      <FormHelperText>Floor price: {lamportsToSol(floorPrice)} SOL</FormHelperText>
                    ) : (
                      <Tooltip title="Set to floor price">
                        <Link
                          onClick={(e) => updateListingPrice(item.nftMint, `${Number(floorPrice) / LAMPORTS_PER_SOL}`)}
                          component="button"
                          sx={{ textAlign: "left" }}
                          href="#"
                          disabled={loading || isDisabled || lamportsToSol(floorPrice) === listingPriceItem}
                        >
                          <FormHelperText>Floor price: {lamportsToSol(floorPrice)} SOL</FormHelperText>
                        </Link>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter
          sx={
            isXs
              ? {
                  display: "flex",
                  flexDirection: "column",
                  position: "sticky",
                  bottom: 0,
                  backgroundColor: "background.default",
                  zIndex: 10,
                }
              : { position: "sticky", bottom: 0, backgroundColor: "background.default", zIndex: 10 }
          }
        >
          <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
            {!isXs && (
              <TableCell colSpan={marketplace === "me" ? 2 : 1} sx={isXs ? { display: "flex" } : {}}>
                <Button
                  color="error"
                  disabled={Boolean(transactions.length)}
                  onClick={() => onClose()}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </TableCell>
            )}
            {marketplace === "tensor" && (
              <TableCell sx={isXs ? { display: "flex" } : {}}>
                <Stack spacing={1} width="100%">
                  <Button
                    variant="contained"
                    onClick={onSellAllClick}
                    disabled={loading || Boolean(transactions.length) || !Boolean(Number(totalSellNow))}
                  >
                    <Stack direction="row" spacing={0.5}>
                      <Typography>Sell all</Typography>
                      <SvgIcon>
                        <Tensor />
                      </SvgIcon>
                    </Stack>
                  </Button>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography fontWeight="bold" variant="body2" fontSize="1em">
                        {lamportsToSol(totalSellNow)}
                      </Typography>
                      <SvgIcon fontSize="inherit">
                        <Solana />
                      </SvgIcon>
                    </Stack>

                    <FormHelperText>
                      <Tooltip title="Royalties paid to project">
                        <Stack
                          direction="row"
                          alignItems="center"
                          sx={{
                            background: darken(theme.palette.background.default, 0.1),
                            padding: "2px 5px 2px 0px",
                            borderRadius: "10px",
                          }}
                        >
                          <SvgIcon
                            // @ts-ignore
                            color="gold"
                            fontSize="small"
                            sx={{ height: "10px" }}
                          >
                            <Crown fontSize="small" />
                          </SvgIcon>
                          <Stack spacing={0.5} direction="row">
                            <span style={{ lineHeight: "1em" }}>{lamportsToSol(totalRoyalties)}</span>
                            <SvgIcon fontSize="inherit">
                              <Solana />
                            </SvgIcon>
                          </Stack>
                        </Stack>
                      </Tooltip>
                    </FormHelperText>
                  </Stack>
                </Stack>
              </TableCell>
            )}
            <TableCell sx={isXs ? { display: "flex", textAlign: "right" } : { textAlign: "right" }} colSpan={2}>
              <Stack direction="row" spacing={2} alignItems="flex" width="100%">
                <TextField
                  label="Total"
                  value={lamportsToSol(totalListings)}
                  disabled
                  size="small"
                  sx={{
                    ".Mui-disabled": {
                      color: "white !important",
                      WebkitTextFillColor: "white",
                    },
                  }}
                  fullWidth
                />

                <Button
                  variant="contained"
                  onClick={onListAllClick}
                  disabled={loading || Boolean(transactions.length) || !totalListings}
                  fullWidth
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography sx={{ whiteSpace: "nowrap" }}>List all</Typography>
                    {marketplace === "tensor" && (
                      <SvgIcon>
                        <Tensor />
                      </SvgIcon>
                    )}
                    {marketplace === "me" && <img src="/me.png" height="18px" />}
                  </Stack>
                </Button>
              </Stack>
            </TableCell>
          </TableRow>
          <TableRow sx={isXs ? { display: "flex" } : {}}>
            <TableCell colSpan={4} sx={isXs ? { display: "flex", width: "100%" } : {}}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" width="100%">
                  <Stack width="100%">
                    <FormControlLabel
                      control={<Switch checked={payRoyalties} onChange={(e) => setPayRoyalties(e.target.checked)} />}
                      label={
                        <Stack>
                          <Typography>Pay full royalties</Typography>
                          <FormHelperText sx={{ lineHeight: "1em" }}>
                            Pay full royalties on non-enforced collections when using instant-sell
                          </FormHelperText>
                        </Stack>
                      }
                    />
                  </Stack>
                  <Box>
                    {loading ? (
                      <CircularProgress />
                    ) : (
                      <Tooltip title="Refetch latest prices">
                        <IconButton onClick={getFloorPrices}>
                          <Sync />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Stack>
                <Button
                  color="error"
                  disabled={Boolean(transactions.length)}
                  onClick={() => onClose()}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </Stack>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </>
  )
}
