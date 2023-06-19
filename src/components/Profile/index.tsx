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
import { Selector } from "../Selector"
import { getCsrfToken, signOut, useSession } from "next-auth/react"
import { useDatabase } from "../../context/database"
import { User } from "../../types/nextauth"
import { useWallets } from "../../context/wallets"
import { sortBy, update, upperFirst } from "lodash"
import { AddCircle, Close, Delete, Edit, ExpandMore, MonetizationOn, TramSharp, Update } from "@mui/icons-material"
import { Wallet } from "../../db"
import { default as NextLink } from "next/link"
import { WalletMultiButtonDynamic } from "../ActionBar"
import { shorten } from "../../helpers/utils"
import { useAccess } from "../../context/access"
import { useUmi } from "../../context/umi"
import { addMemo } from "@metaplex-foundation/mpl-essentials"
import { SigninMessage } from "../../utils/SigninMessge"
import { useTheme } from "../../context/theme"
import { useUiSettings } from "../../context/ui-settings"
import { useAccount, useConnect, useDisconnect, useEnsAvatar, useEnsName, useNetwork, useSignMessage } from "wagmi"
import Crown from "../Listing/crown.svg"
import { recoverMessageAddress } from "viem"
import { SiweMessage } from "siwe"
import { CURRENCIES, Currency } from "../../context/brice"

type ProfileProps = {
  user: User
  publicKey: string
  onClose: Function
}

const ConnectEth: FC<{ onClose: Function }> = ({ onClose }) => {
  const { chain } = useNetwork()
  const { signMessageAsync } = useSignMessage()
  const { data: session, update } = useSession()

  const { address, connector, isConnected } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: "jxom.eth" })
  const { connect, connectors, error, isLoading, pendingConnector } = useConnect()
  const { disconnect } = useDisconnect()

  async function linkWallet() {
    try {
      const nonce = await getCsrfToken()
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
          basePublicKey: session?.publicKey,
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

      await update()
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
  const { update, data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const { stakeNft, unstakeNft } = useDatabase()
  const [activeTab, setActiveTab] = useState<string | null>("access")
  const wallet = useWallet()

  function onTabChange(e: any, tab: string) {
    setActiveTab(tab)
  }

  const isXs = useMediaQuery((theme: Theme) => theme.breakpoints.down("sm"))

  const user = session?.user
  const publicKey = session?.publicKey

  async function unlinkNft(mint: string) {
    try {
      setLoading(true)
      async function unlink() {
        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          mint,
        }
        const { data } = await axios.post("/api/unlock-nft", params)
        if (data.resolved) {
          return
        }
        const txn = Transaction.from(base58.decode(data.txn))
        const signed = await wallet?.signTransaction?.(txn)
        await axios.post("/api/send-unlock-nft", {
          ...params,
          rawTransaction: base58.encode(signed?.serialize()!),
        })
      }

      const unlinkPromise = unlink()

      toast.promise(unlinkPromise, {
        loading: "Unlinking NFT from Biblio...",
        success: "NFT unlinked",
        error: "Error unlinking NFT, please try again",
      })

      await unlinkPromise
      await unstakeNft(mint)
      await update()
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function linkNft(mint: string) {
    try {
      setLoading(true)

      async function link() {
        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          mint,
        }
        const { data } = await axios.post("/api/lock-nft", params)
        if (data.resolved) {
          return
        }
        const txn = Transaction.from(base58.decode(data.txn))
        const signed = await wallet?.signTransaction?.(txn)
        await axios.post("/api/send-lock-nft", {
          ...params,
          rawTransaction: base58.encode(signed?.serialize()!),
        })
      }

      const linkPromise = link()

      toast.promise(linkPromise, {
        loading: "Linking NFT to Biblio...",
        success: "NFT linked",
        error: "Error linking NFT, please try again",
      })

      await linkPromise
      await stakeNft(mint)
      await update()
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!wallet.publicKey) {
    return null
  }

  const onAccordionChange = (panel: string) => (e: any, isExpanded: boolean) => setActiveTab(isExpanded ? panel : null)

  return (
    <Card sx={{ overflowY: "auto", minHeight: "80vh" }}>
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
            <Accordion expanded={activeTab === "access"} onChange={onAccordionChange("access")} sx={{ width: "100%" }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6" color="primary">
                  Access
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Selector
                  linkedNfts={user?.nfts || null}
                  onSubmit={linkNft}
                  unlinkNft={unlinkNft}
                  loading={loading}
                  submitLabel="Link NFT"
                />
              </AccordionDetails>
            </Accordion>
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
                <Data />
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
                <Tab value="access" label="Access" />
                <Tab value="wallets" label="Linked Wallets" />
                <Tab value="address-book" label="Address book" />
                <Tab value="data" label="Data" />
                <Tab value="settings" label="Settings" />
              </Tabs>
              {activeTab === "access" && (
                <>
                  <Selector
                    linkedNfts={user?.nfts || null}
                    onSubmit={linkNft}
                    unlinkNft={unlinkNft}
                    loading={loading}
                    submitLabel="Link NFT"
                  />
                </>
              )}

              {activeTab === "settings" && <Settings />}

              {activeTab === "wallets" && <LinkedWallets />}

              {activeTab === "data" && <Data />}
              {activeTab === "address-book" && <AddressBook />}
            </Stack>
          </CardContent>
        )}
      </Stack>
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
  const { data: session, update } = useSession()
  const { publicKeys, availableWallets, ethPublicKeys } = useAccess()
  const { wallets, isLedger } = useWallets()
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [chain, setChain] = useState("solana")
  const umi = useUmi()
  const wallet = useWallet()

  const linkedWallets = [...publicKeys, ...ethPublicKeys]

  function toggleAdding() {
    setAdding(!adding)
  }

  const isMain = session?.user?.wallets.find((w) => w.public_key === wallet.publicKey?.toBase58())?.main

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
              basePublicKey: wallet.publicKey?.toBase58(),
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
          const csrf = await getCsrfToken()
          if (!wallet.publicKey || !csrf || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey: wallet.publicKey.toBase58(),
            statement: `Sign this message to unlink ${shorten(publicKey)} from Biblio.\n\n`,
            nonce: csrf,
          })

          const data = new TextEncoder().encode(message.prepare())
          const signature = await wallet.signMessage(data)
          const serializedSignature = base58.encode(signature)

          await axios.post("/api/remove-wallet", {
            message: JSON.stringify(message),
            signature: serializedSignature,
            publicKey,
            basePublicKey: wallet.publicKey.toBase58(),
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

      await update()
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
      {linkedWallets.length < availableWallets ? (
        <>
          <Alert severity="info">
            You have <strong>{linkedWallets.length}</strong> linked wallet{linkedWallets.length === 1 ? "" : "s"}. You
            can link up to <strong>{availableWallets}</strong>.
          </Alert>
          <Typography>
            Connect to a new wallet while signed in to your main account and sign a message in order to link. You can
            unlink additional wallets at any time.
          </Typography>
        </>
      ) : (
        <Alert severity="info">
          You have linked your maximum wallets. Link more Dandies or Biblio Passes to link additional wallets.
        </Alert>
      )}

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
          {sortBy(session?.user?.wallets, (w) => w.main).map((wallet) => {
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
              <Button variant="contained" onClick={toggleAdding} disabled={publicKeys.length >= availableWallets}>
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
              {chain === "solana" && (
                <Stack spacing={2}>
                  <Typography>
                    To connect an additional Solana wallet, switch your extension to the new wallet while staying signed
                    in to your main account.
                  </Typography>
                  <Stack direction="row">
                    <Button variant="outlined" onClick={toggleAdding} color="error">
                      Close
                    </Button>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Stack>
  )
}

function Data() {
  const [storage, setStorage] = useState<number>(0)
  const { db } = useDatabase()
  const { data: session } = useSession()
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
    dlAnchorElem.setAttribute("download", `${session?.user?.id}.biblio`)
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

  const mainWallet = session?.user?.wallets.find((w) => w.main)?.public_key

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
      if (session?.user?.nfts?.length) {
        throw new Error("Cannot delete account as there are still linked NFTs. Unlink these first")
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
          const csrf = await getCsrfToken()
          if (!wallet.publicKey || !csrf || !wallet.signMessage) return

          const message = new SigninMessage({
            domain: window.location.host,
            publicKey: wallet.publicKey.toBase58(),
            statement: `Sign this message to delete Biblio account: ${shorten(wallet.publicKey.toBase58())}.\n\n`,
            nonce: csrf,
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
      await signOut()
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
  const { data: session } = useSession()
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

  const linkedWallets = session?.user?.wallets.map((wallet) => wallet.public_key)

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
              <Link>{shorten(wallet.publicKey)}</Link>
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
