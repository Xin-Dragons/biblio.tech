import { PublicKey } from "@solana/web3.js"

/**
 * Stake Program ID
 * The deployed stake program on Solana mainnet
 */
export const STAKE_PROGRAM_ID = new PublicKey("STAKEQkGBjkhCXabzB5cUbWgSSvbVJFEm2oEnyWzdKE")

const encoder = new TextEncoder()

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
