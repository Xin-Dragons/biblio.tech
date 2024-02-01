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
import { buildTransactions, getUmiChunks, notifyStatus, signAllTransactions } from "../../helpers/transactions"
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
import { useDatabase } from "../../context/database"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { shorten, sleep, waitForWalletChange } from "../../helpers/utils"
import { PublicKey } from "@solana/web3.js"
import { Metaplex, guestIdentity } from "@metaplex-foundation/js"
import { useWalletBypass } from "../../context/wallet-bypass"
import { toast } from "react-hot-toast"
import VaultIcon from "./vault.svg"
import { closeToken, findAssociatedTokenPda, transferSol } from "@metaplex-foundation/mpl-toolbox"
import { useAccess } from "../../context/access"
import { getFee } from "../NftTool/helpers/utils"

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
  const { sendSignedTransactions } = useTransactionStatus()
  const { addNftsToVault, removeNftsFromVault, updateOwnerForNfts } = useDatabase()
  const selectedItems = nfts.filter((n) => selected.includes(n.nftMint))

  const onlyFrozenSelected = selectedItems.every((item) => item.status === "inVault")
  const onlyThawedSelected = selectedItems.every((item) => !item.status)

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

      const instructionGroups = onlyFrozenSelected
        ? await Promise.all(
            items.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAssetWithAssociatedToken(
                umi,
                publicKey(nft.nftMint),
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
                  // .add(
                  //   delegateUtilityV1(umi, {
                  //     mint: digitalAsset.mint.publicKey,
                  //     tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                  //       ? digitalAsset.metadata.tokenStandard.value
                  //       : 0,
                  //     delegate: publicKey(nft.delegate),
                  //     authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                  //       ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                  //         ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                  //         : undefined
                  //       : undefined,
                  //     authority: createNoopSigner(publicKey(transferTo!)),
                  //     tokenOwner: publicKey(transferTo!),
                  //     payer: umi.identity,
                  //   })
                  // )
                  // .add(
                  //   lockV1(umi, {
                  //     mint: digitalAsset.mint.publicKey,
                  //     tokenStandard: unwrapSome(digitalAsset.metadata.tokenStandard) || 0,
                  //     authority: createNoopSigner(publicKey(nft.delegate)),
                  //     tokenOwner: publicKey(transferTo!),
                  //     payer: umi.identity,
                  //   })
                  // )
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
                  // .add(
                  //   metaplex
                  //     .tokens()
                  //     .builders()
                  //     .approveDelegateAuthority({
                  //       mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                  //       delegateAuthority: new PublicKey(nft.delegate),
                  //       owner: new PublicKey(transferTo!),
                  //     })
                  //     .getInstructions()
                  //     .map((instruction) => {
                  //       return transactionBuilder().add({
                  //         instruction: fromWeb3JsInstruction(instruction),
                  //         bytesCreatedOnChain: 0,
                  //         signers: [
                  //           createNoopSigner(publicKey(nft.delegate)),
                  //           createNoopSigner(publicKey(transferTo!)),
                  //         ],
                  //       })
                  //     })
                  // )

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
                mint: nft.nftMint,
              }
            })
          )
        : await Promise.all(
            items.map(async (nft: any) => {
              const delegate = type === "basic" ? publicKey(nft.owner) : publicKey(lockingWallet!)
              const digitalAsset = await fetchDigitalAssetWithTokenByMint(umi, publicKey(nft.nftMint))
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

              const fee = getFee(`biblio.${type === "secure" ? "secure-lock" : "basic-lock"}`, account)

              if (fee > 0) {
                txn = txn.add(
                  transferSol(umi, {
                    destination: publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!),
                    amount: sol(fee),
                  })
                )
              }

              return {
                instructions: txn,
                mint: nft.nftMint,
              }
            })
          )

      const chunks = getUmiChunks(umi, instructionGroups)
      const txns = await buildTransactions(umi, chunks)

      setBypassWallet(true)

      const signers = uniq(flatten(txns.map((t) => t.signers.map((s) => s.publicKey)))).sort((item: string) =>
        item === wallet.publicKey?.toBase58() ? -1 : 1
      )

      const signedTransactions = await signAllTransactions(
        wallet,
        umi,
        txns.map((t) => t.txn),
        signers
      )

      const freezeThawPromise = sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        onlyFrozenSelected ? "thaw" : "freeze",
        onlyFrozenSelected ? (transfer ? updateOwnerForNfts : removeNftsFromVault) : addNftsToVault
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
    } catch (err) {
      console.log(err)
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
