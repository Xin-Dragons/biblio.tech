import { useCallback } from "react"
import { useWallet, useTransactionSigner } from "@solana/connector/react"
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import type { Address, TransactionSigner } from "@solana/kit"
import { tokenMetadata } from "@biblio/solana-programs"
import { confirmTransactionViaWebSocket } from "@/lib/transaction"
import type { NFT, TokenStandard } from "../stores/nfts"

function addr(pubkey: PublicKey): Address {
  return pubkey.toBase58() as Address
}

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

const MAX_TX_SIZE = 1232
const SIGNATURE_SIZE = 64
const TX_OVERHEAD = 200

const encoder = new TextEncoder()

function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("metadata"), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

function getMasterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("metadata"), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes(), encoder.encode("edition")],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

function getTokenRecordPda(mint: PublicKey, tokenAccount: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      encoder.encode("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBytes(),
      mint.toBytes(),
      encoder.encode("token_record"),
      tokenAccount.toBytes(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

type CodamaInstruction = {
  programAddress: string
  accounts: ReadonlyArray<{
    address: string
    role: number
  }>
  data: ArrayLike<number>
}

function codamaInstructionToWeb3(ix: unknown): TransactionInstruction {
  const instruction = ix as CodamaInstruction
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programAddress),
    keys: instruction.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.role >= 2,
      isWritable: acc.role === 1 || acc.role === 3,
    })),
    data: Uint8Array.from(instruction.data) as unknown as Buffer,
  })
}

function createSigner<T extends string = string>(pubkey: PublicKey): TransactionSigner<T> {
  const address = pubkey.toBase58() as Address<T>
  return {
    address,
    signTransactions: async <TTransaction extends { signatures: Record<string, Uint8Array | null> }>(
      transactions: readonly TTransaction[]
    ) => transactions as TTransaction[],
  } as TransactionSigner<T>
}

function isProgrammableNft(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "ProgrammableNonFungible" || tokenStandard === "ProgrammableNonFungibleEdition"
}

export function useSolanaActions() {
  const { account } = useWallet()
  const { signer, capabilities } = useTransactionSigner()

  const buildTransferNftInstructions = useCallback(
    async (nft: NFT, recipient: string): Promise<TransactionInstruction[]> => {
      if (!account) throw new Error("Wallet not connected")

      const ownerPubkey = new PublicKey(account)
      const mintPubkey = new PublicKey(nft.mint)
      const recipientPubkey = new PublicKey(recipient)
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const sourceAta = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
      const destAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

      const instructions: TransactionInstruction[] = []

      // Check if destination ATA exists via RPC
      const accountResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getAccountInfo",
          params: [destAta.toBase58(), { encoding: "base64" }],
        }),
      })
      const accountData = (await accountResponse.json()) as { result?: { value: unknown } }

      if (!accountData.result?.value) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            ownerPubkey,
            destAta,
            recipientPubkey,
            mintPubkey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        )
      }

      const metadata = getMetadataPda(mintPubkey)

      if (isPnft) {
        const edition = getMasterEditionPda(mintPubkey)
        const ownerTokenRecord = getTokenRecordPda(mintPubkey, sourceAta)
        const destTokenRecord = getTokenRecordPda(mintPubkey, destAta)

        const transferIx = tokenMetadata.getTransferInstruction({
          token: addr(sourceAta),
          tokenOwner: addr(ownerPubkey),
          destination: addr(destAta),
          destinationOwner: addr(recipientPubkey),
          mint: addr(mintPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          ownerTokenRecord: addr(ownerTokenRecord),
          destinationTokenRecord: addr(destTokenRecord),
          authority: createSigner(ownerPubkey),
          payer: createSigner(ownerPubkey),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(codamaInstructionToWeb3(transferIx))
      } else {
        const edition = getMasterEditionPda(mintPubkey)

        const transferIx = tokenMetadata.getTransferInstruction({
          token: addr(sourceAta),
          tokenOwner: addr(ownerPubkey),
          destination: addr(destAta),
          destinationOwner: addr(recipientPubkey),
          mint: addr(mintPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          authority: createSigner(ownerPubkey),
          payer: createSigner(ownerPubkey),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(codamaInstructionToWeb3(transferIx))
      }

      return instructions
    },
    [account]
  )

  const buildBurnNftInstructions = useCallback(
    async (nft: NFT): Promise<TransactionInstruction[]> => {
      if (!account) throw new Error("Wallet not connected")

      const ownerPubkey = new PublicKey(account)
      const mintPubkey = new PublicKey(nft.mint)
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const ata = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
      const metadata = getMetadataPda(mintPubkey)
      const edition = getMasterEditionPda(mintPubkey)

      const instructions: TransactionInstruction[] = []

      if (isPnft) {
        const tokenRecord = getTokenRecordPda(mintPubkey, ata)

        const burnIx = tokenMetadata.getBurnInstruction({
          authority: createSigner(ownerPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          mint: addr(mintPubkey),
          token: addr(ata),
          tokenRecord: addr(tokenRecord),
          burnArgs: { __kind: "V1", amount: 1 },
        })

        instructions.push(codamaInstructionToWeb3(burnIx))
      } else {
        const burnIx = tokenMetadata.getBurnInstruction({
          authority: createSigner(ownerPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          mint: addr(mintPubkey),
          token: addr(ata),
          burnArgs: { __kind: "V1", amount: 1 },
        })

        instructions.push(codamaInstructionToWeb3(burnIx))
      }

      return instructions
    },
    [account]
  )

  const chunkInstructions = useCallback((instructions: TransactionInstruction[][]): TransactionInstruction[][][] => {
    const chunks: TransactionInstruction[][][] = []
    let currentChunk: TransactionInstruction[][] = []
    let currentSize = TX_OVERHEAD + SIGNATURE_SIZE

    for (const ixGroup of instructions) {
      const groupSize = ixGroup.reduce((acc, ix) => acc + ix.data.length + 32 * ix.keys.length, 0)

      if (currentSize + groupSize > MAX_TX_SIZE && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = []
        currentSize = TX_OVERHEAD + SIGNATURE_SIZE
      }

      currentChunk.push(ixGroup)
      currentSize += groupSize
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }

    return chunks
  }, [])

  const sendNfts = useCallback(
    async (nfts: NFT[], recipient: string, onProgress?: (completed: number, total: number) => void) => {
      if (!account || !signer || !capabilities.canSign) {
        throw new Error("Wallet not connected")
      }

      const ownerPubkey = new PublicKey(account)
      const allInstructions: TransactionInstruction[][] = []

      for (const nft of nfts) {
        if (nft.compressed) {
          console.warn(`Skipping compressed NFT ${nft.mint} - cNFT transfers not yet implemented`)
          continue
        }

        try {
          const ixs = await buildTransferNftInstructions(nft, recipient)
          allInstructions.push(ixs)
        } catch (err) {
          console.error(`Failed to build transfer for ${nft.mint}:`, err)
        }
      }

      if (allInstructions.length === 0) {
        throw new Error("No valid transfers to send")
      }

      const chunks = chunkInstructions(allInstructions)

      // Get blockhash via RPC proxy
      const blockhashResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      })
      const blockhashData = (await blockhashResponse.json()) as {
        result?: { value: { blockhash: string; lastValidBlockHeight: number } }
      }
      const blockhash = blockhashData.result?.value.blockhash
      if (!blockhash) throw new Error("Failed to get blockhash")

      const transactions = chunks.map((chunk) => {
        const tx = new Transaction()
        tx.recentBlockhash = blockhash
        tx.feePayer = ownerPubkey
        for (const ixGroup of chunk) {
          tx.add(...ixGroup)
        }
        return tx
      })

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i]
        try {
          const txBytes = tx.serialize({ requireAllSignatures: false })
          const signedBytes = await signer.signTransaction(txBytes)

          const sendResponse = await fetch("/api/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: crypto.randomUUID(),
              method: "sendTransaction",
              params: [
                Buffer.from(signedBytes as Uint8Array).toString("base64"),
                { encoding: "base64", skipPreflight: true },
              ],
            }),
          })
          const sendResult = (await sendResponse.json()) as { result?: string; error?: { message: string } }

          if (sendResult.error) {
            throw new Error(sendResult.error.message || JSON.stringify(sendResult.error))
          }

          const sig = sendResult.result
          if (!sig) throw new Error("No signature returned")

          await confirmTransactionViaWebSocket(sig)

          completed += chunks[i].length
          onProgress?.(completed, total)
        } catch (err) {
          console.error("Transaction failed:", err)
          throw err
        }
      }

      return { success: true, count: completed }
    },
    [account, signer, capabilities.canSign, buildTransferNftInstructions, chunkInstructions]
  )

  const burnNfts = useCallback(
    async (nfts: NFT[], onProgress?: (completed: number, total: number) => void) => {
      if (!account || !signer || !capabilities.canSign) {
        throw new Error("Wallet not connected")
      }

      const ownerPubkey = new PublicKey(account)
      const allInstructions: TransactionInstruction[][] = []

      for (const nft of nfts) {
        if (nft.compressed) {
          console.warn(`Skipping compressed NFT ${nft.mint} - cNFT burns not yet implemented`)
          continue
        }

        try {
          const ixs = await buildBurnNftInstructions(nft)
          allInstructions.push(ixs)
        } catch (err) {
          console.error(`Failed to build burn for ${nft.mint}:`, err)
        }
      }

      if (allInstructions.length === 0) {
        throw new Error("No valid burns to execute")
      }

      const chunks = chunkInstructions(allInstructions)

      // Get blockhash via RPC proxy
      const blockhashResponse = await fetch("/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "getLatestBlockhash",
          params: [{ commitment: "finalized" }],
        }),
      })
      const blockhashData = (await blockhashResponse.json()) as {
        result?: { value: { blockhash: string; lastValidBlockHeight: number } }
      }
      const blockhash = blockhashData.result?.value.blockhash
      if (!blockhash) throw new Error("Failed to get blockhash")

      const transactions = chunks.map((chunk) => {
        const tx = new Transaction()
        tx.recentBlockhash = blockhash
        tx.feePayer = ownerPubkey
        for (const ixGroup of chunk) {
          tx.add(...ixGroup)
        }
        return tx
      })

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i]
        try {
          const txBytes = tx.serialize({ requireAllSignatures: false })
          const signedBytes = await signer.signTransaction(txBytes)

          const sendResponse = await fetch("/api/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: crypto.randomUUID(),
              method: "sendTransaction",
              params: [
                Buffer.from(signedBytes as Uint8Array).toString("base64"),
                { encoding: "base64", skipPreflight: true },
              ],
            }),
          })
          const sendResult = (await sendResponse.json()) as { result?: string; error?: { message: string } }

          if (sendResult.error) {
            throw new Error(sendResult.error.message || JSON.stringify(sendResult.error))
          }

          const sig = sendResult.result
          if (!sig) throw new Error("No signature returned")

          await confirmTransactionViaWebSocket(sig)

          completed += chunks[i].length
          onProgress?.(completed, total)
        } catch (err) {
          console.error("Transaction failed:", err)
          throw err
        }
      }

      return { success: true, count: completed }
    },
    [account, signer, capabilities.canSign, buildBurnNftInstructions, chunkInstructions]
  )

  return {
    sendNfts,
    burnNfts,
    isReady: !!account && !!signer && capabilities.canSign,
  }
}
