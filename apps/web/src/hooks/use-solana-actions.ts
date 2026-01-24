import { useCallback } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type TransactionSigner,
  type Instruction,
} from "@solana/kit"
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  getCreateAssociatedTokenInstruction,
} from "@solana-program/token"
import { tokenMetadata } from "@biblio/solana-programs"
import {
  getBlockhash,
  sendTransaction,
  confirmTransactionViaWebSocket,
  getEncodedTransactionSize,
  prepareSignedTransaction,
  MAX_TX_SIZE,
  SIZE_BUFFER,
} from "@/lib/transaction"
import type { NFT, TokenStandard } from "../stores/nfts"

const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address

function createNoopSigner<T extends string = string>(address: Address<T>): TransactionSigner<T> {
  return {
    address,
    signTransactions: async (transactions) => transactions,
  } as TransactionSigner<T>
}

async function getMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: ["metadata", getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS), getAddressEncoder().encode(mint)],
  })
  return pda
}

async function getMasterEditionPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      "metadata",
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      "edition",
    ],
  })
  return pda
}

async function getTokenRecordPda(mint: Address, tokenAccount: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: [
      "metadata",
      getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS),
      getAddressEncoder().encode(mint),
      "token_record",
      getAddressEncoder().encode(tokenAccount),
    ],
  })
  return pda
}

function isProgrammableNft(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "ProgrammableNonFungible" || tokenStandard === "ProgrammableNonFungibleEdition"
}

async function checkAccountExists(address: Address): Promise<boolean> {
  const response = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "getAccountInfo",
      params: [address, { encoding: "base64" }],
    }),
  })
  const data = (await response.json()) as { result?: { value: unknown } }
  return !!data.result?.value
}

export function useSolanaActions() {
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()

  const buildTransferNftInstructions = useCallback(
    async (nft: NFT, recipient: string): Promise<Instruction[]> => {
      if (!account) throw new Error("Wallet not connected")

      const ownerAddress = account as Address
      const mintAddress = nft.mint as Address
      const recipientAddress = recipient as Address
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const [sourceAta] = await findAssociatedTokenPda({
        mint: mintAddress,
        owner: ownerAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const [destAta] = await findAssociatedTokenPda({
        mint: mintAddress,
        owner: recipientAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const instructions: Instruction[] = []

      const destAtaExists = await checkAccountExists(destAta)
      if (!destAtaExists) {
        instructions.push(
          getCreateAssociatedTokenInstruction({
            payer: createNoopSigner(ownerAddress),
            ata: destAta,
            owner: recipientAddress,
            mint: mintAddress,
          })
        )
      }

      const metadata = await getMetadataPda(mintAddress)
      const edition = await getMasterEditionPda(mintAddress)

      if (isPnft) {
        const ownerTokenRecord = await getTokenRecordPda(mintAddress, sourceAta)
        const destTokenRecord = await getTokenRecordPda(mintAddress, destAta)

        const transferIx = tokenMetadata.getTransferInstruction({
          token: sourceAta,
          tokenOwner: ownerAddress,
          destination: destAta,
          destinationOwner: recipientAddress,
          mint: mintAddress,
          metadata: metadata,
          edition: edition,
          ownerTokenRecord: ownerTokenRecord,
          destinationTokenRecord: destTokenRecord,
          authority: createNoopSigner(ownerAddress),
          payer: createNoopSigner(ownerAddress),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(transferIx)
      } else {
        const transferIx = tokenMetadata.getTransferInstruction({
          token: sourceAta,
          tokenOwner: ownerAddress,
          destination: destAta,
          destinationOwner: recipientAddress,
          mint: mintAddress,
          metadata: metadata,
          edition: edition,
          authority: createNoopSigner(ownerAddress),
          payer: createNoopSigner(ownerAddress),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(transferIx)
      }

      return instructions
    },
    [account]
  )

  const buildBurnNftInstructions = useCallback(
    async (nft: NFT): Promise<Instruction[]> => {
      if (!account) throw new Error("Wallet not connected")

      const ownerAddress = account as Address
      const mintAddress = nft.mint as Address
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const [ata] = await findAssociatedTokenPda({
        mint: mintAddress,
        owner: ownerAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      })

      const metadata = await getMetadataPda(mintAddress)
      const edition = await getMasterEditionPda(mintAddress)

      const instructions: Instruction[] = []

      if (isPnft) {
        const tokenRecord = await getTokenRecordPda(mintAddress, ata)

        const burnIx = tokenMetadata.getBurnInstruction({
          authority: createNoopSigner(ownerAddress),
          metadata: metadata,
          edition: edition,
          mint: mintAddress,
          token: ata,
          tokenRecord: tokenRecord,
          burnArgs: { __kind: "V1", amount: 1 },
        })

        instructions.push(burnIx)
      } else {
        const burnIx = tokenMetadata.getBurnInstruction({
          authority: createNoopSigner(ownerAddress),
          metadata: metadata,
          edition: edition,
          mint: mintAddress,
          token: ata,
          burnArgs: { __kind: "V1", amount: 1 },
        })

        instructions.push(burnIx)
      }

      return instructions
    },
    [account]
  )

  const sendNfts = useCallback(
    async (nfts: NFT[], recipient: string, onProgress?: (completed: number, total: number) => void) => {
      if (!account || !signer || !capabilities.canSign) {
        throw new Error("Wallet not connected")
      }

      const typedSigner = signer as unknown as TransactionSigner

      const allInstructions: { nft: NFT; instructions: Instruction[] }[] = []

      for (const nft of nfts) {
        if (nft.compressed) {
          console.warn(`Skipping compressed NFT ${nft.mint} - cNFT transfers not yet implemented`)
          continue
        }

        try {
          const ixs = await buildTransferNftInstructions(nft, recipient)
          allInstructions.push({ nft, instructions: ixs })
        } catch (err) {
          console.error(`Failed to build transfer for ${nft.mint}:`, err)
        }
      }

      if (allInstructions.length === 0) {
        throw new Error("No valid transfers to send")
      }

      const { blockhash, lastValidBlockHeight } = await getBlockhash()

      const batches: { nfts: NFT[]; instructions: Instruction[] }[] = []
      let currentBatch: { nfts: NFT[]; instructions: Instruction[] } = { nfts: [], instructions: [] }

      for (const { nft, instructions } of allInstructions) {
        const testInstructions = [...currentBatch.instructions, ...instructions]
        const size = await getEncodedTransactionSize(testInstructions, typedSigner, blockhash, lastValidBlockHeight)

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentBatch.nfts.length > 0) {
          batches.push(currentBatch)
          currentBatch = { nfts: [], instructions: [] }
        }

        currentBatch.nfts.push(nft)
        currentBatch.instructions.push(...instructions)
      }

      if (currentBatch.nfts.length > 0) {
        batches.push(currentBatch)
      }

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (const batch of batches) {
        const signedBase64 = await prepareSignedTransaction({
          instructions: batch.instructions,
          feePayer: typedSigner,
          blockhash,
          lastValidBlockHeight,
        })

        const signature = await sendTransaction(signedBase64)
        await confirmTransactionViaWebSocket(signature)

        completed += batch.nfts.length
        onProgress?.(completed, total)
      }

      return { success: true, count: completed }
    },
    [account, signer, capabilities.canSign, buildTransferNftInstructions]
  )

  const burnNfts = useCallback(
    async (nfts: NFT[], onProgress?: (completed: number, total: number) => void) => {
      if (!account || !signer || !capabilities.canSign) {
        throw new Error("Wallet not connected")
      }

      const typedSigner = signer as unknown as TransactionSigner

      const allInstructions: { nft: NFT; instructions: Instruction[] }[] = []

      for (const nft of nfts) {
        if (nft.compressed) {
          console.warn(`Skipping compressed NFT ${nft.mint} - cNFT burns not yet implemented`)
          continue
        }

        try {
          const ixs = await buildBurnNftInstructions(nft)
          allInstructions.push({ nft, instructions: ixs })
        } catch (err) {
          console.error(`Failed to build burn for ${nft.mint}:`, err)
        }
      }

      if (allInstructions.length === 0) {
        throw new Error("No valid burns to execute")
      }

      const { blockhash, lastValidBlockHeight } = await getBlockhash()

      const batches: { nfts: NFT[]; instructions: Instruction[] }[] = []
      let currentBatch: { nfts: NFT[]; instructions: Instruction[] } = { nfts: [], instructions: [] }

      for (const { nft, instructions } of allInstructions) {
        const testInstructions = [...currentBatch.instructions, ...instructions]
        const size = await getEncodedTransactionSize(testInstructions, typedSigner, blockhash, lastValidBlockHeight)

        if (size > MAX_TX_SIZE - SIZE_BUFFER && currentBatch.nfts.length > 0) {
          batches.push(currentBatch)
          currentBatch = { nfts: [], instructions: [] }
        }

        currentBatch.nfts.push(nft)
        currentBatch.instructions.push(...instructions)
      }

      if (currentBatch.nfts.length > 0) {
        batches.push(currentBatch)
      }

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (const batch of batches) {
        const signedBase64 = await prepareSignedTransaction({
          instructions: batch.instructions,
          feePayer: typedSigner,
          blockhash,
          lastValidBlockHeight,
        })

        const signature = await sendTransaction(signedBase64)
        await confirmTransactionViaWebSocket(signature)

        completed += batch.nfts.length
        onProgress?.(completed, total)
      }

      return { success: true, count: completed }
    },
    [account, signer, capabilities.canSign, buildBurnNftInstructions]
  )

  return {
    sendNfts,
    burnNfts,
    isReady: !!account && !!signer && capabilities.canSign,
  }
}
