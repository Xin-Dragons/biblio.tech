import * as anchor from "@coral-xyz/anchor"
import { Stake } from "./stake"

export type StakerWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: Staker
}

export type DistributionWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: Distribution
}

export type CollectionWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: CollectionType
}

export type EmissionWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: Emission
}

export type StakeRecordWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: StakeRecord
}

export type ShareRecordWithPublicKey = {
  publicKey: anchor.web3.PublicKey
  account: ShareRecord
}

export type ShareRecord = anchor.IdlAccounts<Stake>["shareRecord"]
export type Distribution = anchor.IdlAccounts<Stake>["distribution"]
export type Staker = anchor.IdlAccounts<Stake>["staker"]
export type StakeRecord = anchor.IdlAccounts<Stake>["stakeRecord"]
export type Emission = anchor.IdlAccounts<Stake>["emission"]
export type CollectionType = anchor.IdlAccounts<Stake>["collection"]
export type ProgramConfig = anchor.IdlAccounts<Stake>["programConfig"]
export type StakerTheme = anchor.IdlAccounts<Stake>["staker"]["theme"]
