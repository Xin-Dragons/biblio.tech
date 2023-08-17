import { publicKey } from "@metaplex-foundation/umi"

export enum OPERATIONS {
  Transfer = "Transfer",
  TransferWalletToWallet = "Transfer:WalletToWallet",
  TransferOwner = "Transfer:Owner",
  TransferMigrationDelegate = "Transfer:MigrationDelegate",
  TransferSaleDelegate = "Transfer:SaleDelegate",
  TransferTransferDelegate = "Transfer:TransferDelegate",
  Delegate = "Delegate",
  DelegateLockedTransfer = "Delegate:LockedTransfer",
  DelegateTransfer = "Delegate:Transfer",
  DelegateUtility = "Delegate:Utility",
  DelegateStaking = "Delegate:Staking",
  DelegateSale = "Delegate:Sale",
}

export type Operation = `${OPERATIONS}`

export const NAME_MAX_LEN = 32
export const PROBLEM_KEY = "4vTSEo4R2q3NRH2gm5BiDr1FMQmv4KGCDQrJbx23JnTt"

export const FIELD_CONFIG = {
  operator: {
    field: "select",
    options: ["<", "<=", "=", ">=", ">"],
  },
  publicKey: {
    field: "publicKey",
  },
  program: {
    field: "program",
  },
  programs: {
    field: "program",
  },
  publicKeys: {
    field: "publicKey",
  },
}

export const PROGRAMS = [
  { label: "Sharky", value: "SHARKobtfF1bHhxD2eqftjHBdVSCbKo9JtgK71FhELP", type: "Loan provider" },
  { label: "Citrus", value: "JCFRaPv7852ESRwJJGRy2mysUMydXZgVVhrMLmExvmVp", type: "Loan provider" },
  { label: "Frakt", value: "4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt", type: "Loan provider" },
  { label: "Raindrops", value: "RainEraPU5yDoJmTrHdYynK9739GkEfDsE4ffqce2BR", type: "Loan provider" },
  { label: "MEv1", value: "MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8", type: "Marketplace" },
  { label: "MEv2", value: "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K", type: "Marketplace" },
  { label: "Solanart", value: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz", type: "Marketplace" },
  { label: "SolanartAuction", value: "CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz", type: "Marketplace" },
  { label: "SMB Marketplace", value: "J7RagMKwSD5zJSbRQZU56ypHUtux8LRDkUpAPSKH4WPp", type: "Marketplace" },
  { label: "Yawww", value: "5SKmrbAxnHV2sgqyDXkGrLrokZYtWWVEEk5Soed7VLVN", type: "Marketplace" },
  { label: "SolSea", value: "617jbWo616ggkDxvW1Le8pV38XLbVSyWY8ae6QUmGBAU", type: "Marketplace" },
  { label: "AuctionHouse", value: "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk", type: "Marketplace" },
  { label: "OpenSeaAuctionHouse", value: "3o9d13qUvEuuauhFrVom1vuCzgNsJifeaBYDPquaT73Y", type: "Marketplace" },
  { label: "CoralCubeAuctionHouse", value: "29xtkHHFLUHXiLoxTzbC7U8kekTwN3mVQSkfXnB1sQ6e", type: "Marketplace" },
  { label: "ExchangeArt", value: "AmK5g2XcyptVLCFESBCJqoSfwV3znGoVYQnqEnaAZKWn", type: "Marketplace" },
  { label: "Auction House", value: "hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk", type: "Marketplace" },
  { label: "Hadeswap", value: "hadeK9DLv9eA7ya5KCTqSvSvRZeJC3JgD5a9Y3CNbvu", type: "AMM" },
  { label: "TensorSwap", value: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN", type: "AMM" },
  { label: "Elixir", value: "2qGyiNeWyZxNdkvWHc2jT5qkCnYa1j1gDLSSUmyoWMh8", type: "AMM" },
  { label: "GoatSwap", value: "Goats192jeQq3r2sn8pe69LyJtisLMfEoq8LyDienct1", type: "AMM" },
  { label: "CoralCubeAMM", value: "mmm3XBJg5gk8XJxEKBvdgptZz6SgK4tXvn36sodowMc", type: "AMM" },
  { label: "Candy Machine v2", value: "cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ", type: "Misc" },
  { label: "Candy Guard", value: "Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g", type: "Misc" },
]
