import { publicKey, sol } from "@metaplex-foundation/umi"

export const MAX_TOKENS = BigInt("18446744073709551615")
export const DANDIES_COLLECTION = publicKey("CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys")

export const MAX_TXN_SIZE = 1232
export const SIG_SIZE = 65
export const SYSTEM_PROGRAM_PK = "11111111111111111111111111111111"

export const METAPLEX_RULE_SET = "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
export const METAPLEX_COMPATIBILITY_RULE_SET = "AdH2Utn6Fus15ZhtenW4hZBQnvtLgM1YCW2MfVp7pYS5"
export const TOKEN_METADATA = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
export const FEES_WALLET = publicKey(process.env.NEXT_PUBLIC_FEES_WALLET!)

export enum AccessLevel {
  BASIC,
  ADVANCED,
  PRO,
  UNLIMITED,
}

export const FEES = {
  create: {
    [AccessLevel.BASIC]: sol(0.02),
    [AccessLevel.ADVANCED]: sol(0.01),
    [AccessLevel.PRO]: sol(0.005),
  },
  update: {
    [AccessLevel.BASIC]: sol(0.01),
    [AccessLevel.ADVANCED]: sol(0.005),
    [AccessLevel.PRO]: sol(0.0025),
  },
  batch: {
    [AccessLevel.BASIC]: sol(0.005), // 50 sol for 10k
    [AccessLevel.ADVANCED]: sol(0.0025), // 25 sol for 10k
    [AccessLevel.PRO]: sol(0.00125), // 12.5 sol for 10k
  },
  BURN: {
    [AccessLevel.BASIC]: sol(0.002),
    [AccessLevel.ADVANCED]: sol(0.001),
    [AccessLevel.PRO]: sol(0.0005),
  },
  BURN_FUNGIBLE: {
    [AccessLevel.BASIC]: sol(0.001),
    [AccessLevel.ADVANCED]: sol(0.0005),
    [AccessLevel.PRO]: sol(0.00025),
  },
  SEND: {
    [AccessLevel.BASIC]: sol(0.002),
    [AccessLevel.ADVANCED]: sol(0.001),
    [AccessLevel.PRO]: sol(0.0005),
  },
  LOCK: {
    [AccessLevel.BASIC]: sol(0.01),
    [AccessLevel.ADVANCED]: sol(0.005),
    [AccessLevel.PRO]: sol(0.0025),
  },
  SECURE_LOCK: {
    [AccessLevel.BASIC]: sol(0.02),
    [AccessLevel.ADVANCED]: sol(0.01),
    [AccessLevel.PRO]: sol(0.005),
  },
}

export const MARKETPLACES = {
  TENSOR: ["TCOMP", "TENSORBID", "TENSORSWAP", "Tensor", "TensorSwap"],
  ME: ["MAGICEDEN", "MAGICEDEN_AUCTION", "MAGICEDEN_V2", "MEv2", "MEV2"],
  HYPERSPACE: ["HYPERSPACE"],
  HADESWAP: ["HADESWAP"],
  SOLSEA: ["SOLSEA"],
  SOLANART: ["SOLANART"],
  SMB: ["SMB", "SMB_V2"],
}

export const STAKING_AUTHS = ["GKtfSjiSqToUazM8aqsnZoDLHbS4sGztgyKTaiAxEoh2"]
