import { NextPage } from "next"
import { Layout } from "../components/Layout"
import { useDatabase } from "../context/database"
import { Items } from "../components/Items"
import { useNfts } from "../context/nfts"
import { useRouter } from "next/router"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Dialog,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  SvgIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { Nft } from "../db"
import { flatten, orderBy, uniq, upperFirst } from "lodash"
import { Search } from "../components/Search"
import Plane from "../components/Actions/plane.svg"
import { LocalFireDepartment } from "@mui/icons-material"
import { useUiSettings } from "../context/ui-settings"
import { shorten } from "../helpers/utils"
import { useEffect, useState } from "react"
import { burnV1 } from "@metaplex-foundation/mpl-token-metadata"
import { useUmi } from "../context/umi"
import { Signer, createNoopSigner, publicKey, sol, transactionBuilder } from "@metaplex-foundation/umi"
import toast from "react-hot-toast"
import {
  TokExInvalidSystemProgramError,
  Token,
  TokenState,
  closeToken,
  fetchAllTokenByOwner,
  findAssociatedTokenPda,
  safeFetchToken,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox"
import { buildTransactions, getUmiChunks, signAllTransactions } from "../helpers/transactions"
import { useWalletBypass } from "../context/wallet-bypass"
import { useWallet } from "@solana/wallet-adapter-react"
import { getFee } from "../components/NftTool/helpers/utils"
import { useAccess } from "../context/access"

type OrderItem = {
  nftMint: string
  sortedIndex: number
}

function SortableHeader({
  name,
  onClick,
  sortBy,
  desc,
}: {
  name: string
  onClick: Function
  sortBy: string
  desc: boolean
}) {
  return (
    <Link underline="none" href="#" onClick={onClick(name)}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>{upperFirst(name)}</Typography>
        {sortBy === name && <Typography fontSize="12px">{desc ? "▼" : "▲"}</Typography>}
      </Stack>
    </Link>
  )
}

function SplRow({ item }: { item: Nft }) {
  const { showAllWallets } = useUiSettings()
  const { account, isAdmin } = useAccess()
  const [burnShowing, setBurnShowing] = useState(false)
  const [sendShowing, setSendShowing] = useState(false)
  const [amount, setAmount] = useState(BigInt(0))
  const [loading, setLoading] = useState(false)
  const { setBypassWallet } = useWalletBypass()
  const [confirmed, setConfirmed] = useState(false)
  const [token, setToken] = useState<Token | null>(null)
  const wallet = useWallet()
  const umi = useUmi()

  useEffect(() => {
    ;(async () => {
      try {
        const token = await safeFetchToken(
          umi,
          findAssociatedTokenPda(umi, {
            mint: publicKey(item.id),
            owner: publicKey(item.ownership.owner),
          })
        )

        setToken(token)
      } catch {}
    })()
  }, [item])

  function toggleBurn() {
    setBurnShowing(!burnShowing)
  }

  function toggleSend() {
    setSendShowing(!sendShowing)
  }

  async function burn() {
    try {
      setLoading(true)
      const mint = publicKey(item.id)
      const owner = publicKey(item.ownership.owner)
      const tokenAccount = findAssociatedTokenPda(umi, {
        mint,
        owner,
      })[0]
      let tx = transactionBuilder().add(
        burnV1(umi, {
          mint,
          amount,
          tokenStandard: item.metadata.tokenStandard,
          token: tokenAccount,
          tokenOwner: owner,
          authority: createNoopSigner(owner),
        })
      )

      const fee = getFee("biblio.transfer", account)

      setBypassWallet(true)
      const promise = Promise.resolve().then(async () => {
        const built = await tx.buildWithLatestBlockhash(umi)

        const signers = tx.getSigners(umi)

        const [signedTransaction] = await signAllTransactions(wallet, umi, [built], signers)
        const sig = await umi.rpc.sendTransaction(signedTransaction)
        const conf = await umi.rpc.confirmTransaction(sig, {
          strategy: {
            type: "blockhash",
            ...(await umi.rpc.getLatestBlockhash()),
          },
        })

        if (conf.value.err) {
          throw conf.value.err
        }
      })

      toast.promise(promise, {
        loading: "Burning tokens",
        success: "Tokens burned successfully",
        error: "Error burning tokens",
      })

      await promise
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
      setBypassWallet(false)
    }
  }

  async function send() {
    try {
      setLoading(true)
      toast("coming soon...")
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!item.token_info) {
    return null
  }

  function setMax() {
    setAmount(BigInt(item.token_info.balance))
  }

  const factor = BigInt(Math.pow(10, item.token_info.decimals))

  return (
    <TableRow>
      <TableCell>
        <Typography>
          {item.content?.metadata.name} ({item.content?.metadata.symbol})
        </Typography>
      </TableCell>
      <TableCell>
        <Typography>{(item.token_info.balance / Math.pow(10, item.token_info.decimals)).toLocaleString()}</Typography>
      </TableCell>
      <TableCell>
        <Typography>
          {item.token_info.price_info?.price_per_token
            ? `$${(item.token_info.price_info?.price_per_token as number).toLocaleString(undefined, {
                minimumSignificantDigits: item.token_info.price_info?.price_per_token < 1 ? 1 : undefined,
                maximumSignificantDigits: item.token_info.price_info?.price_per_token < 1 ? 2 : undefined,
              })}`
            : "-"}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography>
          {item.token_info.price_info?.total_price
            ? `$${item.token_info.price_info?.total_price.toLocaleString(undefined, {
                minimumSignificantDigits: item.token_info.price_info?.total_price < 1 ? 1 : undefined,
                maximumSignificantDigits: item.token_info.price_info?.total_price < 1 ? 2 : undefined,
              })}`
            : "-"}
        </Typography>
      </TableCell>
      {showAllWallets && (
        <TableCell>
          <Typography>{shorten(item.ownership.owner)}</Typography>
        </TableCell>
      )}
      {isAdmin && (
        <TableCell>
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Send">
              <IconButton
                size="small"
                disabled={loading || token?.state === TokenState.Frozen}
                onClick={send}
                color="primary"
              >
                <SvgIcon fontSize="small">
                  <Plane />
                </SvgIcon>
              </IconButton>
            </Tooltip>
            <Tooltip title="Burn">
              <IconButton
                size="small"
                onClick={toggleBurn}
                disabled={loading || token?.state === TokenState.Frozen}
                color="error"
              >
                <LocalFireDepartment fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </TableCell>
      )}

      <Dialog open={burnShowing} onClose={toggleBurn} maxWidth="md" fullWidth>
        <Card>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={2}>
                <Typography textAlign="center" textTransform="uppercase" variant="h4" color="error">
                  Burn tokens
                </Typography>

                {item.token_info.balance && (
                  <Stack alignItems="flex-end">
                    <Button onClick={setMax}>Max</Button>
                    <TextField
                      label="Amount to burn"
                      value={Number((amount * BigInt(1000)) / factor) / 1000}
                      onChange={(e) => setAmount(BigInt(e.target.value) * factor)}
                      type="number"
                      inputProps={{
                        min: 0,
                        max: BigInt(item.token_info.balance) / factor,
                      }}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{item.content?.metadata.symbol}</InputAdornment>,
                      }}
                      fullWidth
                    />
                  </Stack>
                )}

                <Alert severity="error">
                  <Stack spacing={2}>
                    <Typography variant="h5">Are you sure?</Typography>
                    {item.token_info.price_info?.price_per_token && !!amount && (
                      <Typography variant="h6" textTransform="uppercase">
                        The tokens you are burning are valued at $
                        {(item.token_info.price_info?.price_per_token * Number(amount / factor)).toLocaleString(
                          undefined,
                          {
                            minimumSignificantDigits:
                              item.token_info.price_info?.price_per_token * Number(amount / factor) < 1 ? 1 : undefined,
                            maximumSignificantDigits:
                              item.token_info.price_info?.price_per_token * Number(amount / factor) < 1 ? 2 : undefined,
                          }
                        )}
                      </Typography>
                    )}
                    <FormControlLabel
                      label="Yep, I know what I'm doing."
                      control={
                        <Checkbox checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} color="error" />
                      }
                    />
                  </Stack>
                </Alert>
                <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                  <Button onClick={toggleBurn}>Cancel</Button>
                  <Button onClick={burn} variant="contained" color="error" disabled={loading || !confirmed || !amount}>
                    Burn
                  </Button>
                </Stack>
              </Stack>
            </Container>
          </CardContent>
        </Card>
      </Dialog>
    </TableRow>
  )
}

function SplTable({ items }: { items: Nft[] }) {
  const { showAllWallets } = useUiSettings()
  const [sortBy, setSortBy] = useState("value")
  const [desc, setDesc] = useState(true)
  const { isAdmin } = useAccess()

  const sorted = orderBy(
    items.filter((item) => item.token_info),
    [
      (item) => {
        if (sortBy === "value") {
          return item.token_info.price_info?.total_price || 0
        }
        if (sortBy === "price") {
          return item.token_info.price_info?.price_per_token || 0
        }
        if (sortBy === "balance") {
          return item.token_info.balance || 0
        }
        if (sortBy === "name") {
          return item.content?.metadata?.name || "z"
        }
      },
      (item) => item.token_info.balance,
    ],
    [desc ? "desc" : "asc", "desc"]
  )

  const onHeaderClick = (col: string) => (e: any) => {
    e.preventDefault()
    if (sortBy === col) {
      console.log("FLIPPING")
      setDesc(!desc)
    } else {
      setDesc(true)
      setSortBy(col)
    }
  }

  return (
    <Table stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell>
            <SortableHeader name="name" sortBy={sortBy} desc={desc} onClick={onHeaderClick} />
          </TableCell>
          <TableCell>
            <SortableHeader name="balance" sortBy={sortBy} desc={desc} onClick={onHeaderClick} />
          </TableCell>
          <TableCell>
            <SortableHeader name="price" sortBy={sortBy} desc={desc} onClick={onHeaderClick} />
          </TableCell>
          <TableCell>
            <SortableHeader name="value" sortBy={sortBy} desc={desc} onClick={onHeaderClick} />
          </TableCell>
          {showAllWallets && (
            <TableCell>
              <Typography>Owner</Typography>
            </TableCell>
          )}
          {isAdmin && (
            <TableCell>
              <Typography>Actions</Typography>
            </TableCell>
          )}
        </TableRow>
      </TableHead>
      <TableBody>
        {sorted.map((item, index) => (
          <SplRow item={item} key={index} />
        ))}
      </TableBody>
    </Table>
  )
}

function Cleanup() {
  const { showAllWallets } = useUiSettings()
  const [loading, setLoading] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const umi = useUmi()
  const wallet = useWallet()
  const { user } = useAccess()
  const { setBypassWallet } = useWalletBypass()

  useEffect(() => {
    if (!wallet.publicKey) {
      setTokens([])
      return
    }

    // const pks = showAllWallets
    //   ? uniq([
    //       wallet.publicKey.toBase58(),
    //       ...user.wallets.filter((w: any) => w.chain === "solana").map((w: any) => w.public_key),
    //     ])
    //   : [wallet.publicKey.toBase58()]

    const pks = [wallet.publicKey.toBase58()]
    ;(async () => {
      const tokens = flatten(
        await Promise.all(
          pks.map((pk) => fetchAllTokenByOwner(umi, publicKey(pk), { tokenAmountFilter: (amount) => !amount }))
        )
      )
      setTokens(tokens)
    })()
  }, [wallet.publicKey])

  async function cleanup() {
    try {
      setLoading(true)

      const promise = Promise.resolve().then(async () => {
        if (!tokens.length) {
          throw new Error("No token accounts to cleanup")
        }

        // const fee = getFee("biblio.cleanup", account)

        const txs = tokens.map((token) => {
          let instructions = closeToken(umi, {
            account: token.publicKey,
            destination: umi.identity.publicKey,
            owner: createNoopSigner(token.owner),
          })

          // if (fee > 0) {
          //   instructions = instructions.add(
          //     transferSol(umi, {
          //       destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
          //       amount: sol(fee),
          //     })
          //   )
          // }

          return {
            instructions,
            mint: token.mint,
          }
        })

        const chunks = getUmiChunks(umi, txs)

        const txns = await buildTransactions(umi, chunks)

        setBypassWallet(true)

        const signers = uniq(flatten(txns.map((t) => t.signers))).sort((item: Signer) =>
          item.publicKey === wallet.publicKey?.toBase58() ? -1 : 1
        )

        const signedTransactions = await signAllTransactions(
          wallet,
          umi,
          txns.map((t) => t.txn),
          signers
        )

        const blockhash = await umi.rpc.getLatestBlockhash()

        await Promise.all(
          signedTransactions.map(async (tx) => {
            const sig = await umi.rpc.sendTransaction(tx)
            const conf = await umi.rpc.confirmTransaction(sig, {
              strategy: {
                type: "blockhash",
                ...blockhash,
              },
            })
          })
        )
      })

      toast.promise(promise, {
        loading: "Cleaning up token accounts",
        success: "Successfully closed empty accounts",
        error: "Error cleaning up token accounts",
      })

      await promise
    } catch (err: any) {
      console.error(err.message)
    } finally {
      setLoading(false)
      setBypassWallet(false)
    }
  }

  return (
    <Button onClick={cleanup} variant="outlined" disabled={loading || !tokens.length}>
      {tokens.length ? `Close ${tokens.length} empty token accounts` : "No empty token accounts"}
    </Button>
  )
}

export const Filter: NextPage = () => {
  const router = useRouter()
  const { updateOrder } = useDatabase()
  const { nfts, filtered } = useNfts()

  async function handleUpdateOrder(items: OrderItem[]) {
    await updateOrder(items, router.query.filter || router.query.tag || router.query.collectionId)
  }

  const isSpl = router.query.filter === "spl"

  return (
    <Layout
      nfts={nfts}
      filtered={filtered}
      showUntagged
      actions={
        isSpl ? (
          <Box padding={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Cleanup />
              <Search />
            </Stack>
          </Box>
        ) : undefined
      }
    >
      {isSpl ? <SplTable items={filtered} /> : <Items items={filtered} updateOrder={handleUpdateOrder} sortable />}
    </Layout>
  )
}

export default Filter
