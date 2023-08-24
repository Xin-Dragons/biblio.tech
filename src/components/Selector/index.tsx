import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  darken,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import axios from "axios"
import { Items } from "../Items"
import { Nft } from "../../types/nextauth"
import { useNfts } from "../../context/nfts.tsx"
import { shorten } from "../../helpers/utils"
import { useTheme } from "../../context/theme"

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
  linkedNfts?: Nft[] | null
  onSubmit: Function
  onCancel?: Function
  loading?: boolean
  submitLabel?: string
  unlinkNft?: Function
}

export const Selector: FC<SelectorProps> = ({
  linkedNfts,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "Create account",
  unlinkNft,
}) => {
  const [selected, setSelected] = useState<Nft | null>(null)
  const [nftsLoading, setNftsLoading] = useState(false)
  const wallet = useWallet()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [libraryCards, setLibraryCards] = useState([])

  const theme = useTheme()

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

  function cancel() {
    setSelected(null)
    setSelectorOpen(false)
  }

  async function submit() {
    if (!selected) return
    await onSubmit(selected.mint)
    setSelected(null)
  }

  return (
    <Stack spacing={2}>
      {!linkedNfts?.length ? (
        <>
          {" "}
          <Typography color="primary" textAlign={"center"}>
            Choose a Dandy or a Library Card to gain access to Biblio
          </Typography>
          <Typography textAlign="center">
            This NFT will be locked and linked to your account.
            <br />
            You can unlock and pause your Biblio access at any time
          </Typography>
        </>
      ) : (
        <Alert severity="info">Link multiple Dandies or Biblio Passes to use Biblio with multiple wallets.</Alert>
      )}
      {nftsLoading ? (
        <Box
          width={300}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "1em auto !important",
            background: darken(theme.palette.background.default, 0.1),
            padding: 5,
          }}
        >
          <CircularProgress />
        </Box>
      ) : libraryCards.length ? (
        selected ? (
          <LinkedNft
            nft={selected}
            onClick={toggleSelectorOpen}
            submit={submit}
            submitLabel={submitLabel}
            onCancel={onCancel || cancel}
          />
        ) : (
          <Box
            width={300}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "1em auto !important",
              background: darken(theme.palette.background.default, 0.1),
            }}
          >
            <Button
              onClick={toggleSelectorOpen}
              variant="contained"
              size="large"
              sx={{ marginTop: 5, marginBottom: 5 }}
            >
              Choose NFT
            </Button>
          </Box>
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

      {linkedNfts?.length && (
        <Stack spacing={2}>
          <Typography variant="h5">Linked NFTs ({linkedNfts.length})</Typography>
          <Grid container spacing={2} sx={{ paddingRight: "16px" }}>
            {linkedNfts?.length &&
              linkedNfts?.map((nft, index) => (
                <Grid item md={6} sm={12} key={index}>
                  <LinkedNft nft={nft} unlinkNft={unlinkNft} loading={loading} small />
                </Grid>
              ))}
          </Grid>
        </Stack>
      )}

      <Dialog open={selectorOpen} onClose={toggleSelectorOpen} maxWidth="md">
        <Card sx={{ padding: 2, overflow: "auto" }}>
          <Grid container spacing={2}>
            {libraryCards
              .filter((l: any) => !linkedNfts?.map((n) => n.mint).includes(l.mint))
              .map((card: Nft, index) => {
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={index}>
                    <Card key={card.mint} sx={{ cursor: "pointer" }} onClick={() => onSelect(card)}>
                      <img src={card.metadata.image} width="100%" />
                      <CardContent>
                        <Typography fontWeight="bold" textAlign="center">
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
    </Stack>
  )
}

type LinkedNftProps = {
  nft: Nft
  onClick?: Function
  unlinkNft?: Function
  loading?: boolean
  submit?: Function
  submitLabel?: string
  onCancel?: Function
  small?: boolean
}

const LinkedNft: FC<LinkedNftProps> = ({ nft, onClick, unlinkNft, loading, submit, submitLabel, onCancel, small }) => {
  const { allNfts: nfts } = useNfts()
  const wallet = useWallet()
  const theme = useTheme()
  const owner = (nfts.find((n) => n.nftMint === nft.mint) || {}).owner

  const isOwned = owner === wallet.publicKey?.toBase58()

  const numWallets =
    nft?.metadata?.attributes?.find((att) => att.trait_type === "Wallets")?.value || nft.number_wallets || 1

  const isUnlimited =
    nft?.metadata?.attributes?.find((att) => att.trait_type === "Access")?.value === "Unlimited" ||
    !Boolean(nft.hours_active)

  const timeRemaining = !isUnlimited
    ? `${(nft?.hours_active! - nft.time_staked / 3600).toLocaleString(undefined, { maximumFractionDigits: 2 })} hours`
    : "Unlimited"

  return (
    <Stack
      spacing={1}
      sx={{ backgroundColor: darken(theme.palette.background.default, 0.1) }}
      alignItems="center"
      padding={small ? 2 : 4}
      width="100%"
    >
      <Stack
        direction={{ sm: "row", xs: "column" }}
        spacing={1}
        alignItems={small ? "flex-start" : "center"}
        width="100%"
      >
        <Stack spacing={2} justifyContent="space-between" width="100%">
          <img
            src={`https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/${nft?.metadata?.image}`}
            width="100%"
            style={{ display: "block", cursor: "pointer" }}
            onClick={() => onClick?.()}
          />
          {unlinkNft && (
            <Tooltip
              title={
                isOwned
                  ? "Unlink NFT from Biblio. Your maximum linked wallets will decrease"
                  : `This NFT is owned by ${
                      owner ? shorten(owner) : "another wallet"
                    }. Connect with that wallet to unlink it`
              }
            >
              <span>
                <Button
                  onClick={() => unlinkNft(nft.mint)}
                  disabled={loading || !isOwned}
                  variant="outlined"
                  size="large"
                  color="error"
                >
                  Unlink
                </Button>
              </span>
            </Tooltip>
          )}
        </Stack>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <Typography variant={small ? "body2" : "h6"} fontWeight="bold" color="primary">
                  NFT Status
                </Typography>
              </TableCell>
              <TableCell>
                <Typography textAlign="right" variant={small ? "body2" : "body1"}>
                  {nft?.active ? "Active" : "Inactive"}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography variant={small ? "body2" : "h6"} fontWeight="bold" color="primary">
                  Collection
                </Typography>
              </TableCell>
              <TableCell>
                <Typography textAlign="right" variant={small ? "body2" : "body1"}>
                  {nft?.collection_name}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <Typography variant={small ? "body2" : "h6"} fontWeight="bold" color="primary">
                  Wallets
                </Typography>
              </TableCell>
              <TableCell>
                <Typography textAlign="right" variant={small ? "body2" : "body1"}>
                  {numWallets}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ border: "none" }}>
                <Typography variant={small ? "body2" : "h6"} fontWeight="bold" color="primary">
                  Time remaining
                </Typography>
              </TableCell>
              <TableCell sx={{ border: "none" }}>
                <Typography textAlign="right" variant={small ? "body2" : "body1"}>
                  {timeRemaining}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Stack>
      {!unlinkNft && (
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" color="error" onClick={onCancel && (onCancel as any)} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={!nft || loading} variant="outlined" onClick={() => submit && submit()}>
            {submitLabel}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}
