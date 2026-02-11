import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type TransactionSigner,
  type Instruction,
} from "@solana/kit"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS, getCloseAccountInstruction } from "@solana-program/token"
import { tokenMetadata, asset, mplCore } from "@biblio/solana-programs"
import type { NFT, TokenStandard } from "../stores/nfts"

const TOKEN_METADATA_PROGRAM_ADDRESS = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as Address

export function createNoopSigner<T extends string = string>(address: Address<T>): TransactionSigner<T> {
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

function isNiftyAsset(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "Nifty"
}

function isMplCoreAsset(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "Core"
}

const AUTH_RULES_PROGRAM_ADDRESS = "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg" as Address

export interface BuildLockInput {
  nft: NFT
  owner: Address
  delegate: Address
  signers: Map<string, TransactionSigner>
}

export async function buildLockInstructions(input: BuildLockInput): Promise<Instruction[]> {
  const { nft, owner, delegate, signers } = input

  const mintAddress = nft.mint as Address
  const ownerSigner = getOrCreateSigner(signers, owner)
  const delegateSigner = getOrCreateSigner(signers, delegate)

  if (isNiftyAsset(nft.tokenStandard)) {
    return buildNiftyLockInstructionsWithSigners(mintAddress, ownerSigner, delegateSigner)
  }

  if (isMplCoreAsset(nft.tokenStandard)) {
    return buildMplCoreLockInstructionsWithSigners(mintAddress, ownerSigner, delegateSigner)
  }

  const isPnft = isProgrammableNft(nft.tokenStandard)

  const [ata] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const metadata = await getMetadataPda(mintAddress)
  const edition = await getMasterEditionPda(mintAddress)

  const instructions: Instruction[] = []

  if (isPnft) {
    const tokenRecord = await getTokenRecordPda(mintAddress, ata)
    const hasRuleSet = !!nft.ruleSet

    const delegateIx = tokenMetadata.getDelegateInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      tokenRecord: tokenRecord,
      mint: mintAddress,
      token: ata,
      authority: ownerSigner,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      delegateArgs: { __kind: "UtilityV1", amount: 1, authorizationData: null },
      ...(hasRuleSet && {
        authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
        authorizationRules: nft.ruleSet as Address,
      }),
    })

    const lockIx = tokenMetadata.getLockInstruction({
      authority: delegateSigner,
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      tokenRecord: tokenRecord,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      lockArgs: { __kind: "V1", authorizationData: null },
      ...(hasRuleSet && {
        authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
        authorizationRules: nft.ruleSet as Address,
      }),
    })

    instructions.push(delegateIx, lockIx)
  } else {
    const delegateIx = tokenMetadata.getDelegateInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      mint: mintAddress,
      token: ata,
      authority: ownerSigner,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      delegateArgs: { __kind: "StandardV1", amount: 1 },
    })

    const lockIx = tokenMetadata.getLockInstruction({
      authority: delegateSigner,
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      lockArgs: { __kind: "V1", authorizationData: null },
    })

    instructions.push(delegateIx, lockIx)
  }

  return instructions
}

function buildNiftyLockInstructionsWithSigners(
  assetAddress: Address,
  ownerSigner: TransactionSigner,
  delegateSigner: TransactionSigner
): Instruction[] {
  const approveIx = asset.getApproveInstruction({
    asset: assetAddress,
    owner: ownerSigner,
    delegate: delegateSigner.address,
    delegateInput: asset.delegateInput("Some", { roles: [asset.DelegateRole.Lock] }),
  })

  const lockIx = asset.getLockInstruction({
    asset: assetAddress,
    signer: delegateSigner,
  })

  return [approveIx, lockIx]
}

export interface BuildUnlockInput {
  nft: NFT
  owner: Address
  delegate: Address
  signers: Map<string, TransactionSigner>
}

function getOrCreateSigner(signers: Map<string, TransactionSigner>, address: Address): TransactionSigner {
  const existing = signers.get(address)
  if (existing) return existing
  const signer = createNoopSigner(address)
  signers.set(address, signer)
  return signer
}

export async function buildUnlockInstructions(input: BuildUnlockInput): Promise<Instruction[]> {
  const { nft, owner, delegate, signers } = input

  const mintAddress = nft.mint as Address

  const ownerSigner = getOrCreateSigner(signers, owner)
  const delegateSigner = getOrCreateSigner(signers, delegate)

  if (isNiftyAsset(nft.tokenStandard)) {
    return buildNiftyUnlockInstructionsWithSigners(mintAddress, ownerSigner, delegateSigner)
  }

  if (isMplCoreAsset(nft.tokenStandard)) {
    return buildMplCoreUnlockInstructionsWithSigners(mintAddress, delegateSigner, ownerSigner)
  }

  const isPnft = isProgrammableNft(nft.tokenStandard)

  const [ata] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: owner,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  })

  const metadata = await getMetadataPda(mintAddress)
  const edition = await getMasterEditionPda(mintAddress)

  const instructions: Instruction[] = []

  if (isPnft) {
    const tokenRecord = await getTokenRecordPda(mintAddress, ata)
    const hasRuleSet = !!nft.ruleSet

    const unlockIx = tokenMetadata.getUnlockInstruction({
      authority: delegateSigner,
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      tokenRecord: tokenRecord,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      unlockArgs: { __kind: "V1", authorizationData: null },
      ...(hasRuleSet && {
        authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
        authorizationRules: nft.ruleSet as Address,
      }),
    })

    const revokeIx = tokenMetadata.getRevokeInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      tokenRecord: tokenRecord,
      mint: mintAddress,
      token: ata,
      authority: ownerSigner,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      revokeArgs: tokenMetadata.RevokeArgs.UtilityV1,
      ...(hasRuleSet && {
        authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
        authorizationRules: nft.ruleSet as Address,
      }),
    })

    instructions.push(unlockIx, revokeIx)
  } else {
    const unlockIx = tokenMetadata.getUnlockInstruction({
      authority: delegateSigner,
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      unlockArgs: { __kind: "V1", authorizationData: null },
    })

    const revokeIx = tokenMetadata.getRevokeInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      mint: mintAddress,
      token: ata,
      authority: ownerSigner,
      payer: ownerSigner,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      revokeArgs: tokenMetadata.RevokeArgs.StandardV1,
    })

    instructions.push(unlockIx, revokeIx)
  }

  return instructions
}

function buildNiftyUnlockInstructionsWithSigners(
  assetAddress: Address,
  ownerSigner: TransactionSigner,
  delegateSigner: TransactionSigner
): Instruction[] {
  const unlockIx = asset.getUnlockInstruction({
    asset: assetAddress,
    signer: delegateSigner,
  })

  const revokeIx = asset.getRevokeInstruction({
    asset: assetAddress,
    signer: ownerSigner,
    delegateInput: asset.delegateInput("Some", { roles: [asset.DelegateRole.Lock] }),
  })

  return [unlockIx, revokeIx]
}

function buildMplCoreLockInstructionsWithSigners(
  assetAddress: Address,
  ownerSigner: TransactionSigner,
  delegateSigner: TransactionSigner
): Instruction[] {
  const isBasicFreeze = ownerSigner.address === delegateSigner.address
  const initAuthority: mplCore.Authority = isBasicFreeze
    ? { __kind: "Owner" }
    : { __kind: "Address", address: delegateSigner.address }

  const addPluginIx = mplCore.getAddPluginV1Instruction({
    asset: assetAddress,
    payer: ownerSigner,
    authority: ownerSigner,
    plugin: { __kind: "FreezeDelegate", fields: [{ frozen: true }] },
    initAuthority: initAuthority,
  })

  return [addPluginIx]
}

function buildMplCoreUnlockInstructionsWithSigners(
  assetAddress: Address,
  delegateSigner: TransactionSigner,
  payerSigner: TransactionSigner
): Instruction[] {
  const removePluginIx = mplCore.getRemovePluginV1Instruction({
    asset: assetAddress,
    payer: payerSigner,
    authority: delegateSigner,
    pluginType: mplCore.PluginType.FreezeDelegate,
  })

  return [removePluginIx]
}

export interface BuildTransferInput {
  nft: NFT
  owner: Address
  destination: Address
  signers: Map<string, TransactionSigner>
}

export async function buildTransferInstructions(input: BuildTransferInput): Promise<Instruction[]> {
  const { nft, owner, destination, signers } = input
  const mintAddress = nft.mint as Address
  const ownerSigner = getOrCreateSigner(signers, owner)

  if (isNiftyAsset(nft.tokenStandard)) {
    return [asset.getTransferInstruction({ asset: mintAddress, signer: ownerSigner, recipient: destination })]
  }

  if (isMplCoreAsset(nft.tokenStandard)) {
    return [mplCore.getTransferV1Instruction({
      asset: mintAddress,
      payer: ownerSigner,
      authority: ownerSigner,
      newOwner: destination,
      compressionProof: null,
    })]
  }

  const [sourceAta] = await findAssociatedTokenPda({ mint: mintAddress, owner, tokenProgram: TOKEN_PROGRAM_ADDRESS })
  const [destAta] = await findAssociatedTokenPda({ mint: mintAddress, owner: destination, tokenProgram: TOKEN_PROGRAM_ADDRESS })
  const metadata = await getMetadataPda(mintAddress)
  const edition = await getMasterEditionPda(mintAddress)

  const isPnft = isProgrammableNft(nft.tokenStandard)
  const hasRuleSet = !!nft.ruleSet

  const transferIx = tokenMetadata.getTransferInstruction({
    token: sourceAta,
    tokenOwner: owner,
    destination: destAta,
    destinationOwner: destination,
    mint: mintAddress,
    metadata,
    edition,
    authority: ownerSigner,
    payer: ownerSigner,
    transferArgs: { __kind: "V1", amount: 1, authorizationData: null },
    ...(isPnft && {
      ownerTokenRecord: await getTokenRecordPda(mintAddress, sourceAta),
      destinationTokenRecord: await getTokenRecordPda(mintAddress, destAta),
    }),
    ...(hasRuleSet && {
      authorizationRulesProgram: AUTH_RULES_PROGRAM_ADDRESS,
      authorizationRules: nft.ruleSet as Address,
    }),
  })

  const closeIx = getCloseAccountInstruction({ account: sourceAta, destination, owner: ownerSigner })

  return [transferIx, closeIx]
}
