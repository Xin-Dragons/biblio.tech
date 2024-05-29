import { BlockhashWithExpiryBlockHeight, PublicKey, TransactionBuilder, publicKey } from "@metaplex-foundation/umi"

export const MAX_TOKENS = BigInt("18446744073709551615")
export const DANDIES_COLLECTION = publicKey("CdxKBSnipG5YD5KBuH3L1szmhPW1mwDHe6kQFR3nk9ys")
export const DANDIES_NIFTY_COLLECTION = publicKey("BBrZYucnUXEbizXh2XqtHzqZ6ZHCfvmxKb7H5uJ6pWAF")

export const FEES_WALLET = publicKey("FCp3p6jRvtbng7NQpUYiNx39wyvJ2LZjuhE1bPt37EVE")

export enum ACCOUNT_TYPE {
  basic = "basic",
  advanced = "advanced",
  pro = "pro",
  unlimited = "unlimited",
}

export enum PriorityFees {
  MIN = "Min",
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  VERYHIGH = "VeryHigh",
  // UNSAFEMAX = "UnsafeMax",
}

export enum TxStatus {
  UNSIGNED,
  SIGNED,
  SENT,
  CONFIRMED,
  EXPIRED,
  ERROR,
}

export enum WorkerAction {
  ITEM_PROCESSED,
  BATCH_DONE,
  TASK_COMPLETE,
}

export const CONFIRMING_STATUSES = [TxStatus.SENT, TxStatus.SIGNED, TxStatus.UNSIGNED]
export const COMPLETED_STATUSES = [TxStatus.CONFIRMED, TxStatus.EXPIRED, TxStatus.ERROR]
export const ERROR_STATUSES = [TxStatus.ERROR, TxStatus.EXPIRED]

export type Tx = {
  index: number
  id: string
  sig?: string
  status: TxStatus
  promise?: Promise<any>
  tx: TransactionBuilder
  mints: PublicKey[]
  blockhash?: BlockhashWithExpiryBlockHeight
  slot?: number
}

export type RawTx = {
  index: number
  id: string
  tx: string
  sig?: string
}

export const MAX_TX_SIZE = 1232
export const PRIORITY_FEE_IX_SIZE = 44
export const PRIORITY_AND_COMPUTE_IXS_SIZE = 56
export const NONCE_ADVANCE_IX_SIZE = 50

export const TX_THROTTLE = {
  [ACCOUNT_TYPE.basic]: 20,
  [ACCOUNT_TYPE.advanced]: 100,
  [ACCOUNT_TYPE.pro]: 50,
  [ACCOUNT_TYPE.unlimited]: 20,
}

export const MAX_BATCH_SIZES = {
  [ACCOUNT_TYPE.basic]: 200,
  [ACCOUNT_TYPE.advanced]: 30,
  [ACCOUNT_TYPE.pro]: 100,
  [ACCOUNT_TYPE.unlimited]: 200,
}
