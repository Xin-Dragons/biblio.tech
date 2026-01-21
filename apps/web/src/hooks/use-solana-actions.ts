import { useCallback } from "react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import type { Address, TransactionSigner } from "@solana/kit"
import { tokenMetadata } from "@biblio/solana-programs"
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
  const { connection } = useConnection()
  const { publicKey, signAllTransactions } = useWallet()

  const buildTransferNftInstructions = useCallback(
    async (nft: NFT, recipient: string): Promise<TransactionInstruction[]> => {
      if (!publicKey) throw new Error("Wallet not connected")

      const mintPubkey = new PublicKey(nft.mint)
      const recipientPubkey = new PublicKey(recipient)
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const sourceAta = await getAssociatedTokenAddress(mintPubkey, publicKey)
      const destAta = await getAssociatedTokenAddress(mintPubkey, recipientPubkey)

      const instructions: TransactionInstruction[] = []

      const destAtaInfo = await connection.getAccountInfo(destAta)
      if (!destAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
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
          tokenOwner: addr(publicKey),
          destination: addr(destAta),
          destinationOwner: addr(recipientPubkey),
          mint: addr(mintPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          ownerTokenRecord: addr(ownerTokenRecord),
          destinationTokenRecord: addr(destTokenRecord),
          authority: createSigner(publicKey),
          payer: createSigner(publicKey),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(codamaInstructionToWeb3(transferIx))
      } else {
        const edition = getMasterEditionPda(mintPubkey)

        const transferIx = tokenMetadata.getTransferInstruction({
          token: addr(sourceAta),
          tokenOwner: addr(publicKey),
          destination: addr(destAta),
          destinationOwner: addr(recipientPubkey),
          mint: addr(mintPubkey),
          metadata: addr(metadata),
          edition: addr(edition),
          authority: createSigner(publicKey),
          payer: createSigner(publicKey),
          transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
        })

        instructions.push(codamaInstructionToWeb3(transferIx))
      }

      return instructions
    },
    [connection, publicKey]
  )

  const buildBurnNftInstructions = useCallback(
    async (nft: NFT): Promise<TransactionInstruction[]> => {
      if (!publicKey) throw new Error("Wallet not connected")

      const mintPubkey = new PublicKey(nft.mint)
      const isPnft = isProgrammableNft(nft.tokenStandard)

      const ata = await getAssociatedTokenAddress(mintPubkey, publicKey)
      const metadata = getMetadataPda(mintPubkey)
      const edition = getMasterEditionPda(mintPubkey)

      const instructions: TransactionInstruction[] = []

      if (isPnft) {
        const tokenRecord = getTokenRecordPda(mintPubkey, ata)

        const burnIx = tokenMetadata.getBurnInstruction({
          authority: createSigner(publicKey),
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
          authority: createSigner(publicKey),
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
    [publicKey]
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
      if (!publicKey || !signAllTransactions) {
        throw new Error("Wallet not connected")
      }

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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const transactions = chunks.map((chunk) => {
        const tx = new Transaction()
        tx.recentBlockhash = blockhash
        tx.feePayer = publicKey
        for (const ixGroup of chunk) {
          tx.add(...ixGroup)
        }
        return tx
      })

      const signed = await signAllTransactions(transactions)

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (const tx of signed) {
        try {
          const sig = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true,
          })
          await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed")
          completed += chunks[signed.indexOf(tx)].length
          onProgress?.(completed, total)
        } catch (err) {
          console.error("Transaction failed:", err)
          throw err
        }
      }

      return { success: true, count: completed }
    },
    [publicKey, signAllTransactions, connection, buildTransferNftInstructions, chunkInstructions]
  )

  const burnNfts = useCallback(
    async (nfts: NFT[], onProgress?: (completed: number, total: number) => void) => {
      if (!publicKey || !signAllTransactions) {
        throw new Error("Wallet not connected")
      }

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
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const transactions = chunks.map((chunk) => {
        const tx = new Transaction()
        tx.recentBlockhash = blockhash
        tx.feePayer = publicKey
        for (const ixGroup of chunk) {
          tx.add(...ixGroup)
        }
        return tx
      })

      const signed = await signAllTransactions(transactions)

      let completed = 0
      const total = nfts.filter((n) => !n.compressed).length

      for (const tx of signed) {
        try {
          const sig = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true,
          })
          await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed")
          completed += chunks[signed.indexOf(tx)].length
          onProgress?.(completed, total)
        } catch (err) {
          console.error("Transaction failed:", err)
          throw err
        }
      }

      return { success: true, count: completed }
    },
    [publicKey, signAllTransactions, connection, buildBurnNftInstructions, chunkInstructions]
  )

  return {
    sendNfts,
    burnNfts,
    isReady: !!publicKey && !!signAllTransactions,
  }
}
