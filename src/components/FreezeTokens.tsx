import { Stack, Typography, TextField, RadioGroup, FormControlLabel, Radio, Button, Alert } from "@mui/material"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import Spinner from "./Spinner"
import { publicKey, sol, transactionBuilder, unwrapOption } from "@metaplex-foundation/umi"
import {
  Mint,
  TokenState,
  fetchAllTokenByOwnerAndMint,
  findAssociatedTokenPda,
  freezeToken,
  thawToken,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox"
import { useUmi } from "../context/umi"
import { FEES_WALLET } from "../constants"
import { noop } from "lodash"
import { getFee } from "./NftTool/helpers/utils"
import { useAccess } from "../context/access"
import { usePriorityFees } from "../context/priority-fees"
import { packTx, sendAllTxsWithRetries } from "../helpers/transactions"

export const FreezeTokens = ({ mint, onComplete = noop }: { mint: Mint | null; onComplete: Function }) => {
  const { feeLevel } = usePriorityFees()
  const { connection } = useConnection()
  const [type, setType] = useState("freeze")
  const [owner, setOwner] = useState("")
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const umi = useUmi()
  const { account } = useAccess()

  const wallet = useWallet()

  useEffect(() => {
    if (owner) {
      try {
        const pk = publicKey(owner)
        setOwnerError(null)
      } catch {
        setOwnerError("Invalid owner public key")
      }
    } else {
      setOwnerError(null)
    }
  }, [owner])

  function cancel() {
    setType("freeze")
    setOwner("")
  }

  async function checkStatus() {
    if (!mint) {
      return
    }
    try {
      setLoading(true)
      let addressToCheck = umi.identity.publicKey
      if (owner) {
        addressToCheck = publicKey(owner)
      }

      const allTokens = await fetchAllTokenByOwnerAndMint(umi, addressToCheck, mint.publicKey)
      const state = allTokens[0]?.state

      const isFrozen = state === TokenState.Frozen

      setType(isFrozen ? "thaw" : "freeze")
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [owner, wallet.publicKey, mint])

  async function submit() {
    try {
      if (!mint) {
        return
      }
      setLoading(true)
      let txn = transactionBuilder()
      if (type === "freeze") {
        txn = txn.add(
          freezeToken(umi, {
            owner: umi.identity,
            mint: mint.publicKey,
            account: findAssociatedTokenPda(umi, {
              owner: owner ? publicKey(owner) : umi.identity.publicKey,
              mint: mint.publicKey,
            }),
          })
        )
      } else {
        txn = txn.add(
          thawToken(umi, {
            owner: umi.identity,
            mint: mint.publicKey,
            account: findAssociatedTokenPda(umi, {
              owner: owner ? publicKey(owner) : umi.identity.publicKey,
              mint: mint.publicKey,
            }),
          })
        )
      }

      const fee = getFee("token-tool.update", account)

      if (fee > 0) {
        txn = txn.add(
          transferSol(umi, {
            destination: FEES_WALLET,
            amount: sol(fee),
          })
        )
      }

      const { chunks, txFee } = await packTx(umi, txn, feeLevel)
      const signed = await Promise.all(chunks.map((c) => c.buildAndSign(umi)))
      const freezeTxn = sendAllTxsWithRetries(umi, connection, signed, txFee ? 1 : 0)

      toast.promise(freezeTxn, {
        loading: `${type === "freeze" ? "Freezing" : "Thawing"} token account`,
        success: `Token account ${type === "freeze" ? "frozen" : "thawed"} successfully`,
        error: `Error ${type === "freeze" ? "freezing" : "thawing"} token account`,
      })

      await freezeTxn
      await checkStatus()
      onComplete()
    } catch (err: any) {
      console.log(err)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canFreeze = mint && unwrapOption(mint.freezeAuthority) === umi.identity.publicKey

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Freeze / Thaw</Typography>
      {!mint ? (
        <Alert severity="info">Enter SPL token address</Alert>
      ) : (
        !canFreeze && <Alert severity="error">Connected wallet does not have authority to freeze/thaw tokens</Alert>
      )}

      <TextField
        disabled={loading || !canFreeze}
        label="Owner addresss"
        value={owner}
        error={!!ownerError}
        onChange={(e) => setOwner(e.target.value)}
        helperText={ownerError || "Leave blank if you are freezing/thawing your own token account"}
      />
      <RadioGroup row value={type} onChange={(e) => setType(e.target.value)}>
        <FormControlLabel value="freeze" control={<Radio disabled={loading || !canFreeze} />} label="Freeze" />
        <FormControlLabel value="thaw" control={<Radio disabled={loading || !canFreeze} />} label="Thaw" />
      </RadioGroup>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <Button variant="outlined" onClick={cancel} disabled={!canFreeze || loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!canFreeze || loading}>
          {type === "freeze" ? "Freeze" : "Thaw"}
        </Button>
        {loading && <Spinner small />}
      </Stack>
    </Stack>
  )
}
