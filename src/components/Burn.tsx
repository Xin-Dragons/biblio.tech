// import { useAccess } from "@/context/access"
import { AccessLevel, FEES } from "@/constants"
import { useAccess } from "@/context/access"
import { useMetaplex } from "@/context/metaplex"
import { useOwnedAssets } from "@/context/owned-assets"
import { useSelection } from "@/context/selection"
import { useTransactionStatus } from "@/context/transactions"
import { useUmi } from "@/context/umi"
import { buildTransactions, getUmiChunks, notifyStatus } from "@/helpers/transactions"
import { getFirstSigForAddress } from "@/helpers/utils"
import { toBigNumber } from "@metaplex-foundation/js"
import {
  DigitalAsset,
  DigitalAssetWithToken,
  TokenStandard,
  burnV1,
  fetchAllDigitalAsset,
  fetchDigitalAssetWithTokenByMint,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata"
import { fetchToken, findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { PublicKey, isSome, publicKey, sol, unwrapOption } from "@metaplex-foundation/umi"
import { fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import { ConnectWithoutContactOutlined, LocalFireDepartment } from "@mui/icons-material"
import {
  Alert,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { Connection } from "@solana/web3.js"
import { useState } from "react"
import { toast } from "react-hot-toast"

export function Burn({ small }: { small?: boolean }) {
  const [burnOpen, setBurnOpen] = useState(false)
  const { digitalAssets } = useOwnedAssets()
  const { selected, setSelected } = useSelection()
  const { sendSignedTransactions } = useTransactionStatus()
  const metaplex = useMetaplex()
  const umi = useUmi()
  const { accessLevel } = useAccess()

  function toggleBurnOpen() {
    setBurnOpen(!burnOpen)
  }

  const selectedItems = selected.map((id) => digitalAssets.find((da) => da.id === id)).filter(Boolean)
  const canBurnItems = selectedItems.every((item) => item!.status === "NONE")

  const disabled = !selected.length || !canBurnItems

  async function burn() {
    try {
      toggleBurnOpen()
      if (!canBurnItems) {
        throw new Error("Some selected items cannot be burned")
      }
      const toBurn = await fetchAllDigitalAsset(
        umi,
        selected.map((item) => publicKey(item))
      )
      const builders = await Promise.all(
        toBurn.map(async (digitalAsset: DigitalAsset) => {
          const tokenStandard = unwrapOption(digitalAsset.metadata.tokenStandard)
          let masterEditionMint: PublicKey | undefined = undefined
          let masterEditionToken
          const isEdition =
            unwrapOption(digitalAsset.metadata.tokenStandard) === TokenStandard.NonFungibleEdition &&
            !digitalAsset.edition?.isOriginal
          if (isEdition) {
            const connection = new Connection(process.env.NEXT_PUBLIC_TXN_RPC_HOST!, { commitment: "confirmed" })
            const sig = await getFirstSigForAddress(
              connection,
              toWeb3JsPublicKey(
                !digitalAsset.edition?.isOriginal ? digitalAsset.edition?.parent! : digitalAsset.edition.publicKey
              )
            )

            const txn = await connection.getTransaction(sig.signature)
            const key = txn?.transaction.message.accountKeys[1]!
            console.log(digitalAsset)
            const masterEditionDigitalAsset = await fetchDigitalAssetWithTokenByMint(umi, fromWeb3JsPublicKey(key))
            masterEditionMint = masterEditionDigitalAsset.mint.publicKey
            masterEditionToken = masterEditionDigitalAsset.token.publicKey
          }
          let amount = BigInt(1)
          if ([TokenStandard.Fungible, TokenStandard.FungibleAsset].includes(tokenStandard || 0)) {
            const ata = findAssociatedTokenPda(umi, {
              mint: digitalAsset.mint.publicKey,
              owner: umi.identity.publicKey,
            })
            const token = await fetchToken(umi, ata)
            amount = token.amount
          }
          let digitalAssetWithToken: DigitalAssetWithToken | undefined = undefined
          const isNonFungible = [0, 3, 4, 5].includes(unwrapOption(digitalAsset.metadata.tokenStandard) || 0)
          if (isNonFungible) {
            digitalAssetWithToken = await fetchDigitalAssetWithTokenByMint(umi, digitalAsset.mint.publicKey)
          }
          let burnInstruction = burnV1(umi, {
            mint: digitalAsset.mint.publicKey,
            authority: umi.identity,
            tokenOwner: umi.identity.publicKey,
            tokenStandard: isSome(digitalAsset.metadata.tokenStandard) ? digitalAsset.metadata.tokenStandard.value : 0,
            metadata: digitalAsset.metadata.publicKey,
            collectionMetadata: isSome(digitalAsset.metadata.collection)
              ? findMetadataPda(umi, { mint: digitalAsset.metadata.collection.value.key })
              : undefined,
            edition: isEdition ? digitalAsset.edition?.publicKey : undefined,
            token: isNonFungible ? digitalAssetWithToken?.token?.publicKey : undefined,
            tokenRecord: isNonFungible ? digitalAssetWithToken?.tokenRecord?.publicKey : undefined,
            masterEdition: isEdition
              ? digitalAsset.edition?.isOriginal
                ? digitalAsset.edition.publicKey
                : digitalAsset.edition?.parent
              : undefined,
            masterEditionMint,
            masterEditionToken,
            amount,
            editionMarker:
              isEdition && masterEditionMint
                ? fromWeb3JsPublicKey(
                    metaplex
                      .nfts()
                      .pdas()
                      .editionMarker({
                        mint: toWeb3JsPublicKey(masterEditionMint!),
                        edition: !digitalAsset.edition?.isOriginal
                          ? toBigNumber(digitalAsset.edition?.edition.toString()!)
                          : toBigNumber(0),
                      })
                  )
                : undefined,
          })
          if (accessLevel !== AccessLevel.UNLIMITED) {
            const fee = [
              TokenStandard.NonFungible,
              TokenStandard.NonFungibleEdition,
              TokenStandard.ProgrammableNonFungible,
            ].includes(tokenStandard || 0)
              ? FEES.BURN[accessLevel]
              : FEES.BURN_FUNGIBLE[accessLevel]

            burnInstruction = burnInstruction.add(
              transferSol(umi, {
                destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                amount: fee,
              })
            )
          }
          return {
            instructions: burnInstruction,
            mint: digitalAsset.publicKey,
          }
        })
      )
      setBurnOpen(false)
      const chunks = getUmiChunks(umi, builders as any)
      const txns = await buildTransactions(umi, chunks)
      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))
      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        "burn",
        async (ids: string[]) => digitalAssets.filter((da) => ids.includes(da.id)).map((da) => da.delete())
      )
      notifyStatus(errs, successes, "burn", "burned")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message)
    } finally {
    }
  }

  function cancelBurn() {
    setSelected([])
    toggleBurnOpen()
  }

  return (
    <>
      {small ? (
        <Button disabled={disabled} color="error" onClick={toggleBurnOpen} fullWidth variant="contained" size="large">
          <Stack direction="row" spacing={1}>
            <LocalFireDepartment />
            <Typography>Burn selected</Typography>
          </Stack>
        </Button>
      ) : (
        <Tooltip
          title={
            canBurnItems
              ? "Burn selected items"
              : selected.length
              ? "Cannot burn some selected items"
              : "No items selected"
          }
        >
          <span>
            <Button disabled={disabled} color="error" onClick={toggleBurnOpen} variant="outlined">
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalFireDepartment />
                <Typography textTransform="uppercase">Burn</Typography>
              </Stack>
            </Button>
          </span>
        </Tooltip>
      )}
      <Dialog open={burnOpen} onClose={toggleBurnOpen}>
        <Card>
          <DialogTitle>
            Burn {selected.length} item{selected.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogContent>
            <Alert severity="error">
              Burned items cannot be recovered. Please be sure you have selected the correct items!
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelBurn} color="error">
              Cancel
            </Button>
            <Button onClick={burn} variant="contained" disabled={!selected.length}>
              Burn
            </Button>
          </DialogActions>
        </Card>
      </Dialog>
    </>
  )
}
