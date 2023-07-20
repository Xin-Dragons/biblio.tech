import { Metadata, updateV1 } from "@metaplex-foundation/mpl-token-metadata"
import { publicKey, sol, transactionBuilder, unwrapOption } from "@metaplex-foundation/umi"
import { Stack, Typography, TextField, Button, CardContent, Card, Dialog, Alert } from "@mui/material"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import Spinner from "./Spinner"
import { useUmi } from "../context/umi"
import { AuthorityType, Mint, setAuthority, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { FEES_WALLET } from "../constants"

export const UpdateAuths = ({
  mint,
  metadata,
  isAdmin,
  refresh,
}: {
  mint: Mint | null
  metadata?: Metadata
  isAdmin: boolean
  refresh: Function
}) => {
  const [newFreezeAuthority, setNewFreezeAuthority] = useState("")
  const [newMintAuthority, setNewMintAuthority] = useState("")
  const [newUpdateAuthority, setNewUpdateAuthority] = useState("")

  const [canUpdateMintAuth, setCanUpdateMintAuth] = useState(false)
  const [canUpdateFreezeAuth, setCanUpdateFreezeAuth] = useState(false)
  const [canUpdateUpdateAuth, setCanUpdateUpdateAuth] = useState(false)
  const [immutableWarningShowing, setImmutableWarningShowing] = useState(false)
  const [revokeMintAuthWarningShowing, setRevokeMintAuthWarningShowing] = useState(false)
  const [revokeFreezeAuthWarningShowing, setRevokeFreezeAuthWarningShowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const wallet = useWallet()

  const umi = useUmi()

  useEffect(() => {
    const address = umi.identity.publicKey
    const isMintAuthority = mint && unwrapOption(mint.mintAuthority) === address
    const isFreezeAuthority = mint && unwrapOption(mint.freezeAuthority) === address
    const isUpdateAuthority = metadata?.updateAuthority === address

    setCanUpdateMintAuth(!!isMintAuthority)
    setCanUpdateFreezeAuth(!!isFreezeAuthority)
    setCanUpdateUpdateAuth(!!isUpdateAuthority && metadata.isMutable)
  }, [metadata, mint, wallet.publicKey])

  function cancel() {
    setNewFreezeAuthority("")
    setNewMintAuthority("")
    setNewUpdateAuthority("")
  }

  async function submit() {
    if (!mint) {
      return
    }
    try {
      if (!newFreezeAuthority && !newMintAuthority && !newUpdateAuthority) {
        throw new Error("No authorities changed")
      }

      let txn = transactionBuilder()

      if (newUpdateAuthority) {
        txn = txn.add(
          updateV1(umi, {
            mint: mint.publicKey,
            newUpdateAuthority: publicKey(newUpdateAuthority),
          })
        )
      }

      if (newMintAuthority) {
        txn = txn.add(
          setAuthority(umi, {
            authorityType: AuthorityType.MintTokens,
            newAuthority: publicKey(newMintAuthority),
            owned: mint.publicKey,
            owner: umi.identity,
          })
        )
      }

      if (newFreezeAuthority) {
        txn = txn.add(
          setAuthority(umi, {
            authorityType: AuthorityType.FreezeAccount,
            newAuthority: publicKey(newMintAuthority),
            owned: mint.publicKey,
            owner: umi.identity,
          })
        )
      }

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.1 * [newFreezeAuthority, newUpdateAuthority, newMintAuthority].filter(Boolean).length),
          })
        )
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dirty = newMintAuthority || newFreezeAuthority || newUpdateAuthority

  const canUpdate = canUpdateMintAuth || canUpdateFreezeAuth || canUpdateUpdateAuth

  function toggleImmutableWarningShowing() {
    setImmutableWarningShowing(!immutableWarningShowing)
  }

  function toggleRevokeMintAuthWarningShowing() {
    setRevokeMintAuthWarningShowing(!revokeMintAuthWarningShowing)
  }

  function toggleRevokeFreezeAuthWarningShowing() {
    setRevokeFreezeAuthWarningShowing(!revokeFreezeAuthWarningShowing)
  }

  async function revokeUpdateAuthority() {
    if (!mint) {
      return
    }
    try {
      setImmutableWarningShowing(false)
      setLoading(true)

      let txn = transactionBuilder().add(
        updateV1(umi, {
          mint: mint.publicKey,
          isMutable: false,
        })
      )

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.1),
          })
        )
      }

      const revokeUaTxn = txn.sendAndConfirm(umi)

      toast.promise(revokeUaTxn, {
        loading: "Revoking update authority...",
        success: "Token metadata is now immutable!",
        error: "Error revoking update authority",
      })

      await revokeUaTxn
      await refresh()
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  async function revokeMintAuthority() {
    if (!mint) {
      return
    }
    try {
      setRevokeMintAuthWarningShowing(false)
      setLoading(true)

      let txn = transactionBuilder().add(
        setAuthority(umi, {
          authorityType: AuthorityType.MintTokens,
          newAuthority: null,
          owned: mint.publicKey,
          owner: umi.identity,
        })
      )

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.1),
          })
        )
      }

      const revokeUaTxn = txn.sendAndConfirm(umi)

      toast.promise(revokeUaTxn, {
        loading: "Revoking mint authority...",
        success: "Tokens can no longer be minted!",
        error: "Error revoking mint authority",
      })

      await revokeUaTxn
      await refresh()
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  async function revokeFreezeAuthority() {
    if (!mint) {
      return
    }
    try {
      setRevokeFreezeAuthWarningShowing(false)
      setLoading(true)

      let txn = transactionBuilder().add(
        setAuthority(umi, {
          authorityType: AuthorityType.FreezeAccount,
          newAuthority: null,
          owned: mint.publicKey,
          owner: umi.identity,
        })
      )

      if (!isAdmin) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(0.1),
          })
        )
      }

      const revokeUaTxn = txn.sendAndConfirm(umi)

      toast.promise(revokeUaTxn, {
        loading: "Revoking freeze authority",
        success: "Token accounts can no longer be frozen!",
        error: "Error revoking freeze authority",
      })

      await revokeUaTxn
      await refresh()
    } catch (err) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Authority</Typography>
      {!mint ? (
        <Alert severity="info">Enter SPL token address</Alert>
      ) : (
        !canUpdate && (
          <Alert severity="error">
            Connected wallet does not have authority to update mint, freeze or update authority
          </Alert>
        )
      )}
      <Stack direction="row" alignItems="flex-start" justifyContent="center" spacing={2}>
        <TextField
          disabled={!canUpdateMintAuth || !mint || !unwrapOption(mint.mintAuthority)}
          label={mint && unwrapOption(mint.mintAuthority) ? "Mint authority" : "Mint authority revoked"}
          value={newMintAuthority}
          placeholder={(mint && unwrapOption(mint.mintAuthority)) || ""}
          onChange={(e) => setNewMintAuthority(e.target.value)}
          helperText="Authority to mint new tokens"
          fullWidth
        />
        <Button
          color="error"
          sx={{ height: "56px" }}
          onClick={toggleRevokeMintAuthWarningShowing}
          disabled={!mint || !unwrapOption(mint.mintAuthority) || !canUpdateMintAuth}
        >
          Revoke
        </Button>
      </Stack>
      <Stack direction="row" alignItems="flex-start" justifyContent="center" spacing={2}>
        <TextField
          disabled={!canUpdateFreezeAuth || !mint || !unwrapOption(mint.freezeAuthority)}
          label={mint && unwrapOption(mint.freezeAuthority) ? "Freeze authority" : "Freeze authority revoked"}
          value={newFreezeAuthority}
          placeholder={(mint && unwrapOption(mint.freezeAuthority)) || ""}
          onChange={(e) => setNewFreezeAuthority(e.target.value)}
          helperText="Authority to freeze token accounts"
          fullWidth
        />
        <Button
          color="error"
          sx={{ height: "56px" }}
          onClick={toggleRevokeFreezeAuthWarningShowing}
          disabled={!mint || !unwrapOption(mint.freezeAuthority) || !canUpdateFreezeAuth}
        >
          Revoke
        </Button>
      </Stack>
      <Stack direction="row" alignItems="flex-start" justifyContent="center" spacing={2}>
        <TextField
          disabled={!canUpdateUpdateAuth}
          label={metadata?.isMutable ? "Update authority" : "Token metadata immutable"}
          value={newUpdateAuthority}
          placeholder={metadata?.updateAuthority || ""}
          onChange={(e) => setNewUpdateAuthority(e.target.value)}
          helperText="Authority to update token metadata"
          fullWidth
        />
        <Button
          color="error"
          sx={{ height: "56px" }}
          onClick={toggleImmutableWarningShowing}
          disabled={!metadata?.isMutable || !canUpdateUpdateAuth}
        >
          Revoke
        </Button>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="outlined" onClick={cancel} disabled={loading || !dirty}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading || !dirty}>
          Update
        </Button>
        {loading && <Spinner small />}
      </Stack>
      <Dialog open={immutableWarningShowing} onClose={() => setImmutableWarningShowing(false)}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography textTransform="uppercase" textAlign="center" variant="h5">
                Revoke Update Authority
              </Typography>
              <Alert severity="error">
                <Typography textTransform="uppercase" textAlign="center" variant="h6" lineHeight="1em">
                  This action is irreversable
                </Typography>
              </Alert>
              <Typography>
                By continuing you will make the metadata of this token immutable, meaning the Name, Symbol, Image, and
                Description cannot be changed at a later date
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Button onClick={toggleImmutableWarningShowing} size="large">
                  Cancel
                </Button>
                <Button onClick={revokeUpdateAuthority} size="large" color="error" variant="contained">
                  Make token metadata immutable
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={revokeFreezeAuthWarningShowing} onClose={() => setRevokeFreezeAuthWarningShowing(false)}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography textTransform="uppercase" textAlign="center" variant="h5">
                Revoke Freeze Authority
              </Typography>
              <Alert severity="error">
                <Typography textTransform="uppercase" textAlign="center" variant="h6" lineHeight="1em">
                  This action is irreversable
                </Typography>
              </Alert>
              <Typography>
                By continuing you are revoking freeze authority for this token, meaning you will no longer be able to
                freeze / thaw associated token accounts
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Button onClick={toggleRevokeFreezeAuthWarningShowing} size="large">
                  Cancel
                </Button>
                <Button onClick={revokeFreezeAuthority} size="large" color="error" variant="contained">
                  Revoke Freeze Authority
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
      <Dialog open={revokeMintAuthWarningShowing} onClose={() => setRevokeMintAuthWarningShowing(false)}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography textTransform="uppercase" textAlign="center" variant="h5">
                Revoke Mint Authority
              </Typography>
              <Alert severity="error">
                <Typography textTransform="uppercase" textAlign="center" variant="h6" lineHeight="1em">
                  This action is irreversable
                </Typography>
              </Alert>
              <Typography>
                By continuing you are revoking mint authority for this token, meaning no more tokens will ever be able
                to be minted, and the maximum supply will be fixed.
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <Button onClick={toggleImmutableWarningShowing} size="large">
                  Cancel
                </Button>
                <Button onClick={revokeMintAuthority} size="large" color="error" variant="contained">
                  Revoke Mint Authority
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Dialog>
    </Stack>
  )
}
