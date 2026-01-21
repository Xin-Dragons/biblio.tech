import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import type { Address, TransactionSigner } from "@solana/kit"
import { stake } from "@biblio/solana-programs"
import type { NFT } from "../stores/nfts"
import type { CollectionAccount, StakerAccount } from "../stores/stake"

/**
 * Stake Program ID
 * The deployed stake program on Solana mainnet
 */
export const STAKE_PROGRAM_ID = new PublicKey("STAKEQkGBjkhCXabzB5cUbWgSSvbVJFEm2oEnyWzdKE")

/**
 * Metaplex Core Program ID
 */
export const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d")

/**
 * Fees wallet that receives stake/unstake/claim fees
 */
export const FEES_WALLET = new PublicKey("FCp3p6jRvtbng7NQpUYiNx39wyvJ2LZjuhE1bPt37EVE")

const encoder = new TextEncoder()

/**
 * Converts a web3.js PublicKey to Codama Address type
 */
function addr(pubkey: PublicKey): Address {
  return pubkey.toBase58() as Address
}

/**
 * Creates a TransactionSigner from a PublicKey
 * Used for Codama instructions that require signer accounts
 */
function createSigner<T extends string = string>(pubkey: PublicKey): TransactionSigner<T> {
  const address = pubkey.toBase58() as Address<T>
  return {
    address,
    signTransactions: async <TTransaction extends { signatures: Record<string, Uint8Array | null> }>(
      transactions: readonly TTransaction[]
    ) => transactions as TTransaction[],
  } as TransactionSigner<T>
}

/**
 * Instruction format from Codama-generated SDK
 */
type CodamaInstruction = {
  programAddress: string
  accounts: ReadonlyArray<{
    address: string
    role: number
  }>
  data: ArrayLike<number>
}

/**
 * Converts a Codama instruction to web3.js TransactionInstruction
 * Role values: 0 = readonly, 1 = writable, 2 = readonly signer, 3 = writable signer
 */
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

/**
 * Derives the StakeRecord PDA for a given staker and NFT mint
 *
 * StakeRecord accounts track individual stake positions and store:
 * - staker: the staker this record belongs to
 * - owner: the wallet that staked the NFT
 * - nftMint: the mint address of the staked NFT
 * - stakedAt: timestamp when staked
 * - pendingClaim: accumulated rewards
 * - emissions: linked emission accounts
 *
 * Seeds: ["STAKE_RECORD", staker_pubkey, nft_mint_pubkey]
 */
export function getStakeRecordPda(staker: PublicKey, nftMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE_RECORD"), staker.toBytes(), nftMint.toBytes()],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the NftRecord PDA for a given staker and NFT mint
 *
 * NftRecord accounts store persistent data about individual NFTs:
 * - nftMint: the mint address
 * - points: accumulated points from staking
 *
 * This is optional and only used when points emissions are enabled
 *
 * Seeds: ["NFT_RECORD", staker_pubkey, nft_mint_pubkey]
 */
export function getNftRecordPda(staker: PublicKey, nftMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("NFT_RECORD"), staker.toBytes(), nftMint.toBytes()],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the Collection PDA for a given staker and collection mint
 *
 * Collection accounts define which NFT collections can be staked:
 * - staker: the staker this collection belongs to
 * - collectionMint: the collection's verified mint address
 * - emissions: linked token/selection/points/distribution emissions
 * - isActive: whether staking is currently enabled
 * - maxStakersCount: maximum NFTs that can be staked
 *
 * Seeds: ["COLLECTION", staker_pubkey, collection_mint_pubkey]
 */
export function getCollectionPda(staker: PublicKey, collectionMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("COLLECTION"), staker.toBytes(), collectionMint.toBytes()],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the ProgramConfig PDA
 *
 * ProgramConfig is a global singleton that stores program-wide configuration:
 * - stakeFee: transaction fee for staking
 * - unstakeFee: transaction fee for unstaking
 * - claimFee: transaction fee for claiming
 * - subscription fees for various tiers
 *
 * Seeds: ["PROGRAM_CONFIG"]
 */
export function getProgramConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([encoder.encode("PROGRAM_CONFIG")], STAKE_PROGRAM_ID)
  return pda
}

/**
 * Derives the NftAuthority PDA for a given staker
 *
 * NftAuthority is a PDA that acts as the delegate for staked Core NFTs
 * This allows the stake program to control the NFT on behalf of the staker
 *
 * Seeds: ["nft_authority", staker_pubkey]
 */
export function getNftAuthorityPda(staker: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([encoder.encode("nft_authority"), staker.toBytes()], STAKE_PROGRAM_ID)
  return pda
}

/**
 * Input parameters for building stake core instructions
 */
export interface BuildStakeCoreInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: PublicKey
}

/**
 * Builds the transaction instructions required to stake a Core NFT (Dandies)
 *
 * This creates a StakeCore instruction that:
 * 1. Creates a StakeRecord PDA to track the stake position
 * 2. Optionally creates an NftRecord PDA for points tracking
 * 3. Delegates the NFT to the stake program's nftAuthority
 *
 * @param input - The stake parameters including NFT, staker, collection, and owner
 * @returns Array of TransactionInstructions to execute the stake
 */
export function buildStakeCoreInstructions(input: BuildStakeCoreInstructionsInput): TransactionInstruction[] {
  const { nft, staker, collection, owner } = input

  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)
  const collectionMintPubkey = new PublicKey(collection.collectionMint)

  const stakeRecordPda = getStakeRecordPda(stakerPubkey, nftMint)
  const nftRecordPda = getNftRecordPda(stakerPubkey, nftMint)
  const programConfigPda = getProgramConfigPda()
  const nftAuthorityPda = getNftAuthorityPda(stakerPubkey)

  const ix = stake.getStakeCoreInstruction({
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    nftRecord: addr(nftRecordPda),
    stakeRecord: addr(stakeRecordPda),
    programConfig: addr(programConfigPda),
    asset: addr(nftMint),
    assetCollection: addr(collectionMintPubkey),
    nftAuthority: addr(nftAuthorityPda),
    signer: createSigner(owner),
    feesWallet: addr(FEES_WALLET),
    coreProgram: addr(MPL_CORE_PROGRAM_ID),
    selection: null,
  })

  return [codamaInstructionToWeb3(ix)]
}
