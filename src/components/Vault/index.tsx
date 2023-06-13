import {
  Button,
  CardContent,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material"
import { FC, useState } from "react"
import { buildTransactions, getUmiChunks, notifyStatus } from "../../helpers/transactions"
import { flatten } from "lodash"
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
import { shorten } from "../../helpers/utils"
import { PublicKey } from "@solana/web3.js"
import { Metaplex, guestIdentity } from "@metaplex-foundation/js"
import { useWalletBypass } from "../../context/wallet-bypass"
import { toast } from "react-hot-toast"

export const Vault: FC = () => {
  const [lockingWallet, setLockingWallet] = useState(null)
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

  const nonOwnedSelected = selectedItems.some((item) => item.owner !== wallet.publicKey?.toBase58())
  const onlyFrozenSelected = selectedItems.every((item) => item.status === "inVault")
  const onlyThawedSelected = selectedItems.every((item) => !item.status)

  async function signAllTransactions(txns: Transaction[], signers: string[]) {
    return signers.reduce((promise, signer, index) => {
      return promise.then(async () => {
        console.log(signer)
        if (wallet.publicKey?.toBase58() === signer) {
          const signedPromise = umi.identity.signAllTransactions(txns)
          toast.promise(signedPromise, {
            loading: `Sign transaction, wallet ${index + 1} of ${signers.length}`,
            success: "Signed",
            error: "Error signing",
          })
          await signedPromise
        } else {
          await umi.identity.signAllTransactions(txns)
          toast("SWAP")
        }
      })
    }, Promise.resolve())
  }

  async function lockUnlock(all: boolean = false) {
    try {
      if (nonOwnedSelected) {
        throw new Error("Some selected items are owned by a linked wallet")
      }
      if (!onlyFrozenSelected && !onlyThawedSelected) {
        throw new Error("Cannot freeze and thaw in same transaction")
      }

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
                  })
                )
                instructions.push(
                  revokeUtilityV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                    delegate: umi.identity.publicKey,
                  })
                )
              } else {
                instructions.push(
                  metaplex
                    .nfts()
                    .builders()
                    .thawDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: metaplex.identity(),
                      tokenOwner: metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )

                instructions.push(
                  metaplex
                    .tokens()
                    .builders()
                    .revokeDelegateAuthority({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      owner: metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
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
                    delegate: lockingWallet ? publicKey(lockingWallet) : umi.identity.publicKey,
                    authorizationRules: isSome(digitalAsset.metadata.programmableConfig)
                      ? isSome(digitalAsset.metadata.programmableConfig.value.ruleSet)
                        ? digitalAsset.metadata.programmableConfig.value.ruleSet.value
                        : undefined
                      : undefined,
                  })
                )
                instructions.push(
                  lockV1(umi, {
                    mint: digitalAsset.mint.publicKey,
                    tokenStandard: isSome(digitalAsset.metadata.tokenStandard)
                      ? digitalAsset.metadata.tokenStandard.value
                      : 0,
                  })
                )
              } else {
                instructions.push(
                  metaplex
                    .tokens()
                    .builders()
                    .approveDelegateAuthority({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: lockingWallet ? new PublicKey(lockingWallet) : metaplex.identity().publicKey,
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [createSignerFromWalletAdapter(wallet)],
                      })
                    })
                )

                const identity = lockingWallet
                  ? Metaplex.make(connection).use(guestIdentity(new PublicKey(lockingWallet))).identity
                  : metaplex.identity

                instructions.push(
                  metaplex
                    .nfts()
                    .builders()
                    .freezeDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: identity(),
                    })
                    .getInstructions()
                    .map((instruction) => {
                      return transactionBuilder().add({
                        instruction: fromWeb3JsInstruction(instruction),
                        bytesCreatedOnChain: 0,
                        signers: [
                          lockingWallet
                            ? createNoopSigner(publicKey(lockingWallet))
                            : createSignerFromWalletAdapter(wallet),
                        ],
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

      const signedTransactions = await signAllTransactions(
        txns.map((t) => t.txn),
        signers
      )

      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        onlyFrozenSelected ? "thaw" : "freeze",
        onlyFrozenSelected ? removeNftsFromVault : addNftsToVault
      )

      notifyStatus(errs, successes, "send", "sent")
    } catch (err) {
      console.log(err)
    } finally {
      setBypassWallet(false)
    }
  }

  const wallets = session?.user?.wallets

  const canSecureLock = (session?.user?.wallets?.length || 0) > 1

  return (
    <CardContent>
      <Stack spacing={2}>
        <Typography variant="h5">{onlyFrozenSelected ? "Remove items from" : "Add items to"} The Vault</Typography>
        <Typography>
          You are adding {selected.length} item{selected.length === 1 ? "" : "s"} to The Vault.
        </Typography>
        <Typography>
          If you have additional linked wallets, you can choose to defer freeze authority to any of these wallets. This
          results in an <strong>much</strong> more secure method of locking, as if anyone were to obtain your private
          key, they would still be unable to unfreeze your items unless they had also obtained access to the wallet used
          to freeze.
        </Typography>
        <FormControl disabled={!canSecureLock}>
          <InputLabel id="demo-simple-select-label">Wallet</InputLabel>
          <Select value={lockingWallet} label="Wallet" onChange={(e) => setLockingWallet(e.target.value)}>
            {wallets?.map((w) => (
              <MenuItem value={w.public_key}>
                {shorten(w.public_key)}
                {w.public_key !== wallet.publicKey?.toBase58() && " - **SECURE**"}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Choose a wallet to defer freeze authority to. This must be a wallet you own</FormHelperText>
        </FormControl>
        <Stack direction="row" justifyContent="space-between">
          <Button color="error" variant="outlined">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => lockUnlock()}>
            Secure items
          </Button>
        </Stack>
      </Stack>
    </CardContent>
  )
}
