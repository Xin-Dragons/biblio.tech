import { PublicKey, TransactionInstruction } from "@solana/web3.js"
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token"
import type { Address, TransactionSigner } from "@solana/kit"
import { stake } from "@biblio/solana-programs"
import type { NFT } from "../stores/nfts"
import type { CollectionAccount, EmissionAccount, StakerAccount, StakeRecordAccount } from "../stores/stake"

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
 * Metaplex Token Metadata Program ID
 */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

/**
 * Token Auth Rules Program ID
 */
export const TOKEN_AUTH_RULES_PROGRAM_ID = new PublicKey("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg")

/**
 * Fees wallet that receives stake/unstake/claim fees
 */
export const FEES_WALLET = new PublicKey("2NkHMEEKymjrjjd9DSEprVV4E7nBr6aHzwFeusHxL2Q6")

/**
 * Default auth rules for pNFT delegation (Dandies collection)
 */
export const DANDIES_AUTH_RULES = new PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9")

/**
 * Dandies staker address
 */
export const DANDIES_STAKER = new PublicKey("6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a")

/**
 * Dandies NFT Authority PDA
 * This is the delegate authority for staked Dandies pNFTs
 * Cannot be derived via standard PDA derivation - obtained from working transaction
 */
export const DANDIES_NFT_AUTHORITY = new PublicKey("HSRNyULArR9zpyPfncYMezYrfBvPNUzvLYzJPppCxgYM")

/**
 * Nifty-OSS Asset Program ID
 */
export const NIFTY_PROGRAM_ID = new PublicKey("AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73")

/**
 * Dandies Nifty Collection address (for nifty-oss Dandies)
 */
export const DANDIES_NIFTY_COLLECTION = new PublicKey("BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF")

/**
 * Checks if an NFT is a nifty-oss asset
 */
export function isNiftyAsset(nft: NFT): boolean {
  return nft.tokenStandard === "Nifty"
}

/**
 * Checks if an NFT is a nifty-oss Dandies asset
 */
export function isNiftyDandy(nft: NFT): boolean {
  return isNiftyAsset(nft) && nft.collectionId === DANDIES_NIFTY_COLLECTION.toBase58()
}

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

  try {
    const programId = new PublicKey(instruction.programAddress)

    const keys = instruction.accounts.map((acc) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.role >= 2,
      isWritable: acc.role === 1 || acc.role === 3,
    }))

    // Data from Codama is Uint8Array, TransactionInstruction expects Buffer
    const dataArray = instruction.data as Uint8Array
    return new TransactionInstruction({
      programId,
      keys,
      data: Buffer.from(dataArray.buffer, dataArray.byteOffset, dataArray.byteLength),
    })
  } catch (err) {
    console.error("codamaInstructionToWeb3 error:", err)
    console.error(
      "instruction:",
      JSON.stringify(instruction, (_, v) =>
        typeof v === "bigint" ? v.toString() : v instanceof Uint8Array ? Array.from(v) : v
      )
    )
    throw err
  }
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
 * Seeds: ["STAKE", staker_pubkey, nft_mint_pubkey, "stake-record"]
 */
export function getStakeRecordPda(staker: PublicKey, nftMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE"), staker.toBytes(), nftMint.toBytes(), encoder.encode("stake-record")],
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
 * Seeds: ["STAKE", staker_pubkey, nft_mint_pubkey, "nft-record"]
 */
export function getNftRecordPda(staker: PublicKey, nftMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE"), staker.toBytes(), nftMint.toBytes(), encoder.encode("nft-record")],
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
 * Seeds: ["STAKE", staker_pubkey, collection_mint_pubkey, "collection"]
 */
export function getCollectionPda(staker: PublicKey, collectionMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE"), staker.toBytes(), collectionMint.toBytes(), encoder.encode("collection")],
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
 * Seeds: ["program-config"]
 */
export function getProgramConfigPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([encoder.encode("program-config")], STAKE_PROGRAM_ID)
  return pda
}

/**
 * Derives the NftAuthority PDA for a given staker
 *
 * NftAuthority is a PDA that acts as the delegate for staked pNFTs
 * This allows the stake program to control the NFT on behalf of the staker
 *
 * Seeds: ["STAKE", staker_pubkey, "nft-authority"]
 * The bump is stored in the staker account as nftAuthBump
 */
export function getNftAuthorityPda(staker: PublicKey, bump?: number): PublicKey {
  if (bump !== undefined) {
    return PublicKey.createProgramAddressSync(
      [encoder.encode("STAKE"), staker.toBytes(), encoder.encode("nft-authority"), Buffer.from([bump])],
      STAKE_PROGRAM_ID
    )
  }
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE"), staker.toBytes(), encoder.encode("nft-authority")],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the Metadata PDA for a given NFT mint (Token Metadata program)
 * Seeds: ["metadata", metadata_program_id, mint]
 */
export function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("metadata"), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes()],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the Master Edition PDA for a given NFT mint (Token Metadata program)
 * Seeds: ["metadata", metadata_program_id, mint, "edition"]
 */
export function getMasterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("metadata"), TOKEN_METADATA_PROGRAM_ID.toBytes(), mint.toBytes(), encoder.encode("edition")],
    TOKEN_METADATA_PROGRAM_ID
  )
  return pda
}

/**
 * Derives the Token Record PDA for a pNFT (Token Metadata program)
 * Seeds: ["metadata", metadata_program_id, mint, "token_record", token_account]
 */
export function getTokenRecordPda(mint: PublicKey, tokenAccount: PublicKey): PublicKey {
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

/**
 * Derives the NFT Custody PDA for the stake program
 * This is where the NFT is held during staking
 * Seeds: ["nft_custody", staker, nft_mint]
 */
export function getNftCustodyPda(staker: PublicKey, nftMint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("nft_custody"), staker.toBytes(), nftMint.toBytes()],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Input parameters for building stake instructions (pNFT)
 */
export interface BuildStakeInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: string
}

/**
 * Builds the transaction instructions required to stake a pNFT (Programmable NFT)
 *
 * This creates a Stake instruction that:
 * 1. Creates a StakeRecord PDA to track the stake position
 * 2. Optionally creates an NftRecord PDA for points tracking
 * 3. Transfers the NFT to custody and updates token records
 *
 * @param input - The stake parameters including NFT, staker, collection, and owner
 * @returns Array of TransactionInstructions to execute the stake
 */
export function buildStakeInstructions(input: BuildStakeInstructionsInput): TransactionInstruction[] {
  const { nft, staker, collection, owner } = input

  const ownerPubkey = new PublicKey(owner)
  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)

  const stakeRecordPda = getStakeRecordPda(stakerPubkey, nftMint)
  const nftRecordPda = getNftRecordPda(stakerPubkey, nftMint)
  const programConfigPda = getProgramConfigPda()

  // Use hardcoded nftAuthority for Dandies since PDA derivation doesn't match
  const nftAuthorityPda = stakerPubkey.equals(DANDIES_STAKER)
    ? DANDIES_NFT_AUTHORITY
    : getNftAuthorityPda(stakerPubkey, staker.nftAuthBump)

  // pNFT specific accounts
  const nftMetadataPda = getMetadataPda(nftMint)
  const masterEditionPda = getMasterEditionPda(nftMint)

  // User's NFT token account
  const nftToken = getAssociatedTokenAddressSync(nftMint, ownerPubkey)

  // Token record PDAs for pNFT delegation model
  // For delegation: NFT stays in owner's wallet, destinationTokenRecord is derived from nftToken
  const ownerTokenRecordPda = getTokenRecordPda(nftMint, nftToken)
  const destinationTokenRecordPda = getTokenRecordPda(nftMint, nftToken)

  const ix = stake.getStakeInstruction({
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    nftRecord: addr(nftRecordPda),
    stakeRecord: addr(stakeRecordPda),
    programConfig: addr(programConfigPda),
    nftMint: addr(nftMint),
    nftToken: addr(nftToken),
    nftMetadata: addr(nftMetadataPda),
    nftEdition: addr(masterEditionPda),
    ownerTokenRecord: addr(ownerTokenRecordPda),
    destinationTokenRecord: addr(destinationTokenRecordPda),
    nftAuthority: addr(nftAuthorityPda),
    signer: createSigner(ownerPubkey),
    feesWallet: addr(FEES_WALLET),
    associatedTokenProgram: addr(new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)),
    metadataProgram: addr(TOKEN_METADATA_PROGRAM_ID),
    authRules: addr(DANDIES_AUTH_RULES),
    authRulesProgram: addr(TOKEN_AUTH_RULES_PROGRAM_ID),
    selection: null,
  })

  return [codamaInstructionToWeb3(ix)]
}

/**
 * Input parameters for building stake core instructions
 */
export interface BuildStakeCoreInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: string
}

/**
 * Builds the transaction instructions required to stake a Core NFT (Metaplex Core)
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

  const ownerPubkey = new PublicKey(owner)
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
    signer: createSigner(ownerPubkey),
    feesWallet: addr(FEES_WALLET),
    coreProgram: addr(MPL_CORE_PROGRAM_ID),
    selection: null,
  })

  return [codamaInstructionToWeb3(ix)]
}

/**
 * Input parameters for building stake nifty instructions
 */
export interface BuildStakeNiftyInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: string
}

/**
 * Builds the transaction instructions required to stake a Nifty NFT (nifty-oss)
 *
 * This creates a StakeNifty instruction that:
 * 1. Creates a StakeRecord PDA to track the stake position
 * 2. Optionally creates an NftRecord PDA for points tracking
 * 3. Delegates the NFT to the stake program's nftAuthority via nifty-oss
 *
 * @param input - The stake parameters including NFT, staker, collection, and owner
 * @returns Array of TransactionInstructions to execute the stake
 */
export function buildStakeNiftyInstructions(input: BuildStakeNiftyInstructionsInput): TransactionInstruction[] {
  const { nft, staker, collection, owner } = input

  const ownerPubkey = new PublicKey(owner)
  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)

  const stakeRecordPda = getStakeRecordPda(stakerPubkey, nftMint)
  const nftRecordPda = getNftRecordPda(stakerPubkey, nftMint)
  const programConfigPda = getProgramConfigPda()
  const nftAuthorityPda = getNftAuthorityPda(stakerPubkey)

  const ix = stake.getStakeNiftyInstruction({
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    nftRecord: addr(nftRecordPda),
    stakeRecord: addr(stakeRecordPda),
    programConfig: addr(programConfigPda),
    asset: addr(nftMint),
    nftAuthority: addr(nftAuthorityPda),
    signer: createSigner(ownerPubkey),
    feesWallet: addr(FEES_WALLET),
    niftyProgram: addr(NIFTY_PROGRAM_ID),
    selection: null,
  })

  return [codamaInstructionToWeb3(ix)]
}

/**
 * Input parameters for building unstake core instructions
 */
export interface BuildUnstakeCoreInstructionsInput {
  nft: NFT
  stakeRecord: StakeRecordAccount
  staker: StakerAccount
  collection: CollectionAccount
  emissions: EmissionAccount[]
  owner: string
}

/**
 * Builds the transaction instructions required to unstake a Core NFT (Dandies)
 *
 * This creates an UnstakeCore instruction that:
 * 1. Closes the StakeRecord PDA and returns rent to owner
 * 2. Optionally updates the NftRecord PDA with final points
 * 3. Revokes the NFT delegation from the stake program's nftAuthority
 *
 * @param input - The unstake parameters including NFT, stakeRecord, staker, collection, emissions, and owner
 * @returns Array of TransactionInstructions to execute the unstake
 */
export function buildUnstakeCoreInstructions(input: BuildUnstakeCoreInstructionsInput): TransactionInstruction[] {
  const { nft, stakeRecord, staker, collection, emissions, owner } = input

  const ownerPubkey = new PublicKey(owner)
  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)
  const collectionMintPubkey = new PublicKey(collection.collectionMint)
  const stakeRecordPubkey = new PublicKey(stakeRecord.address)

  const programConfigPda = getProgramConfigPda()
  const nftAuthorityPda = getNftAuthorityPda(stakerPubkey)

  // Find token emission for this stake record to get token accounts
  let tokenMintPubkey: PublicKey | undefined
  let stakeTokenVault: PublicKey | undefined
  let rewardReceiveAccount: PublicKey | undefined
  let tokenAuthorityPda: PublicKey | undefined
  let hasPointsEmission = false

  for (const emissionAddress of stakeRecord.emissions) {
    const emission = emissions.find((e) => e.address === emissionAddress)
    if (emission) {
      if (emission.rewardType.__kind === "Points") {
        hasPointsEmission = true
      }
      if (emission.rewardType.__kind === "Token") {
        if (emission.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(emission.tokenMint.value)
        } else if (staker.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(staker.tokenMint.value)
        }
        if (tokenMintPubkey) {
          tokenAuthorityPda = getTokenAuthorityPda(stakerPubkey)
          stakeTokenVault = getAssociatedTokenAddressSync(tokenMintPubkey, tokenAuthorityPda, true)
          rewardReceiveAccount = getAssociatedTokenAddressSync(tokenMintPubkey, ownerPubkey)
        }
      }
    }
  }

  // nftRecord is only needed for Points emissions - don't pass if not needed
  const nftRecordPda = hasPointsEmission ? getNftRecordPda(stakerPubkey, nftMint) : undefined

  const ix = stake.getUnstakeCoreInstruction({
    programConfig: addr(programConfigPda),
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    stakeRecord: addr(stakeRecordPubkey),
    nftRecord: nftRecordPda ? addr(nftRecordPda) : undefined,
    rewardMint: tokenMintPubkey ? addr(tokenMintPubkey) : undefined,
    stakeTokenVault: stakeTokenVault ? addr(stakeTokenVault) : undefined,
    rewardReceiveAccount: rewardReceiveAccount ? addr(rewardReceiveAccount) : undefined,
    nftMint: addr(nftMint),
    collectionMint: addr(collectionMintPubkey),
    feesWallet: addr(FEES_WALLET),
    tokenAuthority: tokenAuthorityPda ? addr(tokenAuthorityPda) : undefined,
    nftAuthority: addr(nftAuthorityPda),
    owner: createSigner(ownerPubkey),
    associatedTokenProgram: addr(new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)),
    coreProgram: addr(MPL_CORE_PROGRAM_ID),
  })

  const web3Ix = codamaInstructionToWeb3(ix)

  // Add emissions as remaining accounts (required by program)
  for (const emissionAddress of stakeRecord.emissions) {
    web3Ix.keys.push({
      pubkey: new PublicKey(emissionAddress),
      isSigner: false,
      isWritable: true,
    })
  }

  return [web3Ix]
}

/**
 * Input parameters for building unstake nifty instructions
 */
export interface BuildUnstakeNiftyInstructionsInput {
  nft: NFT
  stakeRecord: StakeRecordAccount
  staker: StakerAccount
  collection: CollectionAccount
  emissions: EmissionAccount[]
  owner: string
}

/**
 * Builds the transaction instructions required to unstake a Nifty NFT (nifty-oss)
 *
 * This creates an UnstakeNifty instruction that:
 * 1. Closes the StakeRecord PDA and returns rent to owner
 * 2. Optionally updates the NftRecord PDA with final points
 * 3. Revokes the NFT delegation from the stake program's nftAuthority
 *
 * @param input - The unstake parameters including NFT, stakeRecord, staker, collection, emissions, and owner
 * @returns Array of TransactionInstructions to execute the unstake
 */
export function buildUnstakeNiftyInstructions(input: BuildUnstakeNiftyInstructionsInput): TransactionInstruction[] {
  const { nft, stakeRecord, staker, collection, emissions, owner } = input

  const ownerPubkey = new PublicKey(owner)
  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)
  const collectionMintPubkey = new PublicKey(collection.collectionMint)
  const stakeRecordPubkey = new PublicKey(stakeRecord.address)

  const programConfigPda = getProgramConfigPda()
  const nftAuthorityPda = getNftAuthorityPda(stakerPubkey)

  // Find token emission for this stake record to get token accounts
  let tokenMintPubkey: PublicKey | undefined
  let stakeTokenVault: PublicKey | undefined
  let rewardReceiveAccount: PublicKey | undefined
  let tokenAuthorityPda: PublicKey | undefined
  let hasPointsEmission = false

  for (const emissionAddress of stakeRecord.emissions) {
    const emission = emissions.find((e) => e.address === emissionAddress)
    if (emission) {
      if (emission.rewardType.__kind === "Points") {
        hasPointsEmission = true
      }
      if (emission.rewardType.__kind === "Token") {
        if (emission.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(emission.tokenMint.value)
        } else if (staker.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(staker.tokenMint.value)
        }
        if (tokenMintPubkey) {
          tokenAuthorityPda = getTokenAuthorityPda(stakerPubkey)
          stakeTokenVault = getAssociatedTokenAddressSync(tokenMintPubkey, tokenAuthorityPda, true)
          rewardReceiveAccount = getAssociatedTokenAddressSync(tokenMintPubkey, ownerPubkey)
        }
      }
    }
  }

  // nftRecord is only needed for Points emissions - don't pass if not needed
  const nftRecordPda = hasPointsEmission ? getNftRecordPda(stakerPubkey, nftMint) : undefined

  const ix = stake.getUnstakeNiftyInstruction({
    programConfig: addr(programConfigPda),
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    stakeRecord: addr(stakeRecordPubkey),
    nftRecord: nftRecordPda ? addr(nftRecordPda) : undefined,
    rewardMint: tokenMintPubkey ? addr(tokenMintPubkey) : undefined,
    stakeTokenVault: stakeTokenVault ? addr(stakeTokenVault) : undefined,
    rewardReceiveAccount: rewardReceiveAccount ? addr(rewardReceiveAccount) : undefined,
    nftMint: addr(nftMint),
    collectionMint: addr(collectionMintPubkey),
    feesWallet: addr(FEES_WALLET),
    tokenAuthority: tokenAuthorityPda ? addr(tokenAuthorityPda) : undefined,
    nftAuthority: addr(nftAuthorityPda),
    owner: createSigner(ownerPubkey),
    associatedTokenProgram: addr(new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)),
    niftyProgram: addr(NIFTY_PROGRAM_ID),
  })

  const web3Ix = codamaInstructionToWeb3(ix)

  // Add emissions as remaining accounts (required by program)
  for (const emissionAddress of stakeRecord.emissions) {
    web3Ix.keys.push({
      pubkey: new PublicKey(emissionAddress),
      isSigner: false,
      isWritable: true,
    })
  }

  return [web3Ix]
}

/**
 * Input parameters for building unstake instructions (pNFT)
 */
export interface BuildUnstakeInstructionsInput {
  nft: NFT
  stakeRecord: StakeRecordAccount
  staker: StakerAccount
  collection: CollectionAccount
  emissions: EmissionAccount[]
  owner: string
}

/**
 * Builds the transaction instructions required to unstake a pNFT (Programmable NFT)
 *
 * This creates an Unstake instruction that:
 * 1. Closes the StakeRecord PDA and returns rent to owner
 * 2. Transfers the NFT from custody back to the owner
 * 3. Updates token records for pNFT delegation
 *
 * @param input - The unstake parameters including NFT, stakeRecord, staker, collection, emissions, and owner
 * @returns Array of TransactionInstructions to execute the unstake
 */
export function buildUnstakeInstructions(input: BuildUnstakeInstructionsInput): TransactionInstruction[] {
  const { nft, stakeRecord, staker, collection, emissions, owner } = input

  const ownerPubkey = new PublicKey(owner)
  const stakerPubkey = new PublicKey(staker.address)
  const collectionPubkey = new PublicKey(collection.address)
  const nftMint = new PublicKey(nft.mint)
  const stakeRecordPubkey = new PublicKey(stakeRecord.address)

  const programConfigPda = getProgramConfigPda()

  // Use hardcoded nftAuthority for Dandies since PDA derivation doesn't match
  const nftAuthorityPda = stakerPubkey.equals(DANDIES_STAKER)
    ? DANDIES_NFT_AUTHORITY
    : getNftAuthorityPda(stakerPubkey, staker.nftAuthBump)

  // pNFT specific accounts
  const nftMetadataPda = getMetadataPda(nftMint)
  const masterEditionPda = getMasterEditionPda(nftMint)

  // User's NFT token account
  const nftToken = getAssociatedTokenAddressSync(nftMint, ownerPubkey)

  // Token record PDA for pNFT delegation model
  // For delegation: NFT stays in owner's wallet, both token records are the same
  const tokenRecordPda = getTokenRecordPda(nftMint, nftToken)

  // Find token emission for this stake record to get token accounts
  let tokenMintPubkey: PublicKey | undefined
  let stakeTokenVault: PublicKey | undefined
  let rewardReceiveAccount: PublicKey | undefined
  let tokenAuthorityPda: PublicKey | undefined
  let hasPointsEmission = false

  for (const emissionAddress of stakeRecord.emissions) {
    const emission = emissions.find((e) => e.address === emissionAddress)
    if (emission) {
      if (emission.rewardType.__kind === "Points") {
        hasPointsEmission = true
      }
      if (emission.rewardType.__kind === "Token") {
        if (emission.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(emission.tokenMint.value)
        } else if (staker.tokenMint.__option === "Some") {
          tokenMintPubkey = new PublicKey(staker.tokenMint.value)
        }
        if (tokenMintPubkey) {
          tokenAuthorityPda = getTokenAuthorityPda(stakerPubkey)
          stakeTokenVault = getAssociatedTokenAddressSync(tokenMintPubkey, tokenAuthorityPda, true)
          rewardReceiveAccount = getAssociatedTokenAddressSync(tokenMintPubkey, ownerPubkey)
        }
      }
    }
  }

  // nftRecord is only needed for Points emissions - don't pass if not needed
  const nftRecordPda = hasPointsEmission ? getNftRecordPda(stakerPubkey, nftMint) : undefined

  const ix = stake.getUnstakeInstruction({
    programConfig: addr(programConfigPda),
    staker: addr(stakerPubkey),
    collection: addr(collectionPubkey),
    stakeRecord: addr(stakeRecordPubkey),
    nftRecord: nftRecordPda ? addr(nftRecordPda) : undefined,
    rewardMint: tokenMintPubkey ? addr(tokenMintPubkey) : undefined,
    stakeTokenVault: stakeTokenVault ? addr(stakeTokenVault) : undefined,
    rewardReceiveAccount: rewardReceiveAccount ? addr(rewardReceiveAccount) : undefined,
    nftMint: addr(nftMint),
    nftToken: addr(nftToken),
    feesWallet: addr(FEES_WALLET),
    nftMetadata: addr(nftMetadataPda),
    tokenRecord: addr(tokenRecordPda),
    custodyTokenRecord: addr(tokenRecordPda),
    masterEdition: addr(masterEditionPda),
    tokenAuthority: tokenAuthorityPda ? addr(tokenAuthorityPda) : undefined,
    nftAuthority: addr(nftAuthorityPda),
    owner: createSigner(ownerPubkey),
    associatedTokenProgram: addr(new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)),
    metadataProgram: addr(TOKEN_METADATA_PROGRAM_ID),
    authRules: addr(DANDIES_AUTH_RULES),
    authRulesProgram: addr(TOKEN_AUTH_RULES_PROGRAM_ID),
  })

  const web3Ix = codamaInstructionToWeb3(ix)

  // Add emissions as remaining accounts (required by program)
  for (const emissionAddress of stakeRecord.emissions) {
    web3Ix.keys.push({
      pubkey: new PublicKey(emissionAddress),
      isSigner: false,
      isWritable: true,
    })
  }

  return [web3Ix]
}

/**
 * Derives the TokenAuthority PDA for a given staker
 *
 * TokenAuthority is a PDA that controls the stake token vault holding reward tokens.
 * It acts as the mint authority for distributing token rewards to stakers.
 *
 * Seeds: ["STAKE", staker_pubkey, "token-authority"]
 */
export function getTokenAuthorityPda(staker: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [encoder.encode("STAKE"), staker.toBytes(), encoder.encode("token-authority")],
    STAKE_PROGRAM_ID
  )
  return pda
}

/**
 * Input parameters for building claim instructions
 */
export interface BuildClaimInstructionsInput {
  stakeRecord: StakeRecordAccount
  emission: EmissionAccount
  staker: StakerAccount
  collection: CollectionAccount
  owner: string
}

/**
 * Builds the transaction instructions required to claim staking rewards
 *
 * This creates a Claim instruction that:
 * 1. Calculates pending rewards based on stake duration and emission rate
 * 2. Updates the StakeRecord with claimed amounts
 * 3. Transfers reward tokens from the stake vault to the owner's token account
 *
 * For token rewards, this will:
 * - Derive the token authority PDA from the emission
 * - Calculate the stake token vault (ATA of token authority for reward mint)
 * - Create/use the owner's ATA for the reward token
 *
 * @param input - The claim parameters including stakeRecord, emission, staker, collection, and owner
 * @returns Array of TransactionInstructions to execute the claim
 */
export function buildClaimInstructions(input: BuildClaimInstructionsInput): TransactionInstruction[] {
  try {
    const { stakeRecord, emission, staker, collection, owner } = input

    const ownerPubkey = new PublicKey(owner)

    console.log("buildClaimInstructions input:", {
      staker: staker.address,
      stakerTokenMint: staker.tokenMint,
      collection: collection.address,
      emission: emission.address,
      emissionTokenMint: emission.tokenMint,
      emissionRewardType: emission.rewardType,
      stakeRecord: stakeRecord.address,
      nftMint: stakeRecord.nftMint,
      owner: owner,
    })

    const stakerPubkey = new PublicKey(staker.address)
    const collectionPubkey = new PublicKey(collection.address)
    const emissionPubkey = new PublicKey(emission.address)
    const stakeRecordPubkey = new PublicKey(stakeRecord.address)
    const nftMint = new PublicKey(stakeRecord.nftMint)

    const programConfigPda = getProgramConfigPda()
    const tokenAuthorityPda = getTokenAuthorityPda(stakerPubkey)

    // nftRecord is only needed for Points emissions
    const hasPointsEmission = emission.rewardType.__kind === "Points"
    const nftRecordPda = hasPointsEmission ? getNftRecordPda(stakerPubkey, nftMint) : undefined

    let tokenMintPubkey: PublicKey | null = null
    if (emission.tokenMint.__option === "Some") {
      console.log("Using emission tokenMint:", emission.tokenMint.value)
      tokenMintPubkey = new PublicKey(emission.tokenMint.value)
    } else if (emission.rewardType.__kind === "Token" && staker.tokenMint.__option === "Some") {
      console.log("Using staker tokenMint:", staker.tokenMint.value)
      tokenMintPubkey = new PublicKey(staker.tokenMint.value)
    } else {
      console.log("No tokenMint found - emission:", emission.tokenMint, "staker:", staker.tokenMint)
    }

    let stakeTokenVault: PublicKey | null = null
    let rewardReceiveAccount: PublicKey | null = null

    if (tokenMintPubkey) {
      stakeTokenVault = getAssociatedTokenAddressSync(tokenMintPubkey, tokenAuthorityPda, true)
      rewardReceiveAccount = getAssociatedTokenAddressSync(tokenMintPubkey, ownerPubkey)
      console.log("Token accounts:", {
        tokenMint: tokenMintPubkey.toBase58(),
        stakeTokenVault: stakeTokenVault.toBase58(),
        rewardReceiveAccount: rewardReceiveAccount.toBase58(),
      })
    }

    console.log("Building claim instruction with accounts...")
    const ix = stake.getClaimInstruction({
      programConfig: addr(programConfigPda),
      staker: addr(stakerPubkey),
      collection: addr(collectionPubkey),
      emission: addr(emissionPubkey),
      stakeRecord: addr(stakeRecordPubkey),
      nftRecord: nftRecordPda ? addr(nftRecordPda) : undefined,
      feesWallet: addr(FEES_WALLET),
      tokenMint: tokenMintPubkey ? addr(tokenMintPubkey) : undefined,
      stakeTokenVault: stakeTokenVault ? addr(stakeTokenVault) : undefined,
      rewardReceiveAccount: rewardReceiveAccount ? addr(rewardReceiveAccount) : undefined,
      tokenAuthority: addr(tokenAuthorityPda),
      owner: createSigner(ownerPubkey),
      tokenProgram: addr(new PublicKey(TOKEN_PROGRAM_ID)),
      associatedTokenProgram: addr(new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)),
    })

    console.log("Codama instruction built:", ix)
    console.log("Instruction data length:", (ix as CodamaInstruction).data?.length)

    const web3ix = codamaInstructionToWeb3(ix)
    console.log("Web3 instruction built successfully")
    return [web3ix]
  } catch (err) {
    console.error("buildClaimInstructions error:", err)
    console.error("Error stack:", (err as Error).stack)
    throw err
  }
}
