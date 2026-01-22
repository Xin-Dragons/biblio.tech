import { Hono } from "hono"
import type { HonoEnv } from "../types"
import { authMiddleware } from "../middleware/auth"
import { heliusService } from "../services/helius"
import bs58 from "bs58"
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js"
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token"

export const lockRoutes = new Hono<HonoEnv>()

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
const DANDIES_COLLECTION_ID = "CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys"

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

// Delegate instruction discriminator and args for UtilityV1
function createDelegateUtilityInstruction(
  delegateRecord: PublicKey,
  delegate: PublicKey,
  metadata: PublicKey,
  masterEdition: PublicKey,
  tokenRecord: PublicKey,
  mint: PublicKey,
  token: PublicKey,
  authority: PublicKey,
  payer: PublicKey
): TransactionInstruction {
  // Discriminator 44 (Delegate) + DelegateArgs::UtilityV1 { amount: 1, authorization_data: None }
  const data = Buffer.from([
    44, // Delegate discriminator
    5, // UtilityV1 variant index
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0, // amount: u64 = 1
    0, // authorization_data: None
  ])

  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: delegateRecord, isSigner: false, isWritable: true },
      { pubkey: delegate, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: masterEdition, isSigner: false, isWritable: false },
      { pubkey: tokenRecord, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // auth rules program (none)
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // auth rules (none)
    ],
    data,
  })
}

// Lock instruction for pNFTs
function createLockInstruction(
  authority: PublicKey,
  tokenOwner: PublicKey,
  token: PublicKey,
  mint: PublicKey,
  metadata: PublicKey,
  edition: PublicKey,
  tokenRecord: PublicKey,
  payer: PublicKey
): TransactionInstruction {
  // Discriminator 46 (Lock) + LockArgs::V1 { authorization_data: None }
  const data = Buffer.from([
    46, // Lock discriminator
    0, // V1 variant
    0, // authorization_data: None
  ])

  return new TransactionInstruction({
    programId: TOKEN_METADATA_PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: tokenOwner, isSigner: false, isWritable: false },
      { pubkey: token, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: edition, isSigner: false, isWritable: false },
      { pubkey: tokenRecord, isSigner: false, isWritable: true },
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // auth rules program (none)
      { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false }, // auth rules (none)
    ],
    data,
  })
}

function getMetadataDelegateRecordPda(
  mint: PublicKey,
  delegateRole: string,
  updateAuthority: PublicKey,
  delegate: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      encoder.encode("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBytes(),
      mint.toBytes(),
      encoder.encode(delegateRole),
      updateAuthority.toBytes(),
      delegate.toBytes(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

// Build lock transaction that user needs to sign, with Biblio's partial signature for lock ix
lockRoutes.post("/build-lock-tx", authMiddleware, async (c) => {
  const userId = c.get("userId")
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const { mint: mintAddress, owner: ownerAddress } = await c.req.json<{ mint: string; owner: string }>()

  if (!mintAddress || !ownerAddress) {
    return c.json({ error: "Missing mint or owner" }, 400)
  }

  // Verify the NFT is a Dandy owned by the user
  const asset = await heliusService.getAsset(c.env.HELIUS_API_KEY, mintAddress)

  if (asset.ownership.owner !== ownerAddress) {
    return c.json({ error: "NFT not owned by specified owner" }, 400)
  }

  const isInDandiesCollection = asset.grouping?.some(
    (g) => g.group_key === "collection" && g.group_value === DANDIES_COLLECTION_ID
  )

  if (!isInDandiesCollection) {
    return c.json({ error: "NFT is not a Dandy" }, 400)
  }

  if (asset.ownership.frozen) {
    return c.json({ error: "NFT is already locked" }, 400)
  }

  // Build the transaction
  const biblioLockWallet = c.env.BIBLIO_LOCK_WALLET
  const biblioLockSecret = c.env.BIBLIO_LOCK_WALLET_SECRET

  if (!biblioLockWallet || !biblioLockSecret) {
    return c.json({ error: "Lock wallet not configured" }, 500)
  }

  const biblioKeypair = Keypair.fromSecretKey(bs58.decode(biblioLockSecret))
  const biblioPublicKey = new PublicKey(biblioLockWallet)
  const mintPubkey = new PublicKey(mintAddress)
  const ownerPubkey = new PublicKey(ownerAddress)

  const token = await getAssociatedTokenAddress(mintPubkey, ownerPubkey)
  const metadata = getMetadataPda(mintPubkey)
  const edition = getMasterEditionPda(mintPubkey)
  const tokenRecord = getTokenRecordPda(mintPubkey, token)

  // For pNFTs, we need to use a token record as the delegate record
  const delegateRecord = tokenRecord

  // Build delegate instruction (user delegates to Biblio)
  const delegateIx = createDelegateUtilityInstruction(
    delegateRecord,
    biblioPublicKey,
    metadata,
    edition,
    tokenRecord,
    mintPubkey,
    token,
    ownerPubkey, // authority (token owner)
    ownerPubkey // payer
  )

  // Build lock instruction (Biblio locks the NFT)
  const lockIx = createLockInstruction(
    biblioPublicKey, // authority (delegate)
    ownerPubkey, // token owner
    token,
    mintPubkey,
    metadata,
    edition,
    tokenRecord,
    biblioPublicKey // payer for the lock
  )

  // Get connection for blockhash
  const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=${c.env.HELIUS_API_KEY}`, "confirmed")
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

  const tx = new Transaction()
  tx.recentBlockhash = blockhash
  tx.feePayer = ownerPubkey
  tx.add(delegateIx)
  tx.add(lockIx)

  // Partially sign with Biblio's keypair
  tx.partialSign(biblioKeypair)

  // Serialize and return - user still needs to sign
  const serialized = tx.serialize({ requireAllSignatures: false })

  return c.json({
    transaction: bs58.encode(new Uint8Array(serialized)),
    blockhash,
    lastValidBlockHeight,
    mint: mintAddress,
  })
})

// Get user's Dandies with lock status
lockRoutes.get("/dandies", authMiddleware, async (c) => {
  const userId = c.get("userId")
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  // Get user's wallets
  const userDO = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId))
  const walletsRes = await userDO.fetch(new Request("http://do/wallets"))
  const wallets = await walletsRes.json<Array<{ publicKey: string }>>()

  if (wallets.length === 0) {
    return c.json({ dandies: [] })
  }

  const biblioLockWallet = c.env.BIBLIO_LOCK_WALLET

  // Get Dandies from all wallets
  const allDandies: Array<{
    mint: string
    name: string
    image: string
    owner: string
    locked: boolean
    lockedToBiblio: boolean
  }> = []

  for (const { publicKey: wallet } of wallets) {
    const dandies = await heliusService.searchAssets(c.env.HELIUS_API_KEY, {
      ownerAddress: wallet,
      grouping: ["collection", DANDIES_COLLECTION_ID],
    })

    for (const dandy of dandies.items) {
      allDandies.push({
        mint: dandy.id,
        name: dandy.content?.metadata?.name ?? "Dandy",
        image: dandy.content?.links?.image ?? "",
        owner: wallet,
        locked: dandy.ownership.frozen,
        lockedToBiblio: dandy.ownership.frozen && dandy.ownership.delegate === biblioLockWallet,
      })
    }
  }

  return c.json({ dandies: allDandies })
})
