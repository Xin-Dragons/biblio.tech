import {
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  SvgIcon,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { buildTransactions, getUmiChunks, notifyStatus } from "../../helpers/transactions"
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
  unwrapSome,
} from "@metaplex-foundation/umi"
import {
  delegateUtilityV1,
  fetchDigitalAsset,
  fetchDigitalAssetWithAssociatedToken,
  fetchDigitalAssetWithToken,
  fetchDigitalAssetWithTokenByMint,
  lockV1,
  revokeUtilityV1,
  transferV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useMetaplex } from "../../context/metaplex"
import { useUmi } from "../../context/umi"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useTransactionStatus } from "../../context/transactions"
import { useSelection } from "../../context/selection"
import { useSession } from "next-auth/react"
import { shorten, sleep, waitForWalletChange } from "../../helpers/utils"
import { PublicKey } from "@solana/web3.js"
import { Metaplex, guestIdentity } from "@metaplex-foundation/js"
import { useWalletBypass } from "../../context/wallet-bypass"
import { toast } from "react-hot-toast"
import VaultIcon from "./vault.svg"
import { closeToken, findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { useAccess } from "../../context/access"
import { DigitalAsset, Status } from "@/app/models/DigitalAsset"
import { useOwnedAssets } from "@/context/owned-assets"
import { AccessLevel, FEES } from "@/constants"

export function Vault({ small }: { small?: boolean }) {
  const [vaultShowing, setVaultShowing] = useState(false)
  const [lockingWallet, setLockingWallet] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [transferTo, setTransferTo] = useState<string | null>(null)
  const { accessLevel } = useAccess()
  const { digitalAssets } = useOwnedAssets()
  const { setBypassWallet } = useWalletBypass()
  const [type, setType] = useState("secure")
  const { selected, setSelected } = useSelection()
  const wallets = []

  const metaplex = useMetaplex()
  const umi = useUmi()
  const wallet = useWallet()
  const { connection } = useConnection()
  const { data: session } = useSession()
  const { sendSignedTransactions } = useTransactionStatus()

  function toggleVaultShowing() {
    setVaultShowing(!vaultShowing)
  }

  const selectedItems = digitalAssets.filter((da) => selected.includes(da.id))

  const onlyNonFungiblesSelected = selectedItems.every((item) => item.isNonFungible)
  const nonInVaultStatusesSelected = selectedItems.some((item) => !["NONE", "SECURED"].includes(item.status as Status))
  const allInVault = selectedItems.every((item) => item.status === "SECURED")
  const noneInVault = selectedItems.every((item) => item.status === "NONE")
  const frozenSelected = selectedItems.some((item) => item.status === "SECURED")
  const thawedSelected = selectedItems.some((item) => item.status === "NONE")

  const canFreezeThaw = allInVault || noneInVault

  async function signAllTransactions(txns: Transaction[], signers: string[]) {
    return signers.reduce(async (promise, signer, index) => {
      return promise.then(async (transactions) => {
        if (wallet.publicKey?.toBase58() === signer) {
          const signedPromise = umi.identity.signAllTransactions(transactions)
          toast.promise(signedPromise, {
            loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
            success: "Signed",
            error: "Error signing",
          })
          const signed = await signedPromise
          return signed
        } else {
          const walletChangePromise = waitForWalletChange(signer)
          toast.promise(walletChangePromise, {
            loading: `Waiting for wallet change: ${shorten(signer)}`,
            success: "Wallet changed",
            error: "Error waiting for wallet change",
          })
          await walletChangePromise
          const signedPromise = umi.identity.signAllTransactions(transactions)
          toast.promise(signedPromise, {
            loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
            success: "Signed",
            error: "Error signing",
          })
          const signed = await signedPromise

          return signed
        }
      })
    }, Promise.resolve(txns))
  }

  async function lockUnlock(all: boolean = false, transfer: boolean = false) {
    try {
      if (frozenSelected && thawedSelected) {
        throw new Error("Cannot freeze and thaw in same transaction")
      }

      if (thawedSelected && !lockingWallet && type === "secure") {
        throw new Error("Locking wallet is required")
      }

      if (transfer && !transferTo) {
        throw new Error("Select a wallet to transfer to")
      }

      if (transfer && !frozenSelected) {
        throw new Error("Can only transfer when thawing")
      }

      setVaultShowing(false)

      const items = all ? digitalAssets : selectedItems

      console.log(items)

      const instructionGroups = allInVault
        ? await Promise.all(
            items.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAssetWithAssociatedToken(
                umi,
                publicKey(nft.id),
                umi.identity.publicKey
              )
              let txn = transactionBuilder()
              if (unwrapOption(digitalAsset.metadata.tokenStandard) === 4) {
                txn = txn.add(
                  unlockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    authority: createNoopSigner(publicKey(nft.delegate)),
                    tokenOwner: publicKey(nft.owner),
                  })
                )

                if (!transfer) {
                  txn = txn.add(
                    revokeUtilityV1(umi, {
                      mint: digitalAsset.mint.publicKey,
                      tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                        ? digitalAsset.metadata.tokenStandard.value
                        : 0,
                      delegate: publicKey(nft.delegate),
                      tokenOwner: publicKey(nft.owner),
                      authority: createNoopSigner(publicKey(nft.owner)),
                    })
                  )
                }

                if (transfer) {
                  txn = txn
                    .add(
                      transferV1(umi, {
                        destinationOwner: publicKey(transferTo!),
                        mint: digitalAsset.mint.publicKey,
                        tokenStandard: unwrapOption(digitalAsset.metadata.tokenStandard) || 0,
                        amount: 1,
                        tokenOwner: publicKey(nft.owner),
                        authority: createNoopSigner(publicKey(nft.owner)),
                      })
                    )
                    .add(
                      closeToken(umi, {
                        account: findAssociatedTokenPda(umi, {
                          mint: digitalAsset.mint.publicKey,
                          owner: publicKey(nft.owner),
                        }),
                        destination: publicKey(transferTo!),
                        owner: createNoopSigner(publicKey(nft.owner)),
                      })
                    )
                    .add(
                      delegateUtilityV1(umi, {
                        mint: digitalAsset.mint.publicKey,
                        tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                          ? digitalAsset.metadata.tokenStandard.value
                          : 0,
                        delegate: publicKey(nft.delegate),
                        authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                          ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                            ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                            : undefined
                          : undefined,
                        authority: createNoopSigner(publicKey(transferTo!)),
                        tokenOwner: publicKey(transferTo!),
                        payer: umi.identity,
                      })
                    )
                    .add(
                      lockV1(umi, {
                        mint: digitalAsset.mint.publicKey,
                        tokenStandard: unwrapSome(digitalAsset.metadata.tokenStandard) || 0,
                        authority: createNoopSigner(publicKey(nft.delegate)),
                        tokenOwner: publicKey(transferTo!),
                        payer: umi.identity,
                      })
                    )
                }
              } else {
                const delegate =
                  nft.delegate ||
                  (digitalAsset.tokenRecord
                    ? unwrapOption(digitalAsset.tokenRecord?.delegate!)
                    : unwrapOption(digitalAsset.token.delegate))

                if (!delegate) {
                  throw new Error("Error looking up delegate")
                }
                const identity = Metaplex.make(connection)
                  .use(guestIdentity(new PublicKey(delegate)))
                  .identity()

                txn = txn.add(
                  metaplex
                    .nfts()
                    .builders()
                    .thawDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: identity,
                      tokenOwner: new PublicKey(nft.owner),
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createNoopSigner(publicKey(delegate))],
                      })
                    })
                )

                if (transfer) {
                  txn = txn
                    .add(
                      transferV1(umi, {
                        destinationOwner: publicKey(transferTo!),
                        mint: digitalAsset.mint.publicKey,
                        tokenStandard: unwrapOption(digitalAsset.metadata.tokenStandard) || 0,
                        amount: 1,
                        tokenOwner: publicKey(nft.owner),
                        authority: createNoopSigner(publicKey(nft.owner)),
                      })
                    )
                    .add(
                      closeToken(umi, {
                        account: findAssociatedTokenPda(umi, {
                          mint: digitalAsset.mint.publicKey,
                          owner: publicKey(nft.owner),
                        }),
                        destination: publicKey(transferTo!),
                        owner: createNoopSigner(publicKey(nft.owner)),
                      })
                    )
                    .add(
                      metaplex
                        .tokens()
                        .builders()
                        .approveDelegateAuthority({
                          mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                          delegateAuthority: new PublicKey(nft.delegate),
                          owner: new PublicKey(transferTo!),
                        })
                        .getInstructions()
                        .map((instruction) => {
                          return transactionBuilder().add({
                            instruction: fromWeb3JsInstruction(instruction),
                            bytesCreatedOnChain: 0,
                            signers: [
                              createNoopSigner(publicKey(nft.delegate)),
                              createNoopSigner(publicKey(transferTo!)),
                            ],
                          })
                        })
                    )

                  // const identity = Metaplex.make(connection)
                  //   .use(guestIdentity(new PublicKey(nft.delegate)))
                  //   .identity()

                  // instructions.push(
                  //   metaplex
                  //     .nfts()
                  //     .builders()
                  //     .freezeDelegatedNft({
                  //       mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                  //       delegateAuthority: identity,
                  //       tokenOwner: new PublicKey(nft.owner),
                  //     })
                  //     .getInstructions()
                  //     .map((instruction) => {
                  //       return transactionBuilder().add({
                  //         instruction: fromWeb3JsInstruction(instruction),
                  //         bytesCreatedOnChain: 0,
                  //         signers: [createNoopSigner(publicKey(nft.delegate))],
                  //       })
                  //     })
                  // )
                } else {
                  txn = txn.add(
                    metaplex
                      .tokens()
                      .builders()
                      .revokeDelegateAuthority({
                        mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                        owner: new PublicKey(nft.owner),
                      })
                      .getInstructions()
                      .map((instruction) => {
                        return transactionBuilder().add({
                          instruction: fromWeb3JsInstruction(instruction),
                          bytesCreatedOnChain: 0,
                          signers: [createNoopSigner(publicKey(nft.owner))],
                        })
                      })
                  )
                }
              }
              return {
                instructions: txn,
                mint: nft.id,
              }
            })
          )
        : await Promise.all(
            items.map(async (nft: any) => {
              const delegate = type === "basic" ? publicKey(nft.owner) : publicKey(lockingWallet!)
              const digitalAsset = await fetchDigitalAssetWithTokenByMint(umi, publicKey(nft.id))
              let txn = transactionBuilder()
              if (unwrapOption(digitalAsset.metadata.tokenStandard) === 4) {
                if (digitalAsset.tokenRecord?.delegate) {
                  const delegate = unwrapOption(digitalAsset.tokenRecord?.delegate)
                  if (delegate) {
                    txn = txn.add(
                      revokeUtilityV1(umi, {
                        mint: digitalAsset.publicKey,
                        delegate: delegate,
                        tokenStandard: unwrapOption(digitalAsset.metadata.tokenStandard) || 0,
                      })
                    )
                  }
                }
                txn = txn
                  .add(
                    delegateUtilityV1(umi, {
                      mint: digitalAsset.mint.publicKey,
                      tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                        ? digitalAsset.metadata.tokenStandard.value
                        : 0,
                      delegate,
                      authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                        ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                          ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                          : undefined
                        : undefined,
                      authority: createNoopSigner(publicKey(nft.owner)),
                      tokenOwner: publicKey(nft.owner),
                      payer: createNoopSigner(delegate),
                    })
                  )
                  .add(
                    lockV1(umi, {
                      mint: digitalAsset.mint.publicKey,
                      tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                        ? digitalAsset.metadata.tokenStandard.value
                        : 0,
                      authority: createNoopSigner(delegate),
                      tokenOwner: publicKey(nft.owner),
                      payer: createNoopSigner(delegate),
                    })
                  )
              } else {
                const identity = Metaplex.make(connection)
                  .use(guestIdentity(toWeb3JsPublicKey(delegate)))
                  .identity()
                txn = txn
                  .add(
                    metaplex
                      .tokens()
                      .builders()
                      .approveDelegateAuthority({
                        mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                        delegateAuthority: toWeb3JsPublicKey(delegate),
                        owner: new PublicKey(nft.owner),
                      })
                      .getInstructions()
                      .map((instruction) => {
                        return transactionBuilder().add({
                          instruction: fromWeb3JsInstruction(instruction),
                          bytesCreatedOnChain: 0,
                          signers: [createNoopSigner(delegate), createNoopSigner(publicKey(nft.owner))],
                        })
                      })
                  )
                  .add(
                    metaplex
                      .nfts()
                      .builders()
                      .freezeDelegatedNft({
                        mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                        delegateAuthority: identity,
                        tokenOwner: new PublicKey(nft.owner),
                      })
                      .getInstructions()
                      .map((instruction) => {
                        return transactionBuilder().add({
                          instruction: fromWeb3JsInstruction(instruction),
                          bytesCreatedOnChain: 0,
                          signers: [createNoopSigner(delegate)],
                        })
                      })
                  )
              }

              if (accessLevel !== AccessLevel.UNLIMITED) {
                const fee = type === "secure" ? FEES.SECURE_LOCK[accessLevel] : FEES.LOCK[accessLevel]
                txn = txn.add(
                  transferSol(umi, {
                    destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                    amount: fee,
                  })
                )
              }

              return {
                instructions: txn,
                mint: nft.id,
              }
            })
          )

      const chunks = getUmiChunks(umi, instructionGroups)
      const txns = await buildTransactions(umi, chunks)

      setBypassWallet(true)
      const signers = txns[0].signers
        .map((signer) => base58PublicKey(signer.publicKey))
        .sort((item: string) => (item === wallet.publicKey?.toBase58() ? -1 : 1))

      const signedTransactions = await signAllTransactions(
        txns.map((t) => t.txn),
        signers
      )

      const freezeThawPromise = sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        allInVault ? "thaw" : "freeze",
        async (mints: string[]) => {
          return Promise.all(
            digitalAssets
              .filter((da) => mints.includes(da.id))
              .map((da) => {
                if (allInVault) {
                  if (transfer) {
                    return da.recovered(transferTo!)
                  } else {
                    return da.unsecured()
                  }
                } else {
                  return da.secured()
                }
              })
          )
        }
        // allInVault ? (transfer ? updateOwnerForNfts : removeNftsFromVault) : addNftsToVault
      )

      toast.promise(freezeThawPromise, {
        loading: `${allInVault ? (transfer ? "Recovering" : "Thawing") : "Freezing"} ${selected.length} item${
          selected.length === 1 ? "" : "s"
        }`,
        success: "Success",
        error: "Error",
      })

      const { errs, successes } = await freezeThawPromise

      notifyStatus(
        errs,
        successes,
        allInVault ? (transfer ? "recover" : "thaw") : "freeze",
        allInVault ? (transfer ? "recovered" : "thawed") : "frozen"
      )
    } catch (err) {
      console.log(err)
    } finally {
      setSelected([])
      setBypassWallet(false)
    }
  }

  const canSecureLock = (wallets?.length || 0) > 1
  const authorities = uniq([
    ...selectedItems.map((item) => item.ownership?.delegate),
    ...selectedItems.map((item) => item.owner),
  ]).filter(Boolean)
  const owners = uniq(selectedItems.map((item) => item.owner))

  return (
    <>
      {small ? (
        <Button
          disabled={!selected.length || !canFreezeThaw || !onlyNonFungiblesSelected}
          onClick={() => toggleVaultShowing()}
          fullWidth
          variant="contained"
          size="large"
        >
          <Stack direction="row" spacing={1}>
            <SvgIcon>
              <VaultIcon />
            </SvgIcon>
            <Typography>{frozenSelected ? "Remove from vault" : "Add to vault"}</Typography>
          </Stack>
        </Button>
      ) : (
        <Tooltip
          title={
            nonInVaultStatusesSelected
              ? "Selection contains items that cannot be frozen/thawed"
              : // : !hasFreezeAuth
              // ? "Some items cannot be frozen"
              onlyNonFungiblesSelected
              ? canFreezeThaw
                ? frozenSelected
                  ? "Remove selected items from vault"
                  : "Add selected items to vault"
                : "Cannot freeze and thaw in same transaction"
              : "Only NFTs and pNFTs can be locked in the vault"
          }
        >
          <span>
            <Button
              disabled={
                !selected.length || !canFreezeThaw || !onlyNonFungiblesSelected || nonInVaultStatusesSelected
                // || !hasFreezeAuth
              }
              sx={{
                color: "#a6e3e0",
              }}
              variant="outlined"
              onClick={() => toggleVaultShowing()}
            >
              <Stack direction="row">
                <SvgIcon>
                  <VaultIcon />
                </SvgIcon>
                <Typography>Vault</Typography>
              </Stack>
            </Button>
          </span>
        </Tooltip>
      )}
      <Dialog open={vaultShowing} onClose={toggleVaultShowing} fullWidth maxWidth="md">
        <Card sx={{ overflowY: "auto" }}>
          <CardContent>
            <Container maxWidth="sm">
              <Stack spacing={2}>
                <Typography
                  variant="h4"
                  fontWeight={"normal"}
                  textTransform="uppercase"
                  textAlign="center"
                  mb={5}
                  mt={3}
                >
                  {allInVault ? "Remove items from" : "Add items to"} The Vault
                </Typography>
                <Typography>
                  {allInVault ? (
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
                {allInVault ? (
                  <Stack spacing={1} sx={{ marginBottom: "5em !important" }}>
                    <Typography variant="body2">Authorities needed to unlock:</Typography>
                    {authorities.map((auth, index) => (
                      <TextField key={index} value={shorten(auth as string)} disabled />
                    ))}
                  </Stack>
                ) : (
                  <Stack spacing={4}>
                    <Typography variant="body2">
                      If you have more than one wallet linked, you can choose to defer freeze authority to any of these
                      wallets. This method of locking is much more secure as if anyone were to obtain your private key,
                      they would still be unable to unfreeze your items unless they had also obtained access to the
                      wallet used to freeze.
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
                        // disabled={!isAdmin}
                      >
                        <Stack>
                          <Typography variant="body1">Secure freeze</Typography>
                          <Typography textTransform="none" variant="body2">
                            Multisig locking
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
                            {wallets
                              ?.filter((w) => {
                                return !owners.includes(w.publicKey)
                              })
                              .map((w, index) => (
                                <MenuItem key={index} value={w.publicKey}>
                                  {shorten(w.publicKey!)}
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
                        value={shorten(owners[0] as string)}
                        disabled
                        helperText="The owner wallet will retain freeze authority"
                      />
                    )}
                  </Stack>
                )}

                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => setVaultShowing(false)}
                    size="large"
                    fullWidth
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => lockUnlock()}
                    disabled={loading || (!allInVault && !lockingWallet && type === "secure")}
                    size="large"
                    fullWidth
                  >
                    <Stack direction="row" spacing={0.5}>
                      <Typography>
                        {allInVault ? "Thaw" : "Freeze"} item{selected.length === 1 ? "" : "s"}
                      </Typography>
                      <SvgIcon>
                        <VaultIcon />
                      </SvgIcon>
                    </Stack>
                  </Button>
                </Stack>
                {allInVault && (
                  <Stack spacing={2}>
                    <Typography variant="h6">Recover items</Typography>
                    <Typography variant="body2">
                      In the event of your wallet being compromised, you can use &quot;Recover&quot; to unlock AND send
                      your assets to a safe place in a single transaction.
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
                        {wallets?.map((w, index) => (
                          <MenuItem key={index} value={w.publicKey}>
                            {shorten(w.publicKey!)}
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
        </Card>
      </Dialog>
    </>
  )
}
