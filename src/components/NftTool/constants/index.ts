import { publicKey } from "@metaplex-foundation/umi"

export const MAX_TXN_SIZE = 1232
export const SIG_SIZE = 65
export const SYSTEM_PROGRAM_PK = "11111111111111111111111111111111"

export const METAPLEX_RULE_SET = "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
export const METAPLEX_COMPATIBILITY_RULE_SET = "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5"
export const FEES_WALLET = publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!)

export const FEES = {
  "nft-suite": {
    create: {
      basic: 0.01,
      advanced: 0.005,
      pro: 0.0025,
    },
    update: {
      basic: 0.002,
      advanced: 0.001,
      pro: 0.0005,
    },
    batch: {
      basic: 0.002, // 20 sol for 10k
      advanced: 0.001, // 10 sol for 10k
      pro: 0.0005, // 5 sol for 10k
    },
  },
  "token-tool": {
    create: {
      basic: 0.25,
      advanced: 0.125,
      pro: 0.0625,
    },
    update: {
      basic: 0.125,
      advanced: 0.0625,
      pro: 0.03125,
    },
  },
  biblio: {
    send: {
      basic: 0.002,
      advanced: 0.001,
      pro: 0.0005,
    },
    "burn-non-fungible": {
      basic: 0.002,
      advanced: 0.001,
      pro: 0.0005,
    },
    "burn-fungible": {
      basic: 0.0002,
      advanced: 0.0001,
      pro: 0.00005,
    },
    cleanup: {
      basic: 0.0002,
      advanced: 0.0001,
      pro: 0.00005,
    },
  },
}
