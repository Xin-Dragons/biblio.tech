import { publicKey } from "@metaplex-foundation/umi"

export const MAX_TOKENS = BigInt("18446744073709551615")
export const DANDIES_COLLECTION = publicKey("CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys")
export const DANDIES_NIFTY_COLLECTION = publicKey("BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF")

export const FEES_WALLET = publicKey("FCp3p6jRvtbng7NQpUYiNx39wyvJ2LZjuhE1bPt37EVE")

export enum PriorityFees {
  MIN = "Min",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  VERYHIGH = "VeryHigh",
  // UNSAFEMAX = "UnsafeMax",
}

export const MAX_TX_SIZE = 1232
export const PRIORITY_FEE_IX_SIZE = 44
export const PRIORITY_AND_COMPUTE_IXS_SIZE = 56
