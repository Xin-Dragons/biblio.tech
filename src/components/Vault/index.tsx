import {
  Button,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { buildTransactions, getUmiChunks, notifyStatus, packTx, signAllTransactions } from "../../helpers/transactions"
import { flatten, partition, uniq } from "lodash"
import { fromWeb3JsInstruction, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import {
  Transaction,
  base58PublicKey,
  createNoopSigner,
  isSome,
  publicKey,
  sol,
  transactionBuilder,
  unwrapOption,
  unwrapOptionRecursively,
  unwrapSome,
} from "@metaplex-foundation/umi"
import {
  TokenStandard,
  delegateStandardV1,
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithTokenByMint,
  lockV1,
  revokeStandardV1,
  revokeUtilityV1,
  transferV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useMetaplex } from "../../context/metaplex"
import { useUmi } from "../../context/umi"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useTransactionStatus } from "../../context/transactions"
import { useDatabase } from "../../context/database"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { shorten, sleep, waitForWalletChange } from "../../helpers/utils"
import { PublicKey } from "@solana/web3.js"
import { Metaplex, guestIdentity } from "@metaplex-foundation/js"
import { useWalletBypass } from "../../context/wallet-bypass"
import { toast } from "react-hot-toast"
import VaultIcon from "./vault.svg"
import {
  SPL_TOKEN_PROGRAM_ID,
  closeToken,
  findAssociatedTokenPda,
  setComputeUnitLimit,
  setComputeUnitPrice,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox"
import { useAccess } from "../../context/access"
import { getFee } from "../NftTool/helpers/utils"
import { Nft } from "../../db"
import {
  ASSET_PROGRAM_ID,
  DelegateRole,
  State,
  approve,
  delegateInput,
  fetchAsset,
  lock,
  niftyAsset,
  revoke,
  unlock as unlockNifty,
} from "@nifty-oss/asset"
import {
  MPL_CORE_PROGRAM_ID,
  PluginType,
  addPluginV1,
  createPlugin,
  fetchAssetV1,
  plugin,
  pluginAuthority,
  removePluginV1,
} from "@metaplex-foundation/mpl-core"
import { usePriorityFees } from "../../context/priority-fees"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"

export const Vault: FC<{ onClose: Function }> = ({ onClose }) => {
  const [lockingWallet, setLockingWallet] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [transferTo, setTransferTo] = useState<string | null>(null)
  const { setBypassWallet } = useWalletBypass()
  const [type, setType] = useState("secure")
  const { selected } = useSelection()
  const { nfts } = useNfts()
  const metaplex = useMetaplex()
  const umi = useUmi()
  const wallet = useWallet()
  const { connection } = useConnection()
  const { user, account } = useAccess()
  const { feeLevel } = usePriorityFees()
  const { sendSignedTransactionsWithRetries } = useTransactionStatus()
  const { addNftsToVault, removeNftsFromVault, updateOwnerForNfts } = useDatabase()
  const selectedItems = nfts.filter((n) => selected.includes(n.nftMint))

  const onlyFrozenSelected = selectedItems.every((item) => item.status === "inVault")
  const onlyThawedSelected = selectedItems.every((item) => !item.status)

  async function getUnlockTx(item: Nft, transfer: boolean = false) {
    let tx = transactionBuilder()

    const pk = publicKey(item.nftMint)
    const acc = await umi.rpc.getAccount(pk)

    if (acc.exists && acc.owner === SPL_TOKEN_PROGRAM_ID) {
      const digitalAsset = await fetchDigitalAssetWithAssociatedToken(
        umi,
        publicKey(item.nftMint),
        publicKey(item.ownership.owner)
      )

      const tokenStandard = unwrapOption(digitalAsset.metadata.tokenStandard) || TokenStandard.NonFungible

      const owner = digitalAsset.token.owner
      const delegate = digitalAsset.tokenRecord
        ? unwrapOptionRecursively(digitalAsset.tokenRecord.delegate)
        : unwrapOptionRecursively(digitalAsset.token.delegate)

      if (!delegate) {
        return tx
      }

      tx = tx.add(
        unlockV1(umi, {
          mint: digitalAsset.mint.publicKey,
          tokenStandard: isSome(digitalAsset.metadata.tokenStandard) ? digitalAsset.metadata.tokenStandard.value : 0,
          authority: createNoopSigner(delegate),
          tokenOwner: owner,
        })
      )

      if (tokenStandard === TokenStandard.ProgrammableNonFungible) {
        if (!digitalAsset.tokenRecord) {
          return tx
        }

        if (!transfer) {
          tx = tx.add(
            revokeUtilityV1(umi, {
              mint: digitalAsset.mint.publicKey,
              tokenStandard: TokenStandard.ProgrammableNonFungible,
              delegate,
              tokenOwner: owner,
              authority: createNoopSigner(owner),
            })
          )
        }
      } else {
        const delegate = unwrapOption(digitalAsset.token.delegate)

        if (!delegate) {
          return tx
        }

        tx = tx.add(
          revokeStandardV1(umi, {
            mint: digitalAsset.mint.publicKey,
            tokenStandard: tokenStandard,
            delegate,
            tokenOwner: owner,
            authority: createNoopSigner(owner),
          })
        )
      }

      if (transfer) {
        tx = tx
          .add(
            transferV1(umi, {
              destinationOwner: publicKey(transferTo!),
              mint: digitalAsset.mint.publicKey,
              tokenStandard: TokenStandard.ProgrammableNonFungible,
              amount: 1,
              tokenOwner: owner,
              authority: createNoopSigner(publicKey(item.owner!)),
            })
          )
          .add(
            closeToken(umi, {
              account: findAssociatedTokenPda(umi, {
                mint: digitalAsset.publicKey,
                owner: publicKey(item.owner!),
              }),
              destination: publicKey(transferTo!),
              owner: createNoopSigner(owner),
            })
          )
      }
    } else if (acc.exists && acc.owner === ASSET_PROGRAM_ID) {
      const asset = await fetchAsset(umi, pk)

      if (asset.state !== State.Locked) {
        return tx
      }

      const delegate = asset.delegate ? asset.delegate.address || asset.owner : asset.owner

      tx = tx.add(
        unlockNifty(umi, {
          asset: asset.publicKey,
          signer: createNoopSigner(delegate),
        })
      )

      if (asset.delegate && asset.delegate.roles.includes(DelegateRole.Lock)) {
        tx = tx.add(
          revoke(umi, {
            asset: pk,
            delegateInput: delegateInput("Some", { roles: [DelegateRole.Lock] }),
            signer: createNoopSigner(asset.owner),
          })
        )
      }
    } else if (acc.exists && acc.owner === MPL_CORE_PROGRAM_ID) {
      const asset = await fetchAssetV1(umi, pk)
      if (!asset.freezeDelegate || !asset.freezeDelegate.authority.address) {
        return tx
      }
      const delegate = asset.freezeDelegate.authority.address

      tx = tx.add(
        removePluginV1(umi, {
          asset: asset.publicKey,
          pluginType: PluginType.FreezeDelegate,
          authority: createNoopSigner(delegate),
        })
      )
    }

    return tx
  }

  async function getLockTx(item: Nft) {
    let tx = transactionBuilder()

    const pk = publicKey(item.nftMint)
    const acc = await umi.rpc.getAccount(pk)

    const fee = getFee(`biblio.${type === "secure" ? "secure-lock" : "basic-lock"}`, account)

    if (acc.exists && acc.owner === SPL_TOKEN_PROGRAM_ID) {
      const digitalAsset = await fetchDigitalAssetWithTokenByMint(umi, publicKey(item.nftMint))
      const delegate = type === "basic" ? publicKey(digitalAsset.token.owner) : publicKey(lockingWallet!)

      const tokenStandard = unwrapOption(digitalAsset.metadata.tokenStandard)

      if (tokenStandard === TokenStandard.ProgrammableNonFungible) {
        if (digitalAsset.tokenRecord?.delegate) {
          const existingDelegate = unwrapOption(digitalAsset.tokenRecord?.delegate)
          if (existingDelegate) {
            tx = tx.add(
              revokeUtilityV1(umi, {
                mint: digitalAsset.publicKey,
                delegate: existingDelegate,
                tokenStandard: unwrapOption(digitalAsset.metadata.tokenStandard) || 0,
              })
            )
          }
        }
        tx = tx.add(
          delegateUtilityV1(umi, {
            mint: digitalAsset.mint.publicKey,
            tokenStandard: TokenStandard.ProgrammableNonFungible,
            delegate,
            authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
              ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                : undefined
              : undefined,
            authority: createNoopSigner(digitalAsset.token.owner),
            tokenOwner: publicKey(digitalAsset.token.owner),
            payer: createNoopSigner(delegate),
          })
        )
      } else {
        tx = tx.add(
          delegateStandardV1(umi, {
            mint: digitalAsset.mint.publicKey,
            tokenStandard: TokenStandard.ProgrammableNonFungible,
            delegate,
            authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
              ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                : undefined
              : undefined,
            authority: createNoopSigner(digitalAsset.token.owner),
            tokenOwner: publicKey(digitalAsset.token.owner),
            payer: createNoopSigner(delegate),
          })
        )
      }

      tx = tx.add(
        lockV1(umi, {
          mint: digitalAsset.mint.publicKey,
          tokenStandard: isSome(digitalAsset.metadata.tokenStandard) ? digitalAsset.metadata.tokenStandard.value : 0,
          authority: createNoopSigner(delegate),
          tokenOwner: publicKey(digitalAsset.token.owner),
          payer: createNoopSigner(delegate),
        })
      )
    } else if (acc.exists && acc.owner === ASSET_PROGRAM_ID) {
      const asset = await fetchAsset(umi, pk)
      const authority = type === "basic" ? asset.owner : publicKey(lockingWallet!)
      if (type !== "basic" && lockingWallet) {
        tx = tx.add(
          approve(umi, {
            asset: asset.publicKey,
            delegateInput: delegateInput("Some", {
              roles: [DelegateRole.Lock],
            }),
            delegate: authority,
          })
        )
      }

      tx = tx.add(
        lock(umi, {
          asset: asset.publicKey,
          signer: createNoopSigner(authority),
        })
      )
    } else if (acc.exists && acc.owner === MPL_CORE_PROGRAM_ID) {
      const asset = await fetchAssetV1(umi, pk)
      const authority = type === "basic" ? asset.owner : publicKey(lockingWallet!)
      const collection =
        asset.updateAuthority.type === "Collection" ? asset.updateAuthority.address || undefined : undefined

      tx = tx.add(
        addPluginV1(umi, {
          asset: asset.publicKey,
          plugin: createPlugin({ type: "FreezeDelegate", data: { frozen: true } }),
          initAuthority:
            type === "basic" ? pluginAuthority("Owner") : pluginAuthority("Address", { address: authority }),
          collection,
        })
      )
    }

    tx = tx.add(
      fee > 0
        ? transferSol(umi, {
            destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
            amount: sol(fee),
          })
        : transactionBuilder()
    )

    return tx
  }

  async function lockUnlock(all: boolean = false, transfer: boolean = false) {
    try {
      if (!onlyFrozenSelected && !onlyThawedSelected) {
        throw new Error("Cannot freeze and thaw in same transaction")
      }

      if (!onlyFrozenSelected && !lockingWallet && type === "secure") {
        throw new Error("Locking wallet is required")
      }

      if (transfer && !transferTo) {
        throw new Error("Select a wallet to transfer to")
      }

      if (transfer && !onlyFrozenSelected) {
        throw new Error("Can only transfer when thawing")
      }

      onClose()

      const items = all ? nfts : selectedItems

      const promise = Promise.resolve().then(async () => {
        const tx = transactionBuilder().add(
          onlyFrozenSelected
            ? await Promise.all(items.map((item) => getUnlockTx(item, transfer)))
            : await Promise.all(items.map(getLockTx))
        )

        const { chunks, txFee } = await packTx(umi, tx, feeLevel)
        console.log(chunks)
        const signers = flatten(chunks.map((ch) => ch.getSigners(umi)))

        const built = await Promise.all(chunks.map((c) => c.buildWithLatestBlockhash(umi)))
        setBypassWallet(true)

        const signed = await signAllTransactions(wallet, umi, built, signers)

        const freezeThawPromise = sendSignedTransactionsWithRetries(
          signed,
          onlyFrozenSelected ? "thaw" : "freeze",
          onlyFrozenSelected ? (transfer ? updateOwnerForNfts : removeNftsFromVault) : addNftsToVault,
          txFee ? 1 : 0
        )

        toast.promise(freezeThawPromise, {
          loading: `${onlyFrozenSelected ? (transfer ? "Recovering" : "Thawing") : "Freezing"} ${selected.length} item${
            selected.length === 1 ? "" : "s"
          }`,
          success: "Success",
          error: "Error",
        })

        const { errs, successes } = await freezeThawPromise

        notifyStatus(
          errs,
          successes,
          onlyFrozenSelected ? (transfer ? "recover" : "thaw") : "freeze",
          onlyFrozenSelected ? (transfer ? "recovered" : "thawed") : "frozen"
        )
      })

      await promise
    } catch (err: any) {
      console.log(err.logs, err)
    } finally {
      setBypassWallet(false)
    }
  }

  const canSecureLock = (user?.wallets?.length || 0) > 1
  const authorities = uniq([
    ...selectedItems.map((item) => item.delegate),
    ...selectedItems.map((item) => item.owner),
  ]).filter(Boolean)
  const owners = uniq(selectedItems.map((item) => item.owner))

  return (
    <CardContent>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={"normal"} textTransform="uppercase" textAlign="center" mb={5} mt={3}>
            {onlyFrozenSelected ? "Remove items from" : "Add items to"} The Vault
          </Typography>
          <Typography>
            {onlyFrozenSelected ? (
              <span>
                Removing{" "}
                <strong>
                  {selected.length} item{selected.length === 1 ? "" : "s"}
                </strong>{" "}
                from The Vault.
              </span>
            ) : (
              <span>
                Adding{" "}
                <strong>
                  {selected.length} item{selected.length === 1 ? "" : "s"}
                </strong>{" "}
                to The Vault.
              </span>
            )}
          </Typography>
          {onlyFrozenSelected ? (
            <Stack spacing={1} sx={{ marginBottom: "5em !important" }}>
              <Typography variant="body2">Authorities needed to unlock:</Typography>
              {authorities.map((auth, index) => (
                <TextField key={index} value={shorten(auth!)} disabled />
              ))}
            </Stack>
          ) : (
            <Stack spacing={4}>
              <Typography variant="body2">
                If you have more than one wallet linked, you can choose to defer freeze authority to any of these
                wallets. This method of locking is much more secure as if anyone were to obtain your private key, they
                would still be unable to unfreeze your items unless they had also obtained access to the wallet used to
                freeze.
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant={type === "basic" ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => setType("basic")}
                >
                  <Typography>Basic freeze</Typography>
                </Button>
                <Button
                  variant={type === "secure" ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => setType("secure")}
                  sx={{ fontSize: "1.25em" }}
                  disabled={user?.wallets?.length <= 1}
                >
                  <Stack>
                    <Typography variant="body1">Secure freeze</Typography>
                    <Typography textTransform="none" variant="body2" sx={{ color: "#faaf00 !important" }}>
                      (recommended)
                    </Typography>
                  </Stack>
                </Button>
              </Stack>
              {type === "secure" ? (
                <>
                  <FormControl disabled={!canSecureLock}>
                    <InputLabel id="demo-simple-select-label">Select wallet for secure freeze</InputLabel>
                    <Select
                      value={lockingWallet}
                      label={"Select wallet for secure freeze"}
                      onChange={(e) => setLockingWallet(e.target.value)}
                    >
                      {user.wallets
                        ?.filter((w: any) => {
                          return !owners.includes(w.public_key)
                        })
                        .filter((w: any) => w.chain === "solana")
                        .map((w: any, index: number) => (
                          <MenuItem key={index} value={w.public_key}>
                            {shorten(w.public_key)}
                          </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>
                      Choose a wallet to defer freeze authority to. This must be a wallet you own.
                    </FormHelperText>
                  </FormControl>
                </>
              ) : (
                <TextField
                  label="Freeze auth retained by"
                  value={shorten(owners[0]!)}
                  disabled
                  helperText="The owner wallet will retain freeze authority"
                />
              )}
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Button color="error" variant="outlined" onClick={() => onClose()} size="large" fullWidth>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => lockUnlock()}
              disabled={loading || (!onlyFrozenSelected && !lockingWallet && type === "secure")}
              size="large"
              fullWidth
            >
              <Stack direction="row" spacing={0.5}>
                <Typography>
                  {onlyFrozenSelected ? "Thaw" : "Freeze"} item{selected.length === 1 ? "" : "s"}
                </Typography>
                <SvgIcon>
                  <VaultIcon />
                </SvgIcon>
              </Stack>
            </Button>
          </Stack>
          {onlyFrozenSelected && (
            <Stack spacing={2}>
              <Typography variant="h6">Recover items</Typography>
              <Typography variant="body2">
                In the event of your wallet being compromised, you can use &quot;Recover&quot; to unlock AND send your
                assets to a safe place in a single transaction.
              </Typography>
              <Typography variant="body2">
                This means the hacker wont be able to steal the items when you unfreeze them.
              </Typography>
              <FormControl disabled={!canSecureLock}>
                <InputLabel id="demo-simple-select-label">Select a secure wallet</InputLabel>
                <Select
                  value={transferTo}
                  label={"Select a secure wallet"}
                  onChange={(e) => setTransferTo(e.target.value)}
                >
                  {user.wallets?.map((w: any, index: number) => (
                    <MenuItem key={index} value={w.public_key}>
                      {shorten(w.public_key)}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Choose a secure wallet to send your assets to. This must be linked in Biblio.
                </FormHelperText>
              </FormControl>
              <Button color="secondary" variant="contained" size="large" onClick={() => lockUnlock(false, true)}>
                Recover
              </Button>
            </Stack>
          )}
        </Stack>
      </Container>
    </CardContent>
  )
}
