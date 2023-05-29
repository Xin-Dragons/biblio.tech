import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { Items } from "../Items"
import { Nft } from "../../types/nextauth"

const Nft: FC<{ item: Nft; select: Function }> = ({ item, select }) => {
  return (
    <Card sx={{ margin: 0.5, cursor: "pointer" }} onClick={() => select(item)}>
      <img
        src={`https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${item.metadata?.image}`}
        width="100%"
        style={{ display: "block" }}
      />
    </Card>
  )
}

type SelectorProps = {
  linkedNft?: Nft
  onSubmit: Function
  onCancel: Function
  loading: boolean
  submitLabel?: string
}

export const Selector: FC<SelectorProps> = ({
  linkedNft,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create account",
}) => {
  const [selected, setSelected] = useState<Nft | null>(null)
  const [nftsLoading, setNftsLoading] = useState(false)
  const wallet = useWallet()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [libraryCards, setLibraryCards] = useState([])

  async function getLibraryCards() {
    try {
      setNftsLoading(true)
      const { data } = await axios.get("/api/get-library-cards", {
        params: { publicKey: wallet.publicKey?.toBase58() },
      })
      setLibraryCards(data)
    } catch (err) {
      console.log(err)
    } finally {
      setNftsLoading(false)
    }
  }

  useEffect(() => {
    if (wallet.publicKey) {
      getLibraryCards()
    }
  }, [wallet.publicKey])

  function onSelect(item: Nft) {
    setSelectorOpen(false)
    setSelected(item)
  }

  function toggleSelectorOpen() {
    setSelectorOpen(!selectorOpen)
  }

  async function submit() {
    if (!selected) return
    await onSubmit(selected.mint)
    setSelected(null)
  }

  return (
    <>
      {!linkedNft && (
        <>
          {" "}
          <Typography color="primary">Choose a Dandy or a Library Card to gain access to Biblio</Typography>
          <Typography textAlign="center">
            This NFT will be locked and linked to your account.
            <br />
            You can unlock and pause your Biblio access at any time
          </Typography>
        </>
      )}

      <Stack
        direction={{ sm: "row", xs: "column" }}
        padding={4}
        sx={{ backgroundColor: "#111" }}
        spacing={1}
        alignItems="center"
      >
        <Box width={300} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {linkedNft ? (
            <img
              src={`https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${linkedNft?.metadata?.image}`}
              width="100%"
              style={{ display: "block" }}
            />
          ) : nftsLoading ? (
            <img src="/loading-slow.gif" width="100%" />
          ) : libraryCards.length ? (
            selected ? (
              <img
                src={`https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${selected?.metadata?.image}`}
                width="100%"
                style={{ display: "block", cursor: "pointer" }}
                onClick={toggleSelectorOpen}
              />
            ) : (
              <Button
                onClick={toggleSelectorOpen}
                variant="contained"
                size="large"
                sx={{ marginTop: 5, marginBottom: 5 }}
              >
                Choose NFT
              </Button>
            )
          ) : (
            <Stack spacing={2}>
              <Alert severity="error">No eligible Library Cards or Dandies detected</Alert>
              <Button
                variant="contained"
                size="large"
                sx={{ fontWeight: "bold" }}
                href="https://www.tensor.trade/trade/dandies"
              >
                Buy a Dandy
              </Button>
            </Stack>
          )}
        </Box>
        {(selected || linkedNft) && (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    NFT Status
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography textAlign="right">
                    {(linkedNft || selected)?.collection["biblio-collections"].active ? "Active" : "Inactive"}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    Collection
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography textAlign="right">{(linkedNft || selected)?.collection.name}</Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    Number of wallets
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography textAlign="right">
                    {(linkedNft || selected)?.collection["biblio-collections"].number_wallets}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ border: "none" }}>
                  <Typography variant="h6" fontWeight="bold" color="primary">
                    Access length
                  </Typography>
                </TableCell>
                <TableCell sx={{ border: "none" }}>
                  <Typography textAlign="right">
                    {(linkedNft || selected)?.collection["biblio-collections"].hours_active
                      ? `${(linkedNft || selected)?.collection["biblio-collections"].hours_active! / 24} days`
                      : "Unlimited"}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Stack>
      {!linkedNft && (
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="error" onClick={onCancel as any} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={!selected || loading} variant="outlined" onClick={submit}>
            {submitLabel}
          </Button>
        </Stack>
      )}

      <Dialog open={selectorOpen} onClose={toggleSelectorOpen} maxWidth="xl">
        <Card sx={{ padding: 2, overflow: "auto" }}>
          <Grid container spacing={2}>
            {libraryCards.map((card: Nft, index) => {
              return (
                <Grid item xs={6} sm={4} md={3} lg={2} xl={1} key={index}>
                  <Card key={card.mint} sx={{ cursor: "pointer" }} onClick={() => onSelect(card)}>
                    <img src={card.metadata.image} width="100%" />
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" textAlign="center">
                        {card.metadata.name}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
          </Grid>
        </Card>
      </Dialog>
    </>
  )
}
