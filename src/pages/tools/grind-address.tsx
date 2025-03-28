import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material"
import { Keypair } from "@solana/web3.js"
import { Stack } from "@mui/system"
import dynamic from "next/dynamic"
import Head from "next/head"
import Image from "next/image"
import React, { useEffect, useState } from "react"
import base58 from "bs58"
import toast, { Toaster } from "react-hot-toast"
import Visibility from "@mui/icons-material/Visibility"
import VisibilityOff from "@mui/icons-material/VisibilityOff"
import { Layout } from "../../components/Layout"

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
)

const Grind = ({ keypair, setKeypair, reset }: { keypair: Keypair | null; setKeypair: Function; reset: Function }) => {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [prefix, setPrefix] = useState("")
  const [caseSensitive, setCaseSensitive] = useState(true)
  const [working, setWorking] = useState(false)
  const [threads, setThreads] = useState(24)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false)

  function handleRegenerateDialogClose() {
    setRegenerateDialogOpen(false)
  }

  function confirmRegenerate() {
    setRegenerateDialogOpen(false)
    getKeypair()
  }

  function openConfirmRegenerateModal() {
    setRegenerateDialogOpen(true)
  }

  const nopes = ["l", "I", "O", "0"]

  function getKeypair() {
    try {
      nopes.forEach((nope) => {
        if (prefix.includes(nope)) {
          throw new Error(`Invalid character "${nope}"`)
        }
      })

      setWorking(true)
      reset()

      const workers = Array.from(Array(10).keys()).map(() => {
        const worker = new Worker(new URL("../../../public/generate-keypair.worker.js", import.meta.url))
        worker.addEventListener("message", (event) => {
          setWorking(false)
          setKeypair(new Keypair(event.data.keypair._keypair))
        })

        worker.postMessage({ prefix, caseSensitive })

        return worker
      })

      setWorkers(workers)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function abort() {
    workers.forEach((worker) => {
      worker.terminate()
    })
    setWorking(false)
    setKeypair(null)
    setWorkers([])
  }

  useEffect(() => {
    if (keypair) {
      workers.forEach((worker) => {
        worker.terminate()
      })
    }
  }, [keypair])

  useEffect(() => {
    const nope = nopes.find((nope) => prefix.includes(nope))
    if (nope) {
      setError(`Cannot use character "${nope}"`)
    } else {
      setError(null)
    }

    if (caseSensitive) {
      if (prefix.length >= 5) {
        setWarning("> 4 chars can take a long time")
      } else {
        setWarning(null)
      }
    } else {
      if (prefix.length >= 6) {
        setWarning("> 5 chars can take a long time")
      } else {
        setWarning(null)
      }
    }
  }, [prefix, caseSensitive])

  return (
    <Stack spacing={2}>
      <Typography variant="h5" className="titles">
        Grind vanity address
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
        <TextField
          error={!!error}
          color={(warning && !error && "warning") || "primary"}
          label="Prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          disabled={working}
          helperText={error || warning || "Regex prefix accepted"}
          className="prefix"
        />
        <Box className="case">
          <FormControlLabel
            control={<Switch checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />}
            label=""
            labelPlacement="top"
            disabled={working}
          />
          <Box>
            <Typography sx={{ fontWeight: "bold" }}>Case Sensitive</Typography>
            <Typography sx={{ fontSize: "12px" }} className="case-desc">
              Turn this off to speed up your search.
            </Typography>
          </Box>
        </Box>
      </Stack>
      <Box>
        <Typography variant="h6" className="titles">
          Speed
        </Typography>
        <Typography>
          Grinding for vanity addresses is a resource intensive action. If your device is running out of memory, try
          reducing the speed.
        </Typography>
        <Box padding={2}>
          <Slider
            value={threads}
            sx={{ color: "#3cbccd" }}
            onChange={(e: any) => setThreads(parseInt(e.target.value))}
            valueLabelDisplay="auto"
            disabled={working}
            marks={[
              {
                value: 1,
                label: "Slow",
              },
              {
                value: 12,
                label: "Fast",
              },
              {
                value: 24,
                label: "Speedy",
              },
              {
                value: 36,
                label: "Max",
              },
            ]}
            step={null}
            min={1}
            max={36}
          />
        </Box>
      </Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} className="button-wrap">
        <Button
          variant="contained"
          onClick={keypair ? openConfirmRegenerateModal : getKeypair}
          disabled={working}
          size="large"
          sx={{ fontWeight: "bold" }}
        >
          Generate
        </Button>
        <Button
          onClick={abort}
          color="error"
          variant="outlined"
          disabled={!working}
          size="large"
          sx={{ fontWeight: "bold" }}
        >
          Abort
        </Button>
        {working && <CircularProgress />}
      </Stack>
      <Dialog
        open={regenerateDialogOpen}
        onClose={handleRegenerateDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: "#6ec2cd" }}>
          {"Regenerate address?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Any unsaved changes (including the previous key pair) will be lost if you continue.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRegenerateDialogClose} sx={{ fontWeight: "bold" }}>
            Cancel
          </Button>
          <Button onClick={confirmRegenerate} autoFocus sx={{ fontWeight: "bold" }}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

const Home = () => {
  const [keypair, setKeypair] = useState<Keypair | null>(null)
  const [secretKeyShowing, setSecretKeyShowing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  function reset() {
    setKeypair(null)
    setSecretKeyShowing(false)
  }

  function handleClickShowSecretKey() {
    if (secretKeyShowing) {
      setSecretKeyShowing(false)
    } else {
      setDialogOpen(!dialogOpen)
    }
  }

  function handleMouseDownShowSecretKey() {
    if (secretKeyShowing) {
      setSecretKeyShowing(false)
    } else {
      setDialogOpen(!dialogOpen)
    }
  }

  function showSecretKey() {
    setSecretKeyShowing(true)
    setDialogOpen(false)
  }

  function handleDialogClose() {
    setDialogOpen(false)
  }

  function saveSecretKey() {
    if (!keypair) {
      throw new Error("Nope")
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Array.from(keypair.secretKey)))
    const dlAnchorElem = document.createElement("a")
    dlAnchorElem.setAttribute("href", dataStr)
    dlAnchorElem.setAttribute("download", `${keypair.publicKey.toBase58()}.json`)
    dlAnchorElem.click()
  }

  return (
    <Layout nfts={[]} filtered={[]} title="Grind address" actions={<></>}>
      <Stack padding={4} pl={2}>
        <Grid container spacing={3} alignItems="stretch" direction={{ xs: "column", sm: "row" }}>
          <Grid item xs={5}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom className="titles">
                  Disclaimer
                </Typography>
                <Typography>
                  This tool can be used to generate vanity addresses for use with Solana accounts, such as SPL tokens,
                  NFTs or wallet addresses. It is intended to provide a fun and personalised address for you.
                </Typography>
                <br />
                <Typography>
                  This is a client-side application, meaning the code only runs in your browser. We do not track, store
                  or have access to any of your data or funds, including any keys generated using the application, any
                  personal identification information or asset balances etc.
                </Typography>
                <br />
                <Typography>Note: It is good practice to use a Ledger to keep your digital assets secure.</Typography>
                <br />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={7}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Grind keypair={keypair} setKeypair={setKeypair} reset={reset} />
              </CardContent>
            </Card>
          </Grid>

          {keypair && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom className="titles">
                    Generated address
                  </Typography>
                  <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
                    <TextField
                      disabled
                      fullWidth
                      label="Public Key"
                      value={keypair?.publicKey?.toBase58()}
                      onChange={() => {}}
                    />
                    <FormControl variant="outlined" fullWidth disabled>
                      <InputLabel htmlFor="outlined-adornment-private-key">Private Key</InputLabel>
                      <OutlinedInput
                        id="outlined-adornment-private-key"
                        type="text"
                        value={
                          secretKeyShowing
                            ? base58.encode(keypair.secretKey)
                            : base58.encode(keypair.secretKey).replace(/./g, "•")
                        }
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle private key visibility"
                              onClick={handleClickShowSecretKey}
                              onMouseDown={handleMouseDownShowSecretKey}
                              edge="end"
                            >
                              {secretKeyShowing ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        }
                        label="Private Key"
                      />
                    </FormControl>
                    <Button variant="contained" onClick={saveSecretKey} sx={{ fontWeight: "bold" }}>
                      Save
                    </Button>
                  </Stack>
                  <Typography sx={{ paddingTop: "15px", fontSize: "13px", color: "#c75454" }}>
                    Keep your Private Key safe and do not share it with anyone - without it you will lose access to this
                    address and any digital assets stored within. You will not receive a mnemonic, but you can download
                    a JSON file for your safekeeping.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle id="alert-dialog-title">{"Show secret key?"}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Anyone with access to this secret key will have full access to this address and any digital assets it
              contains. Keep this safe and do not share this key with anyone!
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={showSecretKey} autoFocus>
              Continue
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Layout>
  )
}

export default Home
