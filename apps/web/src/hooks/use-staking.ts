import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type Instruction,
  type AccountMeta,
} from "@solana/kit"
import { createNoopSigner } from "@/lib/vault-transactions"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { stake } from "@biblio/solana-programs"

export const STAKE_PROGRAM_ADDRESS = stake.STAKE_PROGRAM_ADDRESS
import type { NFT } from "../stores/nfts"
import {
  getEmissionAddresses,
  type CollectionAccount,
  type EmissionAccount,
  type StakerAccount,
  type StakeRecordAccount,
} from "../stores/stake"

export const MPL_CORE_PROGRAM_ADDRESS = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d" as Address
export const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address
export const TOKEN_AUTH_RULES_PROGRAM_ADDRESS = "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg" as Address
export const FEES_WALLET_ADDRESS = "2NkHMEEKymjrjjd9DSEprVV4E7nBr6aHzwFeusHxL2Q6" as Address
export const DANDIES_AUTH_RULES_ADDRESS = "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9" as Address
export const DANDIES_STAKER_ADDRESS = "6FEajGRvukmZyLxoUrpCXzMbSHeiSHWBhRqN5mTj4T8a" as Address
export const DANDIES_NFT_AUTHORITY_ADDRESS = "HSRNyULArR9zpyPfncYMezYrfBvPNUzvLYzJPppCxgYM" as Address
export const NIFTY_PROGRAM_ADDRESS = "AssetGtQBTSgm5s91d1RAQod5JmaZiJDxqsgtqrZud73" as Address
export const DANDIES_NIFTY_COLLECTION_ADDRESS = "BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF" as Address
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL" as Address

export function isNiftyAsset(nft: NFT): boolean {
  return nft.tokenStandard === "Nifty"
}

export function isNiftyDandy(nft: NFT): boolean {
  return isNiftyAsset(nft) && nft.collectionId === DANDIES_NIFTY_COLLECTION_ADDRESS
}

interface TokenEmissionAccounts {
  tokenMint: Address | undefined
  stakeTokenVault: Address | undefined
  rewardReceiveAccount: Address | undefined
  tokenAuthority: Address | undefined
  hasPointsEmission: boolean
}

async function resolveTokenEmissionAccounts(
  stakeRecord: StakeRecordAccount,
  emissions: EmissionAccount[],
  staker: StakerAccount,
  stakerAddress: Address,
  ownerAddress: Address
): Promise<TokenEmissionAccounts> {
  let tokenMint: Address | undefined
  let stakeTokenVault: Address | undefined
  let rewardReceiveAccount: Address | undefined
  let tokenAuthority: Address | undefined
  let hasPointsEmission = false

  for (const emissionAddress of stakeRecord.emissions) {
    const emission = emissions.find((e) => e.address === emissionAddress)
    if (emission) {
      if (emission.rewardType.__kind === "Points") {
        hasPointsEmission = true
      }
      if (emission.rewardType.__kind === "Token") {
        if (emission.tokenMint.__option === "Some") {
          tokenMint = emission.tokenMint.value as Address
        } else if (staker.tokenMint.__option === "Some") {
          tokenMint = staker.tokenMint.value as Address
        }
        if (tokenMint) {
          tokenAuthority = await getTokenAuthorityPda(stakerAddress)
          const [vaultPda] = await findAssociatedTokenPda({
            mint: tokenMint,
            owner: tokenAuthority,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
          })
          stakeTokenVault = vaultPda
          const [rewardPda] = await findAssociatedTokenPda({
            mint: tokenMint,
            owner: ownerAddress,
            tokenProgram: TOKEN_PROGRAM_ADDRESS,
          })
          rewardReceiveAccount = rewardPda
        }
      }
    }
  }

  return {
    tokenMint,
    stakeTokenVault,
    rewardReceiveAccount,
    tokenAuthority,
    hasPointsEmission,
  }
}

export async function getStakeRecordPda(staker: Address, nftMint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["STAKE", getAddressEncoder().encode(staker), getAddressEncoder().encode(nftMint), "stake-record"],
  })
  return pda
}

/**
 * Fetches a stake record account via the API
 */
export async function fetchStakeRecord(nftMint: string): Promise<StakeRecordAccount | null> {
  try {
    const response = await fetch(`/api/stake/record/${nftMint}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch stake record: ${response.status}`)
    }

    const data = (await response.json()) as {
      address: string
      staker: string
      owner: string
      nftMint: string
      stakedAt: string
      pendingClaim: string
      emissions: string[]
      bump: number
    }

    return {
      address: data.address as Address,
      staker: data.staker,
      owner: data.owner,
      nftMint: data.nftMint,
      stakedAt: BigInt(data.stakedAt),
      pendingClaim: BigInt(data.pendingClaim),
      emissions: data.emissions,
      bump: data.bump,
    }
  } catch (error) {
    console.error("Failed to fetch stake record:", error)
    return null
  }
}

export async function getNftRecordPda(staker: Address, nftMint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["STAKE", getAddressEncoder().encode(staker), getAddressEncoder().encode(nftMint), "nft-record"],
  })
  return pda
}

export async function getCollectionPda(staker: Address, collectionMint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["STAKE", getAddressEncoder().encode(staker), getAddressEncoder().encode(collectionMint), "collection"],
  })
  return pda
}

export async function getProgramConfigPda(): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["program-config"],
  })
  return pda
}

export async function getNftAuthorityPda(staker: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["STAKE", getAddressEncoder().encode(staker), "nft-authority"],
  })
  return pda
}

export async function getMetadataPda(mint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: TOKEN_METADATA_PROGRAM_ADDRESS,
    seeds: ["metadata", getAddressEncoder().encode(TOKEN_METADATA_PROGRAM_ADDRESS), getAddressEncoder().encode(mint)],
  })
  return pda
}

export async function getMasterEditionPda(mint: Address): Promise<Address> {
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

export async function getTokenRecordPda(mint: Address, tokenAccount: Address): Promise<Address> {
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

export async function getNftCustodyPda(staker: Address, nftMint: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["nft_custody", getAddressEncoder().encode(staker), getAddressEncoder().encode(nftMint)],
  })
  return pda
}

export async function getTokenAuthorityPda(staker: Address): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress: STAKE_PROGRAM_ADDRESS,
    seeds: ["STAKE", getAddressEncoder().encode(staker), "token-authority"],
  })
  return pda
}

export interface BuildStakeInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: Address
}

export async function buildStakeInstructions(input: BuildStakeInstructionsInput): Promise<Instruction[]> {
  const { nft, staker, collection, owner } = input

  const stakerAddress = staker.address as Address
  const collectionAddress = collection.address as Address
  const nftMint = nft.mint as Address

  const stakeRecordPda = await getStakeRecordPda(stakerAddress, nftMint)
  const nftRecordPda = await getNftRecordPda(stakerAddress, nftMint)
  const programConfigPda = await getProgramConfigPda()

  const nftAuthorityPda =
    stakerAddress === DANDIES_STAKER_ADDRESS ? DANDIES_NFT_AUTHORITY_ADDRESS : await getNftAuthorityPda(stakerAddress)

  const nftMetadataPda = await getMetadataPda(nftMint)
  const masterEditionPda = await getMasterEditionPda(nftMint)

  const [nftToken] = await findAssociatedTokenPda({
    mint: nftMint,
    owner: owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const ownerTokenRecordPda = await getTokenRecordPda(nftMint, nftToken)
  const destinationTokenRecordPda = await getTokenRecordPda(nftMint, nftToken)

  const ix = stake.getStakeInstruction({
    staker: stakerAddress,
    collection: collectionAddress,
    nftRecord: nftRecordPda,
    stakeRecord: stakeRecordPda,
    programConfig: programConfigPda,
    nftMint: nftMint,
    nftToken: nftToken,
    nftMetadata: nftMetadataPda,
    nftEdition: masterEditionPda,
    ownerTokenRecord: ownerTokenRecordPda,
    destinationTokenRecord: destinationTokenRecordPda,
    nftAuthority: nftAuthorityPda,
    signer: createNoopSigner(owner),
    feesWallet: FEES_WALLET_ADDRESS,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    metadataProgram: TOKEN_METADATA_PROGRAM_ADDRESS,
    authRules: DANDIES_AUTH_RULES_ADDRESS,
    authRulesProgram: TOKEN_AUTH_RULES_PROGRAM_ADDRESS,
    selection: null,
  })

  const emissionAccounts: AccountMeta[] = getEmissionAddresses(collection).map((addr) => ({
    address: addr as Address,
    role: 1,
  }))

  return [
    {
      ...ix,
      accounts: [...ix.accounts, ...emissionAccounts],
    },
  ]
}

export interface BuildStakeNiftyInstructionsInput {
  nft: NFT
  staker: StakerAccount
  collection: CollectionAccount
  owner: Address
}

export async function buildStakeNiftyInstructions(input: BuildStakeNiftyInstructionsInput): Promise<Instruction[]> {
  const { nft, staker, collection, owner } = input

  const stakerAddress = staker.address as Address
  const collectionAddress = collection.address as Address
  const nftMint = nft.mint as Address

  const stakeRecordPda = await getStakeRecordPda(stakerAddress, nftMint)
  const nftRecordPda = await getNftRecordPda(stakerAddress, nftMint)
  const programConfigPda = await getProgramConfigPda()
  const nftAuthorityPda = await getNftAuthorityPda(stakerAddress)

  const ix = stake.getStakeNiftyInstruction({
    staker: stakerAddress,
    collection: collectionAddress,
    nftRecord: nftRecordPda,
    stakeRecord: stakeRecordPda,
    programConfig: programConfigPda,
    asset: nftMint,
    nftAuthority: nftAuthorityPda,
    signer: createNoopSigner(owner),
    feesWallet: FEES_WALLET_ADDRESS,
    niftyProgram: NIFTY_PROGRAM_ADDRESS,
    selection: null,
  })

  const emissionAccounts: AccountMeta[] = getEmissionAddresses(collection).map((addr) => ({
    address: addr as Address,
    role: 1,
  }))

  return [
    {
      ...ix,
      accounts: [...ix.accounts, ...emissionAccounts],
    },
  ]
}

export interface BuildUnstakeNiftyInstructionsInput {
  nft: NFT
  stakeRecord: StakeRecordAccount
  staker: StakerAccount
  collection: CollectionAccount
  emissions: EmissionAccount[]
  owner: Address
}

export async function buildUnstakeNiftyInstructions(input: BuildUnstakeNiftyInstructionsInput): Promise<Instruction[]> {
  const { nft, stakeRecord, staker, collection, emissions, owner } = input

  const stakerAddress = staker.address as Address
  const collectionAddress = collection.address as Address
  const nftMint = nft.mint as Address
  const collectionMint = collection.collectionMint as Address
  const stakeRecordAddress = stakeRecord.address as Address

  const programConfigPda = await getProgramConfigPda()
  const nftAuthorityPda = await getNftAuthorityPda(stakerAddress)

  const { tokenMint, stakeTokenVault, rewardReceiveAccount, tokenAuthority, hasPointsEmission } =
    await resolveTokenEmissionAccounts(stakeRecord, emissions, staker, stakerAddress, owner)

  const nftRecordPda = hasPointsEmission ? await getNftRecordPda(stakerAddress, nftMint) : undefined

  const ix = stake.getUnstakeNiftyInstruction({
    programConfig: programConfigPda,
    staker: stakerAddress,
    collection: collectionAddress,
    stakeRecord: stakeRecordAddress,
    nftRecord: nftRecordPda,
    rewardMint: tokenMint,
    stakeTokenVault: stakeTokenVault,
    rewardReceiveAccount: rewardReceiveAccount,
    nftMint: nftMint,
    collectionMint: collectionMint,
    feesWallet: FEES_WALLET_ADDRESS,
    tokenAuthority: tokenAuthority,
    nftAuthority: nftAuthorityPda,
    owner: createNoopSigner(owner),
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    niftyProgram: NIFTY_PROGRAM_ADDRESS,
  })

  const emissionAccounts: AccountMeta[] = stakeRecord.emissions.map((addr) => ({
    address: addr as Address,
    role: 1,
  }))

  return [
    {
      ...ix,
      accounts: [...ix.accounts, ...emissionAccounts],
    },
  ]
}

export interface BuildUnstakeInstructionsInput {
  nft: NFT
  stakeRecord: StakeRecordAccount
  staker: StakerAccount
  collection: CollectionAccount
  emissions: EmissionAccount[]
  owner: Address
}

export async function buildUnstakeInstructions(input: BuildUnstakeInstructionsInput): Promise<Instruction[]> {
  const { nft, stakeRecord, staker, collection, emissions, owner } = input

  const stakerAddress = staker.address as Address
  const collectionAddress = collection.address as Address
  const nftMint = nft.mint as Address
  const stakeRecordAddress = stakeRecord.address as Address

  const programConfigPda = await getProgramConfigPda()

  const nftAuthorityPda =
    stakerAddress === DANDIES_STAKER_ADDRESS ? DANDIES_NFT_AUTHORITY_ADDRESS : await getNftAuthorityPda(stakerAddress)

  const nftMetadataPda = await getMetadataPda(nftMint)
  const masterEditionPda = await getMasterEditionPda(nftMint)

  const [nftToken] = await findAssociatedTokenPda({
    mint: nftMint,
    owner: owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const tokenRecordPda = await getTokenRecordPda(nftMint, nftToken)

  const { tokenMint, stakeTokenVault, rewardReceiveAccount, tokenAuthority, hasPointsEmission } =
    await resolveTokenEmissionAccounts(stakeRecord, emissions, staker, stakerAddress, owner)

  const nftRecordPda = hasPointsEmission ? await getNftRecordPda(stakerAddress, nftMint) : undefined

  const ix = stake.getUnstakeInstruction({
    programConfig: programConfigPda,
    staker: stakerAddress,
    collection: collectionAddress,
    stakeRecord: stakeRecordAddress,
    nftRecord: nftRecordPda,
    rewardMint: tokenMint,
    stakeTokenVault: stakeTokenVault,
    rewardReceiveAccount: rewardReceiveAccount,
    nftMint: nftMint,
    nftToken: nftToken,
    feesWallet: FEES_WALLET_ADDRESS,
    nftMetadata: nftMetadataPda,
    tokenRecord: tokenRecordPda,
    custodyTokenRecord: tokenRecordPda,
    masterEdition: masterEditionPda,
    tokenAuthority: tokenAuthority,
    nftAuthority: nftAuthorityPda,
    owner: createNoopSigner(owner),
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    metadataProgram: TOKEN_METADATA_PROGRAM_ADDRESS,
    authRules: DANDIES_AUTH_RULES_ADDRESS,
    authRulesProgram: TOKEN_AUTH_RULES_PROGRAM_ADDRESS,
  })

  const emissionAccounts: AccountMeta[] = stakeRecord.emissions.map((addr) => ({
    address: addr as Address,
    role: 1,
  }))

  return [
    {
      ...ix,
      accounts: [...ix.accounts, ...emissionAccounts],
    },
  ]
}
