import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { shorten } from "../Item"
import { useMetaplex } from "../../context/metaplex"
import { PublicKey, Transaction } from "@solana/web3.js"
import { toast } from "react-hot-toast"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import base58 from "bs58"
import { Selector } from "../Selector"
import { useSession } from "next-auth/react"
import { useDatabase } from "../../context/database"
import { User } from "../../types/nextauth"

type ProfileProps = {
  user: User
  publicKey: string
  onClose: Function
}

export const Profile: FC<ProfileProps> = ({ onClose }) => {
  const { update, data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const { stakeNft, unstakeNft } = useDatabase()
  const [activeTab, setActiveTab] = useState("access")
  const wallet = useWallet()

  function onTabChange(e: any, tab: string) {
    setActiveTab(tab)
  }

  const user = session?.user
  const publicKey = session?.publicKey

  async function unlinkNft() {
    try {
      setLoading(true)
      async function unlink() {
        const params = {
          publicKey: wallet.publicKey?.toBase58(),
          mint: user?.access_nft.mint,
        }
        const { data } = await axios.post("/api/unlock-nft", params)
        if (data.resolved) {
          toast.success("NFT unlinked")
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
      await unstakeNft(user?.access_nft.mint)
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
          toast.success("NFT unlinked")
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

  return (
    <Card sx={{ overflowY: "auto" }}>
      <CardContent>
        <Stack spacing={2} alignItems="center">
          <Stack>
            <Typography variant="h4" fontFamily="Lato" fontWeight="bold" textAlign="center">
              Profile settings
            </Typography>
            <Typography variant="h6" color="primary" textAlign="center">
              Connected with {shorten(publicKey)}
            </Typography>
          </Stack>
          <Tabs value={activeTab} onChange={onTabChange}>
            <Tab value="access" label="Access" />
            <Tab value="data" label="data" />
          </Tabs>
          {activeTab === "access" && (
            <>
              <Selector
                linkedNft={user?.access_nft}
                onSubmit={linkNft}
                onCancel={onClose}
                loading={loading}
                submitLabel="Link NFT"
              />
              {user?.access_nft && (
                <Button onClick={unlinkNft} disabled={loading} variant="outlined" size="large">
                  Unlink
                </Button>
              )}
            </>
          )}

          {activeTab === "data" && <Data />}
        </Stack>
      </CardContent>
    </Card>
  )
}

function Data() {
  const [storage, setStorage] = useState<number>(0)
  const { db } = useDatabase()
  const { data: session } = useSession()
  const [importFile, setImportFile] = useState(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const wallet = useWallet()

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

  return (
    <Box padding={4} sx={{ backgroundColor: "#111" }} width="90%">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Local storage usage
              </Typography>
            </TableCell>
            <TableCell>
              <Typography textAlign="right">{(storage / 1_000_000).toLocaleString()} Mb</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Export data
              </Typography>
              <Typography>Export your data to use on another device</Typography>
            </TableCell>
            <TableCell sx={{ textAlign: "right" }}>
              <Button onClick={exportData}>export</Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Import data
              </Typography>
              <Typography>Upload .biblio file to import your preferences and settings</Typography>
            </TableCell>
            <TableCell sx={{ textAlign: "right" }}>
              <Button component="label">
                Import
                <input type="file" onChange={importData} hidden />
              </Button>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Clear cache
              </Typography>
              <Typography>Free up space by deleting cached NFTs</Typography>
            </TableCell>
            <TableCell sx={{ textAlign: "right" }}>
              <Button onClick={clearUnonwned}>Not-owned</Button>
              <Button onClick={clearAll} color="error">
                All
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
