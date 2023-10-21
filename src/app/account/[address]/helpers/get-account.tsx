import { umi } from "@/app/helpers/umi"
import { CheckCross } from "@/components/CheckCross"
import { CopyAddress } from "@/components/CopyAddress"
import {
  MPL_BUBBLEGUM_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  safeFetchMerkleTree,
  safeFetchTreeConfig,
} from "@metaplex-foundation/mpl-bubblegum"
import { MPL_TOKEN_AUTH_RULES_PROGRAM_ID, safeFetchRuleSet } from "@metaplex-foundation/mpl-token-auth-rules"
import {
  Edition,
  Key,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  MasterEdition,
  Metadata,
  TokenRecord,
  safeFetchCollectionAuthorityRecord,
  safeFetchEdition,
  safeFetchEditionMarker,
  safeFetchMasterEdition,
  safeFetchMetadata,
  safeFetchMetadataDelegateRecord,
  safeFetchTokenOwnedEscrow,
  safeFetchTokenRecord,
  safeFetchUseAuthorityRecord,
} from "@metaplex-foundation/mpl-token-metadata"
import {
  Mint,
  SPL_ASSOCIATED_TOKEN_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  Token,
  safeFetchMint,
  safeFetchToken,
} from "@metaplex-foundation/mpl-toolbox"
import { PublicKey, publicKey } from "@metaplex-foundation/umi"
import { TreeConfig } from "../components/TreeConfig"
import { FC } from "react"
import { MerkleTree } from "../components/MerkleTree"
import {
  EditionAccount,
  MasterEditionAccount,
  MetadataAccount,
  MintAccount,
  TokenAccount,
  TokenRecordAccount,
} from "@/app/digital-asset/[mintAddress]/details/page"
import Ruleset from "../components/Ruleset"

const programs = {
  [MPL_TOKEN_METADATA_PROGRAM_ID]: {
    title: "Token metadata",
    accounts: [
      {
        type: "Master edition",
        func: safeFetchMasterEdition,
        Component: ({ data }: { data: MasterEdition }) => <MasterEditionAccount account={data} />,
      },
      {
        type: "Metadata",
        func: safeFetchMetadata,
        Component: ({ data }: { data: Metadata }) => <MetadataAccount account={data} />,
      },
      {
        type: "Token record",
        func: safeFetchTokenRecord,
        Component: ({ data }: { data: TokenRecord }) => <TokenRecordAccount account={data} />,
      },

      {
        type: "Edition",
        func: safeFetchEdition,
        Component: ({ data }: { data: Edition }) => <EditionAccount account={data} />,
      },
    ],
  },
  [MPL_TOKEN_AUTH_RULES_PROGRAM_ID]: {
    title: "Token auth rules",
    accounts: [
      {
        type: "Ruleset",
        func: safeFetchRuleSet,
        Component: Ruleset,
      },
    ],
  },
  [SPL_TOKEN_PROGRAM_ID]: {
    title: "SPL Token",
    accounts: [
      {
        type: "Token",
        func: safeFetchToken,
        Component: ({ data }: { data: Token }) => <TokenAccount account={data} />,
      },
      {
        type: "Mint",
        func: safeFetchMint,
        Component: ({ data }: { data: Mint }) => <MintAccount account={data} />,
      },
    ],
  },
  [SPL_ASSOCIATED_TOKEN_PROGRAM_ID]: {
    title: "SPL associated token",
    accounts: [
      {
        type: "Token",
        func: safeFetchToken,
        Component: ({ data }: { data: Token }) => <TokenAccount account={data} />,
      },
    ],
  },
  [SPL_ACCOUNT_COMPRESSION_PROGRAM_ID]: {
    title: "SPL compression",
    accounts: [
      {
        type: "Merkle tree",
        func: safeFetchMerkleTree,
        Component: MerkleTree,
      },
    ],
  },
  [MPL_BUBBLEGUM_PROGRAM_ID]: {
    title: "Bubblegum",
    accounts: [
      {
        type: "Tree config",
        func: safeFetchTreeConfig,
        Component: TreeConfig,
      },
    ],
  },
}

const TokenMetadata = {
  Uninitialized: null,
  EditionV1: {
    fetch: safeFetchEdition,
    Component: ({ data }: { data: Edition }) => <EditionAccount account={data} />,
  },
  MasterEditionV1: {
    fetch: safeFetchMasterEdition,
    Component: ({ data }: { data: MasterEdition }) => <MasterEditionAccount account={data} />,
  },
  ReservationListV1: null,
  MetadataV1: {
    fetch: safeFetchMetadata,
    Component: ({ data }: { data: Metadata }) => <MetadataAccount account={data} />,
  },
  ReservationListV2: null,
  MasterEditionV2: {
    fetch: safeFetchMasterEdition,
    Component: ({ data }: { data: MasterEdition }) => <MasterEditionAccount account={data} />,
  },
  EditionMarker: {
    fetch: safeFetchEditionMarker,
  },
  UseAuthorityRecord: {
    fetch: safeFetchUseAuthorityRecord,
  },
  CollectionAuthorityRecord: {
    fetch: safeFetchCollectionAuthorityRecord,
  },
  TokenOwnedEscrow: {
    fetch: safeFetchTokenOwnedEscrow,
  },
  TokenRecord: {
    fetch: safeFetchTokenRecord,
    Component: ({ data }: { data: TokenRecord }) => <TokenRecordAccount account={data} />,
  },
  MetadataDelegate: {
    fetch: safeFetchMetadataDelegateRecord,
  },
  EditionMarkerV2: {
    fetch: safeFetchEditionMarker,
  },
}

async function getAccountData(
  pk: PublicKey,
  functions: { type: string; func: Function; Component?: FC<any> }[],
  index = 0
) {
  try {
    const item = functions[index]
    const data = await item.func(umi, pk)
    return { data, type: item.type, Component: item.Component, title: functions }
  } catch {
    if (functions[index + 1]) {
      return getAccountData(pk, functions, index + 1)
    } else {
      return null
    }
  }
}

export async function getAccount(address: string) {
  const account = await umi.rpc.getAccount(publicKey(address))
  if (!account.exists) {
    return null
  }

  const program = programs[account.owner]

  if (program) {
    const accountData = await getAccountData(account.publicKey, program.accounts)
    if (accountData?.data.key && program.title === "Token metadata") {
      const key = Key[accountData.data.key]
      const acc = TokenMetadata[key as keyof typeof TokenMetadata] as any
      if (acc) {
        let data
        try {
          data = await acc.fetch(umi, account.publicKey)
        } catch {
          data = {}
        }
        return {
          program: program.title,
          parsed: true,
          data,
          type: key,
          Component: acc.Component,
          logo: "/metaplex.png",
        }
      }
    }

    return {
      program: program.title,
      parsed: true,
      ...accountData,
    }
  }

  if (
    ["BPFLoaderUpgradeab1e11111111111111111111111", "BPFLoader2111111111111111111111111111111111"].includes(
      account.owner
    )
  ) {
    return {
      program: "BPF Loader",
      type: "Solana program",
      parsed: false,
      data: {
        header: {
          executable: account.executable,
          owner: account.owner,
          lamports: account.lamports,
          rentEpoch: account.rentEpoch,
        },
        publicKey: account.publicKey,
        data: account.data,
      },
    }
  }

  if (account.owner === "NativeLoader1111111111111111111111111111111") {
    return {
      program: "Native Loader",
      type: "Solana program",
      parsed: false,
      data: {
        header: {
          executable: account.executable,
          owner: account.owner,
          lamports: account.lamports,
          rentEpoch: account.rentEpoch,
        },
        publicKey: account.publicKey,
        data: account.data,
      },
    }
  }

  return {
    program: "Unknown",
    type: "Unknown",
    parsed: false,
    data: {
      header: {
        executable: account.executable,
        owner: account.owner,
        lamports: account.lamports,
        rentEpoch: account.rentEpoch,
      },
      publicKey: account.publicKey,
      data: account.data,
    },
  }
}
