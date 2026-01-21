import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  Link,
  TextField,
  Switch,
  FormControlLabel,
  TableFooter,
  Grid,
  Alert,
  darken,
  FormHelperText,
  SvgIcon,
  useMediaQuery,
  Theme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import { FC, useEffect, useRef, useState } from "react"

import { useMetaplex } from "../../context/metaplex"
import { PublicKey, Transaction } from "@solana/web3.js"
import { toast } from "react-hot-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import axios, { AxiosError } from "axios"
import base58 from "bs58"
import { useDatabase } from "../../context/database"
import { User } from "../../types/nextauth"
import { useWallets } from "../../context/wallets"
import { sortBy, update, upperFirst } from "lodash"
import { AddCircle, Close, Delete, Edit, ExpandMore, MonetizationOn, TramSharp, Update } from "@mui/icons-material"
import { type Wallet } from "../../db"
import { default as NextLink } from "next/link"
import { WalletMultiButtonDynamic } from "../ActionBar"
import { shorten, sleep, waitForWalletChange } from "../../helpers/utils"
import { useAccess } from "../../context/access"
import { useUmi } from "../../context/umi"
import { addMemo } from "@metaplex-foundation/mpl-toolbox"
import { SigninMessage } from "../../utils/SigninMessge"
import { useTheme } from "../../context/theme"
import { useUiSettings } from "../../context/ui-settings"
import { useAccount, useConnect, useDisconnect, useEnsAvatar, useEnsName, useNetwork, useSignMessage } from "wagmi"
import Crown from "../Listing/crown.svg"
import { recoverMessageAddress } from "viem"
import { SiweMessage } from "siwe"
import { CURRENCIES, Currency } from "../../context/brice"
import { useWalletBypass } from "../../context/wallet-bypass"
import { NextRequest } from "next/server"
import { useRouter } from "next/router"

type ProfileProps = {
  user: User
  publicKey: string
  onClose: Function
}

const ConnectSol: FC<{ onClose: Function }> = ({ onClose }) => {
  const [loading, setLoading] = useState(false)
  const [isLedger, setIsLedger] = useState(false)
  const [publicKey, setPublicKey] = useState<string>("")
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)
  const wallet = useWallet()
  const { user, nonce, refresh } = useAccess()
  const umi = useUmi()
  const { setBypassWallet } = useWalletBypass()

  async function addWallet() {
    try {
      setLoading(true)

      async function linkWallet() {
        if (isLedger) {
          try {
            const txn = await addMemo(umi, {
              memo: "Add wallet to Biblio",
            }).buildWithLatestBlockhash(umi)

            const signed = await umi.identity.signTransaction(txn)

            const result = await axios.post("/api/add-wallet", {
              publicKey,
              rawTransaction: base58.encode(umi.transactions.serialize(signed)),
              basePublicKey: user.publicKey,
              isLedger,
            })
          } catch (err: any) {
            console.error(err)

            if (err.message.includes("Something went wrong")) {
              throw new Error(
                "Looks like the Solana app on your Ledger is out of date. Please update using the Ledger Live application and try again."
              )
            }

            if (err.message.includes("Cannot destructure property 'signature' of 'r' as it is undefined")) {
              throw new Error(
                'Unable to connect to Ledger, please make sure the device is unlocked with the Solana app open, and "Blind Signing" enabled'
              )
            }

            throw err
          }
        } else {
          if (!wallet.publicKey || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey,
            statement: `Sign this message to connect wallet to Biblio.\n\n`,
            nonce,
          })

          const data = new TextEncoder().encode(message.prepare())
          const signature = await wallet.signMessage(data)
          const serializedSignature = base58.encode(signature)

          const result = await axios.post("/api/add-wallet", {
            message: JSON.stringify(message),
            signature: serializedSignature,
            // @ts-ignore
            publicKey: window.solana?.publicKey?.toBase58(),
            id: user.id,
          })
        }
      }

      const linkWalletPromise = linkWallet()

      toast.promise(linkWalletPromise, {
        loading: "Linking wallet",
        success: "Wallet linked",
        error: "Error linking wallet",
      })

      await linkWalletPromise
      await refresh()
    } catch (err: any) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data || "Error linking wallet")
        return
      }
      console.log(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!publicKey) {
      setPublicKeyError(null)
      return
    }
    try {
      const pk = new PublicKey(publicKey)
      setPublicKeyError(null)
    } catch {
      setPublicKeyError("Invalid Public Key")
    }
  }, [publicKey])

  async function connectWallet() {
    try {
      setLoading(true)
      setBypassWallet(true)
      const walletChangePromise = waitForWalletChange(publicKey)

      toast.promise(walletChangePromise, {
        loading: `Switch connected wallet to ${shorten(publicKey)}`,
        success: "Done!",
        error: "Error switching wallet",
      })

      await walletChangePromise

      if (!wallet.connected) {
        await wallet.connect()
      }

      await addWallet()
    } catch (err: any) {
      toast.error(err.message || "Error connecting wallet")
    } finally {
      setLoading(false)
      setBypassWallet(false)
      onClose()
    }
  }

  return (
    <Stack spacing={2}>
      <Typography>
        To connect an additional Solana wallet, enter a Public Key below, then click &quot;Continue&quot;. You will then
        need to switch to this wallet using your wallet extension, and sign a message to link the wallet.
      </Typography>

      <FormControlLabel
        control={<Switch checked={isLedger} onChange={(e) => setIsLedger(e.target.checked)} />}
        label="Is the wallet you are connecting a ledger?"
      />

      <TextField
        label="Public Key"
        error={!!publicKeyError}
        value={publicKey}
        onChange={(e) => setPublicKey(e.target.value)}
        helperText={publicKeyError}
      />
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Button variant="outlined" onClick={() => onClose()} color="error">
          Close
        </Button>
        <Button disabled={!publicKey || !!publicKeyError || loading} variant="contained" onClick={connectWallet}>
          Continue
        </Button>
      </Stack>
    </Stack>
  )
}

const ConnectEth: FC<{ onClose: Function }> = ({ onClose }) => {
  const { chain } = useNetwork()
  const { signMessageAsync } = useSignMessage()
  const { user, nonce } = useAccess()

  const { address, connector, isConnected } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: "jxom.eth" })
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { disconnect } = useDisconnect()

  async function linkWallet() {
    try {
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Link Ethereum wallet to Biblio.",
        uri: window.location.origin,
        version: "1",
        chainId: chain?.id,
        nonce,
      })

      const addingPromise = Promise.resolve().then(async () => {
        const signature = await signMessageAsync({
          message: message.prepareMessage(),
        })

        const { data } = await axios.post("/api/connect-eth-wallet", {
          message,
          signature,
          basePublicKey: user.publicKey,
        })

        if (!data.ok) {
          throw new Error()
        }
      })

      toast.promise(addingPromise, {
        loading: "Linking wallet",
        success: "Wallet linked successfully",
        error: "Error linking wallet",
      })

      await addingPromise

      onClose()
    } catch (err: any) {
      toast.error(err.response?.data || err.message || "Error adding wallet")
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(error.message)
    }
  }, [error])

  if (isConnected) {
    return (
      <Stack spacing={2}>
        {ensAvatar && <img src={ensAvatar} alt="ENS Avatar" />}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography>{ensName ? `${ensName} (${address})` : address}</Typography>
          <Button onClick={() => disconnect()}>Disconnect</Button>
        </Stack>
        <Alert severity="info">Connected to {connector?.name}</Alert>
        <Stack direction="row" justifyContent="space-between">
          <Button onClick={() => onClose()} variant="outlined" color="error">
            Close
          </Button>

          <Button onClick={linkWallet} variant="contained">
            Link wallet
          </Button>
        </Stack>
      </Stack>
    )
  }
  return (
    <Stack spacing={2}>
      {connectors.map((connector) => (
        <Button
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
          variant="contained"
          fullWidth
        >
          {connector.name}
          {!connector.ready && " (not detected)"}
          {isLoading && connector.id === pendingConnector?.id && " (connecting)"}
        </Button>
      ))}
      <Stack direction="row">
        <Button onClick={() => onClose()} variant="outlined" color="error">
          Close
        </Button>
      </Stack>
    </Stack>
  )
}

export const Profile: FC<ProfileProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string | null>("wallets")
  const { user, userWallets } = useAccess()
  const { bypassWallet } = useWalletBypass()
  const wallet = useWallet()

  function onTabChange(e: any, tab: string) {
    setActiveTab(tab)
  }

  useEffect(() => {
    if (bypassWallet) {
      return
    }
    if (!wallet.publicKey || !user || !userWallets.includes(wallet.publicKey?.toBase58())) {
      onClose()
      return
    }
  }, [wallet.publicKey, bypassWallet])

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  if (!wallet.publicKey) {
    return null
  }

  const onAccordionChange = (panel: string) => (e: any, isExpanded: boolean) => setActiveTab(isExpanded ? panel : null)

  return (
    <Card sx={{ overflowY: "auto", minHeight: "80vh" }}>
      <CardContent>
        <IconButton
          size="large"
          sx={{ position: "fixed", top: "0.25em", right: "0.25em", zIndex: 10000 }}
          onClick={() => onClose()}
        >
          <Close fontSize="large" />
        </IconButton>
        <Stack spacing={2} alignItems="center">
          <Stack mt={5}>
            <Typography variant="h4" fontFamily="Lato" fontWeight="bold" textAlign="center">
              Profile settings
            </Typography>
            <Typography variant="h6" color="primary" textAlign="center">
              Connected with {shorten(wallet.publicKey?.toBase58())}
            </Typography>
          </Stack>
          {isXs ? (
            <Stack width="100%">
              <Accordion expanded={activeTab === "wallets"} onChange={onAccordionChange("wallets")}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" color="primary">
                    Linked Wallets
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <LinkedWallets />
                </AccordionDetails>
              </Accordion>
              <Accordion expanded={activeTab === "address-book"} onChange={onAccordionChange("address-book")}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" color="primary">
                    Address Book
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <AddressBook />
                </AccordionDetails>
              </Accordion>
              <Accordion expanded={activeTab === "data"} onChange={onAccordionChange("data")}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" color="primary">
                    Data
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Data onClose={onClose} />
                </AccordionDetails>
              </Accordion>
              <Accordion expanded={activeTab === "settings"} onChange={onAccordionChange("settings")}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="h6" color="primary">
                    Settings
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Settings />
                </AccordionDetails>
              </Accordion>
            </Stack>
          ) : (
            <CardContent>
              <Stack justifyContent="center" alignItems="center" spacing={2}>
                <Tabs value={activeTab} onChange={onTabChange}>
                  <Tab value="wallets" label="Linked Wallets" />
                  <Tab value="address-book" label="Address book" />
                  <Tab value="data" label="Data" />
                  <Tab value="settings" label="Settings" />
                </Tabs>

                {activeTab === "settings" && <Settings />}

                {activeTab === "wallets" && <LinkedWallets />}

                {activeTab === "data" && <Data onClose={onClose} />}
                {activeTab === "address-book" && <AddressBook />}
              </Stack>
            </CardContent>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

const Settings: FC = () => {
  const { payRoyalties, setPayRoyalties, preferredCurrency, setPreferredCurrency } = useUiSettings()
  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableCell>
            <Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="h6" color="primary" textTransform="uppercase" fontWeight="bold">
                  Pay royalties
                </Typography>
                <SvgIcon
                  // @ts-ignore
                  color="gold"
                >
                  <Crown />
                </SvgIcon>
              </Stack>
              <Typography>Pay full royalties when buying or instant-selling</Typography>
              <FormHelperText>
                You can still choose whether to pay royalties for each individual transaction
              </FormHelperText>
            </Stack>
          </TableCell>
          <TableCell sx={{ textAlign: "right" }}>
            <Switch checked={payRoyalties} onChange={(e) => setPayRoyalties(e.target.checked)} />
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            <Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="h6" color="primary" textTransform="uppercase" fontWeight="bold">
                  Display currency
                </Typography>
                <MonetizationOn color="primary" />
              </Stack>
              <Typography>Choose your preferred currency</Typography>
              <FormHelperText>Portfolio value and floor prices will be shown in this currency</FormHelperText>
            </Stack>
          </TableCell>
          <TableCell sx={{ textAlign: "right" }}>
            <Select value={preferredCurrency} onChange={(e) => setPreferredCurrency(e.target.value)}>
              {CURRENCIES.map((currency) => (
                <MenuItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.code.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

function LinkedWallets() {
  const { user, nonce, refresh } = useAccess()
  const { wallets, isLedger } = useWallets()
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [chain, setChain] = useState("solana")
  const umi = useUmi()
  const wallet = useWallet()

  function toggleAdding() {
    setAdding(!adding)
  }

  async function unlink(publicKey: string) {
    try {
      setLoading(true)
      // if (!isMain) {
      //   throw new Error("Connect with main wallet in order to unlink additional wallets")
      // }

      async function signMessage() {
        if (isLedger) {
          try {
            const txn = await addMemo(umi, {
              memo: "Add wallet to Biblio",
            }).buildWithLatestBlockhash(umi)

            const signed = await umi.identity.signTransaction(txn)

            await axios.post("/api/remove-wallet", {
              publicKey,
              rawTransaction: base58.encode(umi.transactions.serialize(signed)),
              id: user.id,
              usingLedger: isLedger,
            })
          } catch (err: any) {
            console.error(err)

            if (err.message.includes("Something went wrong")) {
              throw new Error(
                "Looks like the Solana app on your Ledger is out of date. Please update using the Ledger Live application and try again."
              )
            }

            if (err.message.includes("Cannot destructure property 'signature' of 'r' as it is undefined")) {
              throw new Error(
                'Unable to connect to Ledger, please make sure the device is unlocked with the Solana app open, and "Blind Signing" enabled'
              )
            }

            throw err
          }
        } else {
          if (!wallet.publicKey || !nonce || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey: wallet.publicKey.toBase58(),
            statement: `Sign this message to unlink ${shorten(publicKey)} from Biblio.\n\n`,
            nonce,
          })

          const data = new TextEncoder().encode(message.prepare())
          const signature = await wallet.signMessage(data)
          const serializedSignature = base58.encode(signature)

          await axios.post("/api/remove-wallet", {
            message: JSON.stringify(message),
            signature: serializedSignature,
            publicKey,
            id: user.id,
          })
        }
      }

      const signMessagePromise = signMessage()
      toast.promise(signMessagePromise, {
        loading: "Unlinking wallet",
        success: "Wallet unlinked",
        error: "Error unlinking wallet",
      })

      await signMessagePromise
      refresh()
    } catch (err: any) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data || "Error unlinking")
      } else {
        toast.error(err.message || "Error unlinking")
      }
    } finally {
      setLoading(false)
    }
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <Stack spacing={2} width="100%">
      <Table stickyHeader>
        {!isXs && (
          <TableHead>
            <TableRow>
              <TableCell>Address</TableCell>
              <TableCell>Nickname</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Chain</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
        )}

        <TableBody>
          {sortBy(user?.wallets, (w) => w.main).map((wallet) => {
            const nickname = wallets.find((w) => w.publicKey === wallet.public_key)?.nickname || "-"
            return (
              <TableRow
                key={wallet.public_key}
                sx={
                  isXs
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
                <TableCell data-th="Address">{shorten(wallet.public_key)}</TableCell>
                <TableCell data-th="Nickname">{nickname}</TableCell>
                <TableCell data-th="Type">{wallet.main ? "Main" : "Linked"}</TableCell>
                <TableCell data-th="Chain">{upperFirst(wallet.chain)}</TableCell>
                <TableCell style={{ width: isXs ? "100%" : "100px" }}>
                  <Button
                    onClick={() => unlink(wallet.public_key)}
                    disabled={loading || wallet.main}
                    color="error"
                    fullWidth
                    variant="outlined"
                  >
                    Unlink
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter sx={{ position: "sticky", bottom: 0, backgroundColor: "background.default", zIndex: 10 }}>
          <TableRow>
            <TableCell colSpan={5} sx={{ textAlign: "center" }}>
              <Button variant="contained" onClick={toggleAdding}>
                <Stack direction="row" spacing={0.5}>
                  <AddCircle />
                  <Typography>Add new</Typography>
                </Stack>
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <Dialog open={adding} onClose={toggleAdding} fullWidth>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Connect additional wallet</Typography>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">Chain</InputLabel>
                <Select value={chain} label="Chain" onChange={(e) => setChain(e.target.value)}>
                  <MenuItem value="solana">Solana</MenuItem>
                  <MenuItem value="eth">Ethereum</MenuItem>
                </Select>
              </FormControl>
              {chain === "eth" && <ConnectEth onClose={toggleAdding} />}
              {chain === "solana" && <ConnectSol onClose={toggleAdding} />}
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Stack>
  )
}

function Data({ onClose }: { onClose: Function }) {
  const router = useRouter()
  const [storage, setStorage] = useState<number>(0)
  const { db } = useDatabase()
  const { user, nonce, refresh } = useAccess()
  const [importFile, setImportFile] = useState(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteAllShowing, setDeleteAllShowing] = useState(false)
  const [deleteAccountShowing, setDeleteAccountShowing] = useState(false)
  const { isLedger } = useWallets()
  const wallet = useWallet()
  const umi = useUmi()
  const theme = useTheme()

  async function getStorage() {
    const storage = await navigator.storage.estimate()
    setStorage(storage.usage || 0)
  }

  useEffect(() => {
    getStorage()
  }, [db])

  async function exportData() {
    const { exportDB } = require("dexie-export-import")
    const blob = await exportDB(db, {
      filter: (table: string) => table !== "nfts",
    })
    const json = JSON.parse(await blob.text())

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json))
    const dlAnchorElem = document.createElement("a")
    dlAnchorElem.setAttribute("href", dataStr)
    dlAnchorElem.setAttribute("download", `${user?.id}.biblio`)
    dlAnchorElem.click()

    // await axios.post("/api/sync", { json, publicKey: session.publicKey })
    // toast.success("synced")
  }

  async function doImport() {
    try {
      setUploading(true)
      if (!blob) {
        throw new Error("PLease try again")
      }
      const { importInto, peakImportFile } = require("dexie-export-import")
      const peeked = await peakImportFile(blob)

      if (peeked.data.databaseName !== db.name) {
        throw new Error("Database mismatch - did you export this file from biblio?")
      }

      if (peeked.version === db.version) {
        throw new Error("Version mismatch - you have an outdated export, please re-export and try again.")
      }

      await importInto(db, blob, {
        filter: (table: string) => table !== "nfts",
        overwriteValues: true,
      })

      setBlob(null)

      toast.success("Imported successfully")
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  async function importData(e: any) {
    try {
      const file = e.target.files[0]
      const fileReader = new FileReader()
      if (file.name.split(".")[1] !== "biblio") {
        throw new Error("Only .biblio files can be imported")
      }
      fileReader.onload = async (event: any) => {
        if (!event.target.result) {
          return
        }
        try {
          const str = event.target.result

          const bytes = new TextEncoder().encode(str)
          const blob = new Blob([bytes], {
            type: "application/json;charset=utf-8",
          })

          setBlob(blob)
        } catch (err) {
          toast.error("Error reading file")
        }
      }
      fileReader.readAsText(file)
    } catch (err: any) {
      toast.error(err.message)
      console.error(err)
    }
  }

  async function clearUnonwned() {
    try {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected")
      }
      // todo: multi wallet
      await db.nfts.filter((n) => n.owner !== wallet.publicKey?.toBase58()).delete()
      await getStorage()
      toast.success("Unowned NFTs cleared from cache")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function clearAll() {
    try {
      await db.nfts.filter((item) => true).delete()
      await getStorage()
      toast.success("All NFTs cleared from cache")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const mainWallet = user?.wallets?.find((w: any) => w.main)?.public_key

  function toggleDeleteAllShowing() {
    setDeleteAllShowing(!deleteAllShowing)
  }

  function toggleDeleteAccountShowing() {
    setDeleteAccountShowing(!deleteAccountShowing)
  }

  async function deleteAllData() {
    if (window.confirm("Are you sure? This cannot be undone")) {
      await db.delete()
    }
  }

  async function deleteAccount() {
    try {
      setDeleting(true)
      const main = user.wallets.find((w: any) => w.main).public_key

      if (main !== wallet.publicKey?.toBase58()) {
        throw new Error(`Connect with ${shorten(main)} to delete your account`)
      }
      async function signMessage() {
        if (isLedger) {
          try {
            const txn = await addMemo(umi, {
              memo: "Add wallet to Biblio",
            }).buildWithLatestBlockhash(umi)

            const signed = await umi.identity.signTransaction(txn)

            await axios.post("/api/delete-account", {
              publicKey: wallet.publicKey?.toBase58(),
              rawTransaction: base58.encode(umi.transactions.serialize(signed)),
              usingLedger: isLedger,
            })
          } catch (err: any) {
            console.error(err)

            if (err.message.includes("Something went wrong")) {
              throw new Error(
                "Looks like the Solana app on your Ledger is out of date. Please update using the Ledger Live application and try again."
              )
            }

            if (err.message.includes("Cannot destructure property 'signature' of 'r' as it is undefined")) {
              throw new Error(
                'Unable to connect to Ledger, please make sure the device is unlocked with the Solana app open, and "Blind Signing" enabled'
              )
            }

            throw err
          }
        } else {
          if (!wallet.publicKey || !nonce || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey: wallet.publicKey.toBase58(),
            statement: `Sign this message to delete Biblio account: ${shorten(wallet.publicKey.toBase58())}.\n\n`,
            nonce,
          })

          const data = new TextEncoder().encode(message.prepare())
          const signature = await wallet.signMessage(data)
          const serializedSignature = base58.encode(signature)

          await axios.post("/api/delete-account", {
            message: JSON.stringify(message),
            signature: serializedSignature,
            publicKey: wallet.publicKey.toBase58(),
          })
        }
      }

      const deletePromise = signMessage()

      toast.promise(deletePromise, {
        loading: "Deleting Biblio account...",
        success: "Deleted successfully",
        error: "Error deleting",
      })

      await deletePromise
      refresh()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Error deleting")
    } finally {
      setDeleting(false)
    }
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <Box padding={{ xs: 2, sm: 4 }} sx={{ backgroundColor: darken(theme.palette.background.default, 0.1) }}>
      <Stack spacing={2}>
        <Typography>
          Biblio is fast. This is because we cache everything you view on your local device. You can use this menu to
          manage your storage and to free up space if required.
        </Typography>
        <Typography>
          Tags, address book, sort orders, and preferences will be preserved. Only NFT data cache will be cleared.
        </Typography>
        <Table>
          <TableBody>
            <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
              <TableCell sx={isXs ? { border: 0 } : {}}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Local storage usage
                </Typography>
              </TableCell>
              <TableCell>
                <Typography textAlign={{ xs: "center", sm: "right" }}>
                  {(storage / 1_000_000).toLocaleString()} Mb
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
              <TableCell sx={isXs ? { border: 0 } : {}}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Export data
                </Typography>
                <Typography>Export your data to use on another device</Typography>
              </TableCell>
              <TableCell sx={{ textAlign: "right" }}>
                <Button onClick={exportData} fullWidth variant="outlined">
                  export
                </Button>
              </TableCell>
            </TableRow>
            <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
              <TableCell sx={isXs ? { border: 0 } : {}}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Import data
                </Typography>
                <Typography>Upload .biblio file to import your preferences and settings</Typography>
              </TableCell>
              <TableCell sx={{ textAlign: "right" }}>
                <Button component="label" fullWidth variant="outlined">
                  Import
                  <input type="file" onChange={importData} hidden />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
              <TableCell sx={isXs ? { border: 0 } : {}}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Clear cache
                </Typography>
                <Typography>Free up space by deleting cached NFTs</Typography>
              </TableCell>
              <TableCell sx={{ textAlign: "right" }}>
                <Stack spacing={1} direction={{ xs: "column", sm: "row" }}>
                  <Tooltip title="Clear cached NFTs from other wallets you have visited">
                    <Button onClick={clearUnonwned} fullWidth variant="outlined">
                      Not-owned
                    </Button>
                  </Tooltip>
                  <Tooltip title="Clear all cached NFTs">
                    <Button onClick={clearAll} color="error" fullWidth variant="outlined">
                      All
                    </Button>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Alert severity="error" sx={{ border: 1, borderColor: "error" }}>
          <Stack spacing={2}>
            <Typography variant="h5">Danger zone</Typography>
            <Table>
              <TableBody sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
                <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
                  <TableCell sx={isXs ? { border: 0 } : {}}>
                    <Typography variant="h6" fontWeight="bold">
                      Delete all data
                    </Typography>
                    <Typography>
                      Clear your entire local database, including settings, orders, tags, address book
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Button color="error" variant="outlined" onClick={toggleDeleteAllShowing} fullWidth>
                      Delete data
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
                  <TableCell sx={isXs ? { border: 0 } : {}}>
                    <Typography variant="h6" fontWeight="bold">
                      Delete Biblio account
                    </Typography>
                    <Typography>
                      Delete your Biblio account. Do this if you need to link {shorten(mainWallet)} to another Biblio
                      account.
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    <Button
                      color="error"
                      variant="outlined"
                      sx={{ whiteSpace: "nowrap" }}
                      onClick={toggleDeleteAccountShowing}
                      fullWidth
                    >
                      Delete account
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Stack>
        </Alert>
      </Stack>
      <Dialog open={deleteAllShowing} onClose={toggleDeleteAllShowing}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Delete all local settings</Typography>
              <Alert severity="error">This will delete ALL local settings, for EVERY Biblio account.</Alert>
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button variant="outlined" color="primary" onClick={toggleDeleteAllShowing}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={deleteAllData} color="error">
                  Delete all data
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={deleteAccountShowing} onClose={toggleDeleteAccountShowing}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Delete Biblio account {shorten(mainWallet)}</Typography>
              <Alert severity="error">You will need to create a new account to continue using Biblio</Alert>
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button variant="outlined" color="primary" onClick={toggleDeleteAccountShowing}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={deleteAccount} color="error" disabled={deleting}>
                  Delete account
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={!!blob} onClose={() => setBlob(null)}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Import settings</Typography>
              <Typography>
                Are you sure you want to import settings from another device?
                <br />
                Any local settings will be overwritten.
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Button variant="outlined" color="error" onClick={() => setBlob(null)} disabled={uploading}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={doImport} disabled={uploading || !blob}>
                  Import data
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Box>
  )
}

export const AddressBook = () => {
  const { user } = useAccess()
  const { wallets, addWallet } = useWallets()
  const [adding, setAdding] = useState(false)
  const [publicKey, setPublicKey] = useState("")
  const [nickname, setNickname] = useState("")
  const [owned, setOwned] = useState(false)
  const [loading, setLoading] = useState(false)
  const [publicKeyError, setPublicKeyError] = useState<string | null>(null)

  function toggleAdding() {
    setAdding(!adding)
  }

  useEffect(() => {
    if (!publicKey) {
      setPublicKeyError(null)
      return
    }

    if (wallets.map((w) => w.publicKey).includes(publicKey)) {
      setPublicKeyError("Address already exists")
    }

    try {
      const pk = new PublicKey(publicKey)
      setPublicKeyError(null)
    } catch {
      setPublicKeyError("Invalid public key")
    }
  }, [publicKey])

  const linkedWallets = user?.wallets.map((wallet: any) => wallet.public_key)

  function handleClose() {
    setPublicKey("")
    setNickname("")
    setOwned(false)
    setPublicKeyError(null)
    toggleAdding()
  }

  async function handleAdd() {
    try {
      setLoading(true)
      await addWallet(publicKey, nickname, owned)
      handleClose()
    } catch (err: any) {
      toast.error(err.message || "Error adding")
    } finally {
      setLoading(false)
    }
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <>
      <Table stickyHeader>
        {!isXs && (
          <TableHead>
            <TableRow>
              <TableCell>
                <Stack>
                  <Typography>Address</Typography>
                </Stack>
              </TableCell>
              <TableCell>Nickname</TableCell>
              <TableCell>Owned</TableCell>
              <TableCell>Linked</TableCell>
              <TableCell sx={{ width: "150px" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody sx={isXs ? { display: "flex", flexDirection: "column" } : {}}>
          {sortBy(wallets, (wallet) => !linkedWallets?.includes(wallet.publicKey)).map((wallet) => (
            <Wallet
              key={wallet.publicKey}
              wallet={wallet}
              isLinked={Boolean(linkedWallets?.includes(wallet.publicKey))}
            />
          ))}
        </TableBody>
        <TableFooter sx={{ position: "sticky", bottom: 0, backgroundColor: "background.default", zIndex: 10 }}>
          <TableRow>
            <TableCell colSpan={5} sx={{ textAlign: "center" }}>
              <Button variant="contained" onClick={toggleAdding}>
                <Stack direction="row" spacing={0.5}>
                  <AddCircle />
                  <Typography>Add new</Typography>
                </Stack>
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <Dialog open={adding} fullWidth onClose={handleClose}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Add wallet to address book</Typography>
              <TextField
                label="Public key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                error={!!publicKeyError}
                helperText={publicKeyError}
              />
              <TextField label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <FormControlLabel
                label="Owned"
                control={<Switch checked={owned} onChange={(e) => setOwned(e.target.checked)} />}
              />
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Button onClick={handleClose} variant="outlined" color="error">
                  Cancel
                </Button>
                <Button onClick={handleAdd} variant="contained" disabled={loading}>
                  Add wallet
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </>
  )
}

type WalletProps = {
  wallet: Wallet
  isLinked: boolean
}

const Wallet: FC<WalletProps> = ({ wallet, isLinked }) => {
  const [nickname, setNickname] = useState(wallet.nickname || "")
  const [deleteShowing, setDeleteShowing] = useState(false)
  const [updateShowing, setUpdateShowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [owned, setOwned] = useState(Boolean(wallet.owned))
  const { deleteWallet, updateWallet } = useWallets()

  useEffect(() => {
    setNickname(wallet.nickname || "")
    setOwned(Boolean(wallet.owned))
  }, [wallet])

  function toggleDeleteShowing() {
    setDeleteShowing(!deleteShowing)
  }

  function toggleUpdateShowing() {
    setUpdateShowing(!updateShowing)
  }

  async function handleDelete() {
    try {
      setLoading(true)
      await deleteWallet(wallet.publicKey)
      toast.success("Wallet removed successfully")
      toggleDeleteShowing()
    } catch (err: any) {
      toast.error(err.message || "Error deleting")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    try {
      setLoading(true)
      await updateWallet(wallet.publicKey, nickname, owned)
      toast.success("Wallet updated successfully")
      toggleUpdateShowing()
    } catch (err: any) {
      toast.error(err.message || "Error updating")
    } finally {
      setLoading(false)
    }
  }

  function handleUpdateClose() {
    setOwned(Boolean(wallet.owned))
    setNickname(wallet.nickname || "")
    toggleUpdateShowing()
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  return (
    <>
      <TableRow
        sx={
          isXs
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
        <TableCell data-th="Address">
          <Tooltip title={wallet.publicKey}>
            <NextLink passHref href={`/wallet/${wallet.publicKey}`}>
              <Link>{shorten(wallet.publicKey as string)}</Link>
            </NextLink>
          </Tooltip>
        </TableCell>
        <TableCell data-th="Nickname">{wallet.nickname || "-"}</TableCell>
        <TableCell data-th="Owned">{wallet.owned ? "Yes" : "No"}</TableCell>
        <TableCell data-th="Linked">{isLinked ? "Yes" : "No"}</TableCell>
        <TableCell>
          {isXs ? (
            <Stack direction="column" width="100%" spacing={1}>
              <Button fullWidth variant="outlined">
                Edit
              </Button>
              <Button fullWidth variant="outlined" color="error">
                Delete
              </Button>
            </Stack>
          ) : (
            <Stack direction="row">
              <Tooltip
                title={isLinked ? "Cannot remove linked wallet, unlink first" : "Remove wallet from address book"}
              >
                <span>
                  <IconButton disabled={isLinked} color="error" onClick={toggleDeleteShowing}>
                    <Delete />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Update wallet">
                <span>
                  <IconButton color="primary" onClick={toggleUpdateShowing}>
                    <Edit />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )}
        </TableCell>
      </TableRow>
      <Dialog open={deleteShowing} onClose={toggleDeleteShowing}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Remove wallet</Typography>
              <Typography>Are you sure you want to remove this wallet from your address book?</Typography>
              <Stack direction="row" justifyContent="space-between">
                <Button onClick={toggleDeleteShowing} variant="outlined" color="error">
                  Cancel
                </Button>
                <Button onClick={handleDelete} variant="contained" disabled={loading}>
                  Remove wallet
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={updateShowing} fullWidth onClose={handleUpdateClose}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h5">Update wallet</Typography>
              <TextField label="Public key" value={wallet.publicKey} disabled />
              <TextField label="Nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <FormControlLabel
                label="Owned"
                disabled={isLinked}
                control={
                  <Switch
                    disabled={isLinked}
                    checked={isLinked || owned}
                    onChange={(e) => setOwned(e.target.checked)}
                  />
                }
              />
              <Stack direction="row" justifyContent="space-between" spacing={2}>
                <Button onClick={handleUpdateClose} variant="outlined" color="error">
                  Cancel
                </Button>
                <Button onClick={handleUpdate} variant="contained" disabled={loading}>
                  Save changes
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </>
  )
}
