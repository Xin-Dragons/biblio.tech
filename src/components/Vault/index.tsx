import { Stack } from "@mui/material"
import { FC } from "react"
import { buildTransactions, getUmiChunks, notifyStatus } from "../../helpers/transactions"
import { flatten } from "lodash"
import { createSignerFromWalletAdapter } from "@metaplex-foundation/umi-signer-wallet-adapters"
import { fromWeb3JsInstruction, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters"
import { isSome, publicKey, transactionBuilder, unwrapSome } from "@metaplex-foundation/umi"
import {
  delegateUtilityV1,
  fetchDigitalAsset,
  lockV1,
  revokeUtilityV1,
  unlockV1,
} from "@metaplex-foundation/mpl-token-metadata"
import { useMetaplex } from "../../context/metaplex"
import { useUmi } from "../../context/umi"
import { useWallet } from "@solana/wallet-adapter-react"
import { useTransactionStatus } from "../../context/transactions"
import { useDatabase } from "../../context/database"
import { useSelection } from "../../context/selection"
import { useNfts } from "../../context/nfts"

type VaultProps = {
  adding: boolean
}

export const Vault: FC<VaultProps> = ({ adding }) => {
  const { selected } = useSelection()
  const { nfts } = useNfts()
  const metaplex = useMetaplex()
  const umi = useUmi()
  const wallet = useWallet()
  const { sendSignedTransactions } = useTransactionStatus()
  const { addNftsToVault, removeNftsFromVault } = useDatabase()
  const selectedItems = nfts.filter((n) => selected.includes(n.nftMint))

  const nonOwnedSelected = selectedItems.some((item) => item.owner !== wallet.publicKey?.toBase58())
  const onlyFrozenSelected = selectedItems.every((item) => item.status === "inVault")
  const onlyThawedSelected = selectedItems.every((item) => !item.status)

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
                    delegate: umi.identity.publicKey,
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
                      delegateAuthority: metaplex.identity().publicKey,
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
                    .nfts()
                    .builders()
                    .freezeDelegatedNft({
                      mintAddress: toWeb3JsPublicKey(digitalAsset.mint.publicKey),
                      delegateAuthority: metaplex.identity(),
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

      const chunks = getUmiChunks(umi, instructionGroups)
      const txns = await buildTransactions(umi, chunks)

      const signedTransactions = await umi.identity.signAllTransactions(txns.map((t) => t.txn))

      const { errs, successes } = await sendSignedTransactions(
        signedTransactions,
        txns.map((t) => t.mints),
        frozenSelected ? "thaw" : "freeze",
        frozenSelected ? removeNftsFromVault : addNftsToVault
      )

      notifyStatus(errs, successes, "send", "sent")
    } catch (err) {
      console.log(err)
    } finally {
    }
  }

  return <Stack spacing={2}></Stack>
}
