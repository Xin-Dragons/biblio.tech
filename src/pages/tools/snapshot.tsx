import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  LinearProgress,
  Radio,
  RadioGroup,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material"
import { Transaction, PublicKey } from "@solana/web3.js"
import { Stack } from "@mui/system"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import Head from "next/head"
import Image from "next/image"
import React, { useEffect, useMemo, useRef, useState } from "react"
import toast, { Toaster } from "react-hot-toast"
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded"
import RemoveCircleRoundedIcon from "@mui/icons-material/RemoveCircleRounded"
import { compact, omit } from "lodash"
import axios from "axios"
import { HashlistProvider, useHashlist } from "../../context/hashlist"
import { takeSnapshot } from "../../helpers/snapshot"
import { Layout } from "../../components/Layout"
import { getMintlist } from "../../helpers/helius"

const MARKETPLACES = ["4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue", "1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix"]

const Token = ({ cardStyles, cardContentStyles }: { cardStyles: any; cardContentStyles: any }) => {
  const [publicKey, setPublicKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [publicKeyError, setPublicKeyError] = useState(null)

  useEffect(() => {
    if (!publicKey) {
      setPublicKeyError(null)
      return
    }
    try {
      const valid = PublicKey.isOnCurve(publicKey)
      if (!valid) {
        throw new Error("Invalid public key")
      }
    } catch (err: any) {
      setPublicKeyError(err.message)
    }
  }, [publicKey])

  async function takeSnap() {
    try {
      setLoading(true)

      const params = {
        jsonrpc: "2.0",
        id: 1,
        method: "getProgramAccounts",
        params: [
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          {
            encoding: "jsonParsed",
            filters: [
              {
                dataSize: 165,
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: publicKey,
                },
              },
            ],
          },
        ],
      }

      const headers = {
        "Content-Type": "application/json",
      }

      const result = await axios.post(process.env.NEXT_PUBLIC_RPC_HOST!, params, { headers })
      const mapped = result.data.result
        .map((item: any) => {
          return {
            address: item.account.data.parsed.info.owner,
            amount: item.account.data.parsed.info.tokenAmount.uiAmount,
          }
        })
        .filter((item: any) => item.amount)
        .sort((a: any, b: any) => b.amount - a.amount)

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapped, null, 2))
      const download = document.createElement("a")
      download.setAttribute("href", dataStr)
      download.setAttribute("download", `token_holders_${publicKey}_${Date.now()}.json`)
      download.click()
    } catch (err: any) {
      toast.error(err.message || "Error taking snap")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Card sx={cardStyles} className="box">
          <CardContent sx={cardContentStyles}>
            <Stack spacing={2}>
              <Stack spacing={2} direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h4">SPL token holders</Typography>
                {loading && <CircularProgress />}
              </Stack>
              <Stack spacing={2} direction="row">
                <TextField
                  label="Token mint"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  error={!!publicKeyError}
                  helperText={publicKeyError}
                  fullWidth
                />
                <Button
                  variant="contained"
                  sx={{ backgroundColor: "#154E55", color: "white", whiteSpace: "nowrap" }}
                  disabled={loading || !publicKey || !!publicKeyError}
                  onClick={takeSnap}
                >
                  Take snap
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

const Controls = ({ loading, address }: { loading: boolean; address: string }) => {
  const [snapping, setSnapping] = useState(false)
  const { parsed, clearHash } = useHashlist()
  const [progress, setProgress] = useState(0)
  const [omitMarketplaces, setOmitMarketplaces] = useState(true)
  const wallet = useWallet()
  const timer = useRef<any>()
  const [downloadType, setDownloadType] = useState("json")

  let milliseconds = 0

  function startTimer() {
    const startTime = Date.now()
    timer.current = setInterval(() => {
      const diff = Date.now() - startTime
      milliseconds = diff
    }, 10)
  }

  function stopTimer() {
    clearInterval(timer.current)
    setProgress(0)
    setTimeout(() => (milliseconds = 0), 1000)
  }

  function updateProgress(newProgress: number) {
    setProgress(newProgress)
  }

  async function doSnap() {
    let holders = await takeSnapshot(parsed, 30, updateProgress)
    if (omitMarketplaces) {
      holders = omit(holders, MARKETPLACES)
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(holders, null, 2))
    const download = document.createElement("a")
    download.setAttribute("href", dataStr)
    download.setAttribute("download", `snapshot_${address}_${Date.now()}.json`)
    download.click()
  }

  async function takeSnap() {
    try {
      if (!wallet.connected) {
        throw new Error("Wallet disconnected")
      }
      setSnapping(true)
      startTimer()
      const snapPromise = doSnap()

      toast.promise(snapPromise, {
        loading: "Turbo snapping",
        success: "Done!",
        error: "Error snapping - please try again",
      })

      await snapPromise
      stopTimer()
      toast.success(`Snapped ${parsed.length} nfts in ${milliseconds / 1000}s`)
    } catch (err) {
      console.error(err)
      toast.error("Error taking snap")
    } finally {
      setSnapping(false)
    }
  }

  async function downloadHashlist() {
    if (downloadType === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(parsed, null, 2))
      const download = document.createElement("a")
      download.setAttribute("href", dataStr)
      download.setAttribute("download", `hashlist_${address}_${Date.now()}.json`)
      download.click()
    } else {
      var csv = parsed.join("\r\n")
      var exportedFilename = `hashlist_${address}_${Date.now()}.csv`

      var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      if (link.download !== undefined) {
        // feature detection
        // Browsers that support HTML5 download attribute
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", exportedFilename)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }
  }

  const hasResults = parsed && compact(parsed).length

  return (
    <Stack>
      {snapping && <LinearProgress variant="determinate" value={progress} />}
      <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
        <Stack spacing={1}>
          <FormControl>
            <FormLabel>Download type (hashlist)</FormLabel>
            <RadioGroup value={downloadType} onChange={(e) => setDownloadType(e.target.value)} row>
              <FormControlLabel value="json" control={<Radio />} label="JSON" />
              <FormControlLabel value="csv" control={<Radio />} label="CSV" />
            </RadioGroup>
          </FormControl>
          <Button variant="outlined" onClick={downloadHashlist} disabled={!hasResults || snapping || loading}>
            {snapping ? <CircularProgress /> : "Save hashlist"}
          </Button>
        </Stack>
        <Stack spacing={1}>
          <FormControlLabel
            control={<Switch checked={omitMarketplaces} onChange={(e) => setOmitMarketplaces(e.target.checked)} />}
            label="Omit marketplaces"
          />
          <Button
            variant="contained"
            sx={{ backgroundColor: "#154E55", color: "white" }}
            onClick={takeSnap}
            disabled={!hasResults || snapping || loading}
          >
            {snapping ? <CircularProgress /> : "Take Snap"}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  )
}

const Home = () => {
  const [loading, setLoading] = useState(false)
  const { hashlist, setHashlist, hashlistError } = useHashlist()
  const cardContentStyles = useMemo(() => ({ overflowX: "visible", height: "100%" }), [])
  const cardStyles = useMemo(() => ({ height: "100%", overflow: "visible", maxHeight: "100%" }), [])

  const [tab, setTab] = useState("nfts")
  const [filters, setFilters] = useState([
    {
      trait_type: "",
      value: "",
    },
  ])
  const [addresses, setAddresses] = useState([""])
  const [type, setType] = useState("collections")

  function onInputChange(e: any) {
    const value = e.target.value
    setHashlist(value)
  }

  function addAddress() {
    setAddresses((prevState) => {
      return [...prevState, ""]
    })
  }

  const updateAddress = (i: number) => (e: any) => {
    setAddresses((prevState) => {
      return prevState.map((item, index) => {
        if (index === i) {
          return e.target.value
        }
        return item
      })
    })
  }

  const removeAddress = (i: number) => () => {
    setAddresses((prevState) => {
      return prevState.filter((item, index) => i !== index)
    })
  }

  function addFilter() {
    setFilters((prevState) => {
      return [
        ...prevState,
        {
          trait_type: "",
          value: "",
        },
      ]
    })
  }

  const removeFilter = (i: number) => () => {
    setFilters((prevState) => prevState.filter((f, index) => index !== i))
  }

  const updateFilter = (i: number, type: any) => (e: any) => {
    setFilters((prevState) =>
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

  async function getHashlist() {
    try {
      setLoading(true)

      const activeFilters = filters.filter((item) => {
        return item.trait_type && item.value
      })

      const data = {
        [type]: compact(addresses).map((item) => item.trim()),
        filters: activeFilters,
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
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isDirty = compact(addresses).length

  function clear() {
    setAddresses([""])
    setFilters([
      {
        trait_type: "",
        value: "",
      },
    ])
  }

  return (
    <Layout
      nfts={[]}
      filtered={[]}
      actions={
        <Tabs value={tab} onChange={(e, tab) => setTab(tab)}>
          <Tab value="nfts" label="NFTs" />
          <Tab value="token" label="SPL Token" />
        </Tabs>
      }
    >
      <Stack spacing={2} padding={4} pl={2} height="100%">
        {tab === "nfts" && (
          <Grid container spacing={4} height="100%">
            <Grid item xs={12} sm={4}>
              <Card sx={cardStyles} className="box">
                <CardContent sx={cardContentStyles}>
                  <Stack spacing={2} justifyContent="space-between" sx={{ height: "100%", maxHeight: "100%" }}>
                    <Stack spacing={2}>
                      <Typography variant="h4" sx={{ flexShrink: 0 }}>
                        Get hashlist
                      </Typography>
                      <Box>
                        <Stack spacing={2}>
                          <RadioGroup row value={type} onChange={(e) => setType(e.target.value)}>
                            <FormControlLabel
                              value="collections"
                              control={<Radio disabled={loading} />}
                              label="Certified collection"
                            />
                            <FormControlLabel
                              value="creators"
                              control={<Radio disabled={loading} />}
                              label="First verified creator"
                            />
                          </RadioGroup>
                          <Stack spacing={1}>
                            {addresses.map((c, i) => {
                              return (
                                <Stack key={i} direction="row" alignItems="center" spacing={1}>
                                  <TextField
                                    value={c}
                                    onChange={updateAddress(i)}
                                    label={
                                      type === "collections"
                                        ? `Certified collection${addresses.length > 1 ? ` #${i + 1}` : ""}`
                                        : `First verified creator${addresses.length > 1 ? ` #${i + 1}` : ""}`
                                    }
                                    fullWidth
                                    inputProps={{
                                      spellCheck: false,
                                    }}
                                    size="small"
                                  />
                                  {i === 0 ? (
                                    <IconButton color="primary" onClick={addAddress}>
                                      <AddCircleRoundedIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton color="error" onClick={removeAddress(i)}>
                                      <RemoveCircleRoundedIcon />
                                    </IconButton>
                                  )}
                                </Stack>
                              )
                            })}
                          </Stack>

                          <Typography variant="h6">Filters</Typography>
                          <Stack spacing={1}>
                            {filters.map((filter, index) => {
                              return (
                                <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
                                  <TextField
                                    label="Trait type"
                                    size="small"
                                    value={filter.trait_type}
                                    onChange={updateFilter(index, "trait_type")}
                                  />
                                  <TextField
                                    label="Value"
                                    size="small"
                                    value={filter.value}
                                    onChange={updateFilter(index, "value")}
                                  />
                                  {index === 0 ? (
                                    <IconButton color="primary" onClick={addFilter}>
                                      <AddCircleRoundedIcon />
                                    </IconButton>
                                  ) : (
                                    <IconButton color="error" onClick={removeFilter(index)}>
                                      <RemoveCircleRoundedIcon />
                                    </IconButton>
                                  )}
                                </Stack>
                              )
                            })}
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                      <Button variant="outlined" color="warning" disabled={!isDirty || loading} onClick={clear}>
                        Clear
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={!isDirty || loading}
                        onClick={getHashlist}
                        sx={{ flexGrow: 1 }}
                      >
                        Get hashlist
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={8} minHeight="100%">
              <Card sx={cardStyles} className="box">
                <CardContent sx={cardContentStyles}>
                  <Stack spacing={2}>
                    <Typography variant="h4">Take snapshot</Typography>
                    <TextField
                      multiline
                      fullWidth
                      error={!!hashlistError}
                      label="Hashlist"
                      value={hashlist}
                      onChange={onInputChange}
                      rows={15}
                      InputProps={{
                        sx: {
                          fontFamily: "monospace !important",
                          whiteSpace: "prewrap",
                        },
                        spellCheck: false,
                      }}
                      helperText={hashlistError}
                    />
                    <Controls loading={loading} address={addresses[0]} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === "token" && <Token cardStyles={cardStyles} cardContentStyles={cardContentStyles} />}
      </Stack>
    </Layout>
  )
}

const Wrapped = () => {
  return (
    <HashlistProvider>
      <Home />
    </HashlistProvider>
  )
}

export default Wrapped
