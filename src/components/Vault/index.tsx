import {
  Button,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material"
import { FC, useEffect, useState } from "react"
import { buildTransactions, getUmiChunks, notifyStatus } from "../../helpers/transactions"
import { flatten, uniq } from "lodash"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { fromWeb3JsInstruction, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import {
  Transaction,
  base58PublicKey,
  createNoopSigner,
  isSome,
  publicKey,
  transactionBuilder,
  unwrapSome,
} from "@metaplex-foundation/umi"
import {
  delegateUtilityV1,
  fetchDigitalAsset,
  lockV1,
  revokeUtilityV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useMetaplex } from "../../context/metaplex"
import { useUmi } from "../../context/umi"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useTransactionStatus } from "../../context/transactions"
import { useDatabase } from "../../context/database"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"
import { useSession } from "next-auth/react"
import { shorten, sleep } from "../../helpers/utils"
import { PublicKey } from "@solana/web3.js"
import { Metaplex, guestIdentity } from "@metaplex-foundation/js"
import { useWalletBypass } from "../../context/wallet-bypass"
import { toast } from "react-hot-toast"

export const Vault: FC<{ onClose: Function }> = ({ onClose }) => {
  const [lockingWallet, setLockingWallet] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { setBypassWallet } = useWalletBypass()
  const { selected } = useSelection()
  const { nfts } = useNfts()
  const metaplex = useMetaplex()
  const umi = useUmi()
  const wallet = useWallet()
  const { connection } = useConnection()
  const { data: session } = useSession()
  const { sendSignedTransactions } = useTransactionStatus()
  const { addNftsToVault, removeNftsFromVault } = useDatabase()
  const selectedItems = nfts.filter((n) => selected.includes(n.nftMint))

  const onlyFrozenSelected = selectedItems.every((item) => item.status === "inVault")
  const onlyThawedSelected = selectedItems.every((item) => !item.status)

  async function waitForWalletChange(signer: string): Promise<void> {
    // @ts-ignore
    if (window.solana?.publicKey?.toBase58() === signer) {
      return
    }

    await sleep(1000)
    return waitForWalletChange(signer)
  }

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

  async function lockUnlock(all: boolean = false) {
    try {
      if (!onlyFrozenSelected && !onlyThawedSelected) {
        throw new Error("Cannot freeze and thaw in same transaction")
      }

      if (!onlyFrozenSelected && !lockingWallet) {
        throw new Error("Locking wallet is required")
      }

      onClose()

      const items = all ? nfts : selectedItems

      const frozenSelected = items.some((item) => item.status === "inVault")

      const instructionGroups = frozenSelected
        ? await Promise.all(
            items.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAsset(umi, publicKey(nft.nftMint))
              const instructions = []
              if (unwrapSome(digitalAsset.metadata.tokenStandard) === 4) {
                instructions.push(
                  unlockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    authority: createNoopSigner(publicKey(nft.delegate)),
                    tokenOwner: publicKey(nft.owner),
                  })
                )
                instructions.push(
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
              } else {
                const identity = Metaplex.make(connection)
                  .use(guestIdentity(new PublicKey(nft.delegate)))
                  .identity()
                instructions.push(
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
                        signers: [createNoopSigner(publicKey(nft.delegate))],
                      })
                    })
                )

                instructions.push(
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
              return {
                instructions: flatten(instructions),
                mint: nft.nftMint,
              }
            })
          )
        : await Promise.all(
            items.map(async (nft: any) => {
              const digitalAsset = await fetchDigitalAsset(umi, publicKey(nft.nftMint))
              const instructions = []
              if (unwrapSome(digitalAsset.metadata.tokenStandard) === 4) {
                instructions.push(
                  delegateUtilityV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    delegate: publicKey(lockingWallet!),
                    authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                      ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                        ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                        : undefined
                      : undefined,
                    authority: createNoopSigner(publicKey(nft.owner)),
                    tokenOwner: publicKey(nft.owner),
                    payer: createNoopSigner(publicKey(lockingWallet!)),
                  })
                )
                instructions.push(
                  lockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    authority: createNoopSigner(publicKey(lockingWallet!)),
                    tokenOwner: publicKey(nft.owner),
                    payer: createNoopSigner(publicKey(lockingWallet!)),
                  })
                )
              } else {
                instructions.push(
                  metaplex
                    .tokens()
                    .builders()
                    .approveDelegateAuthority({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: new PublicKey(lockingWallet!),
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createNoopSigner(publicKey(lockingWallet!))],
                      })
                    })
                )

                const identity = Metaplex.make(connection)
                  .use(guestIdentity(new PublicKey(lockingWallet!)))
                  .identity()

                instructions.push(
                  metaplex
                    .nfts()
                    .builders()
                    .freezeDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: identity,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createNoopSigner(publicKey(lockingWallet!))],
                      })
                    })
                )
              }

              return {
                instructions: flatten(instructions),
                mint: nft.nftMint,
              }
            })
          )

      const chunks = getUmiChunks(umi, instructionGroups)
      const txns = await buildTransactions(umi, chunks)

      setBypassWallet(true)
      const signers = txns[0].signers
        .map((signer) => base58PublicKey(signer.publicKey))
        .sort((item: string) => (item === wallet.publicKey?.toBase58() ? -1 : 1))

      console.log(signers)

      const signedTransactions = await signAllTransactions(
        txns.map((t) => t.txn),
        signers
      )

      const freezeThawPromise = sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        onlyFrozenSelected ? "thaw" : "freeze",
        onlyFrozenSelected ? removeNftsFromVault : addNftsToVault
      )

      toast.promise(freezeThawPromise, {
        loading: `${onlyFrozenSelected ? "Thawing" : "Freezing"} ${selected.length} item${
          selected.length === 1 ? "" : "s"
        }`,
        success: "Success",
        error: "Error",
      })

      const { errs, successes } = await freezeThawPromise

      notifyStatus(errs, successes, onlyFrozenSelected ? "thaw" : "freeze", onlyFrozenSelected ? "thawed" : "frozen")
    } catch (err) {
      console.log(err)
    } finally {
      setBypassWallet(false)
    }
  }

  const wallets = session?.user?.wallets

  const canSecureLock = (session?.user?.wallets?.length || 0) > 1
  const authorities = uniq([...selectedItems.map((item) => item.delegate), ...selectedItems.map((item) => item.owner)])
  const owners = uniq(selectedItems.map((item) => item.owner))

  return (
    <CardContent>
      <Stack spacing={2}>
        <Typography variant="h5">{onlyFrozenSelected ? "Remove items from" : "Add items to"} The Vault</Typography>
        <Typography>
          {onlyFrozenSelected
            ? `You are removing ${selected.length} item${selected.length === 1 ? "" : "s"} from The Vault.`
            : `You are adding ${selected.length} item${selected.length === 1 ? "" : "s"} to The Vault.`}
        </Typography>
        {onlyFrozenSelected ? (
          <Stack>
            <Typography>Authorities needed to unlock:</Typography>
            <List>
              {authorities.map((auth) => (
                <ListItem>{shorten(auth)}</ListItem>
              ))}
            </List>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography>
              If you have additional linked wallets, you can choose to defer freeze authority to any of these wallets.
              This results in an <strong>much</strong> more secure method of locking, as if anyone were to obtain your
              private key, they would still be unable to unfreeze your items unless they had also obtained access to the
              wallet used to freeze.
            </Typography>
            <FormControl disabled={!canSecureLock}>
              <InputLabel id="demo-simple-select-label">Wallet</InputLabel>
              <Select value={lockingWallet} label="Wallet" onChange={(e) => setLockingWallet(e.target.value)}>
                {wallets?.map((w) => (
                  <MenuItem value={w.public_key}>
                    {shorten(w.public_key)}
                    {!owners.includes(w.public_key) && " - **SECURE**"}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Choose a wallet to defer freeze authority to. This must be a wallet you own
              </FormHelperText>
            </FormControl>
          </Stack>
        )}

        <Stack direction="row" justifyContent="space-between">
          <Button color="error" variant="outlined" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => lockUnlock()}
            disabled={loading || (!onlyFrozenSelected && !lockingWallet)}
          >
            {onlyFrozenSelected ? "Thaw" : "Freeze"} item{selected.length === 1 ? "" : "s"}
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  )
}
