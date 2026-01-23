import {
  getProgramDerivedAddress,
  getAddressEncoder,
  type Address,
  type TransactionSigner,
  type Instruction,
} from "@solana/kit"
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token"
import { tokenMetadata, asset, mplCore } from "@biblio/solana-programs"
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

function isNiftyAsset(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "Nifty"
}

function isMplCoreAsset(tokenStandard: TokenStandard): boolean {
  return tokenStandard === "Core"
}

export interface BuildLockInput {
  nft: NFT
  owner: Address
  delegate: Address
  payer: TransactionSigner
}

export async function buildLockInstructions(input: BuildLockInput): Promise<Instruction[]> {
  const { nft, owner, delegate, payer } = input

  const mintAddress = nft.mint as Address

  if (isNiftyAsset(nft.tokenStandard)) {
    return buildNiftyLockInstructions(mintAddress, owner, delegate, payer)
  }

  if (isMplCoreAsset(nft.tokenStandard)) {
    return buildMplCoreLockInstructions(mintAddress, owner, delegate, payer)
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

    const delegateIx = tokenMetadata.getDelegateInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      tokenRecord: tokenRecord,
      mint: mintAddress,
      token: ata,
      authority: createNoopSigner(owner),
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      delegateArgs: { __kind: "UtilityV1", amount: 1, authorizationData: null },
    })

    const lockIx = tokenMetadata.getLockInstruction({
      authority: createNoopSigner(delegate),
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      tokenRecord: tokenRecord,
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      lockArgs: { __kind: "V1", authorizationData: null },
    })

    instructions.push(delegateIx, lockIx)
  } else {
    const delegateIx = tokenMetadata.getDelegateInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      mint: mintAddress,
      token: ata,
      authority: createNoopSigner(owner),
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      delegateArgs: { __kind: "StandardV1", amount: 1 },
    })

    const lockIx = tokenMetadata.getLockInstruction({
      authority: createNoopSigner(delegate),
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      lockArgs: { __kind: "V1", authorizationData: null },
    })

    instructions.push(delegateIx, lockIx)
  }

  return instructions
}

function buildNiftyLockInstructions(
  assetAddress: Address,
  owner: Address,
  delegate: Address,
  _payer: TransactionSigner
): Instruction[] {
  const instructions: Instruction[] = []

  const approveIx = asset.getApproveInstruction({
    asset: assetAddress,
    owner: createNoopSigner(owner),
    delegate: delegate,
    delegateInput: asset.delegateInput("Some", { roles: [asset.DelegateRole.Lock] }),
  })

  const lockIx = asset.getLockInstruction({
    asset: assetAddress,
    signer: createNoopSigner(delegate),
  })

  instructions.push(approveIx, lockIx)

  return instructions
}

export interface BuildUnlockInput {
  nft: NFT
  owner: Address
  delegate: Address
  payer: TransactionSigner
}

export async function buildUnlockInstructions(input: BuildUnlockInput): Promise<Instruction[]> {
  const { nft, owner, delegate, payer } = input

  const mintAddress = nft.mint as Address

  if (isNiftyAsset(nft.tokenStandard)) {
    return buildNiftyUnlockInstructions(mintAddress, owner, delegate)
  }

  if (isMplCoreAsset(nft.tokenStandard)) {
    return buildMplCoreUnlockInstructions(mintAddress, delegate, payer)
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

    const unlockIx = tokenMetadata.getUnlockInstruction({
      authority: createNoopSigner(delegate),
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      tokenRecord: tokenRecord,
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      unlockArgs: { __kind: "V1", authorizationData: null },
    })

    const revokeIx = tokenMetadata.getRevokeInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      tokenRecord: tokenRecord,
      mint: mintAddress,
      token: ata,
      authority: createNoopSigner(owner),
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      revokeArgs: tokenMetadata.RevokeArgs.UtilityV1,
    })

    instructions.push(unlockIx, revokeIx)
  } else {
    const unlockIx = tokenMetadata.getUnlockInstruction({
      authority: createNoopSigner(delegate),
      tokenOwner: owner,
      token: ata,
      mint: mintAddress,
      metadata: metadata,
      edition: edition,
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      unlockArgs: { __kind: "V1", authorizationData: null },
    })

    const revokeIx = tokenMetadata.getRevokeInstruction({
      delegate: delegate,
      metadata: metadata,
      masterEdition: edition,
      mint: mintAddress,
      token: ata,
      authority: createNoopSigner(owner),
      payer: payer,
      splTokenProgram: TOKEN_PROGRAM_ADDRESS,
      revokeArgs: tokenMetadata.RevokeArgs.StandardV1,
    })

    instructions.push(unlockIx, revokeIx)
  }

  return instructions
}

function buildNiftyUnlockInstructions(assetAddress: Address, owner: Address, delegate: Address): Instruction[] {
  const instructions: Instruction[] = []

  const unlockIx = asset.getUnlockInstruction({
    asset: assetAddress,
    signer: createNoopSigner(delegate),
  })

  const revokeIx = asset.getRevokeInstruction({
    asset: assetAddress,
    signer: createNoopSigner(owner),
    delegateInput: asset.delegateInput("Some", { roles: [asset.DelegateRole.Lock] }),
  })

  instructions.push(unlockIx, revokeIx)

  return instructions
}

function buildMplCoreLockInstructions(
  assetAddress: Address,
  owner: Address,
  delegate: Address,
  payer: TransactionSigner
): Instruction[] {
  const isBasicFreeze = owner === delegate
  const initAuthority: mplCore.Authority = isBasicFreeze
    ? { __kind: "Owner" }
    : { __kind: "Address", address: delegate }

  const addPluginIx = mplCore.getAddPluginV1Instruction({
    asset: assetAddress,
    payer: payer,
    authority: createNoopSigner(owner),
    plugin: { __kind: "FreezeDelegate", fields: [{ frozen: true }] },
    initAuthority: initAuthority,
  })

  return [addPluginIx]
}

function buildMplCoreUnlockInstructions(
  assetAddress: Address,
  delegate: Address,
  payer: TransactionSigner
): Instruction[] {
  const removePluginIx = mplCore.getRemovePluginV1Instruction({
    asset: assetAddress,
    payer: payer,
    authority: createNoopSigner(delegate),
    pluginType: mplCore.PluginType.FreezeDelegate,
  })

  return [removePluginIx]
}
