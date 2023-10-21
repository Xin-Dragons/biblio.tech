import { gql } from "@apollo/client"
import client from "./apollo"

export function subscribeToChanges(slug: string) {
  try {
    const result = client.subscribe({
      query: gql`
        subscription NewTransactionTV2($slug: String!) {
          newTransactionTV2(slug: $slug) {
            tx {
              grossAmount
              mintOnchainId
              txAt
              txId
              txType
              buyerId
              sellerId
              source
            }
            mint {
              onchainId
              attributes
              imageUri
              name
              rarityRankHR
              rarityRankStat
              rarityRankTN
              rarityRankTT
              tokenStandard
              lastSale {
                price
                txAt
              }
            }
          }
        }
      `,
      variables: {
        slug,
      },
    })
    return result
  } catch (err) {
    console.log("Unable to subscribe to feed")
    console.error(err)
  }
}

export function subscribeToWalletChanges(wallet: string) {
  try {
    const result = client.subscribe({
      query: gql`
        subscription Subscription($wallet: String!) {
          newUserTransaction(wallet: $wallet) {
            mints
            attemptedAt
            status
            sig
            wallet
            mp
            action
            amounts
          }
        }
      `,
      variables: {
        wallet,
      },
    })
    return result
  } catch (err) {
    console.log("Unable to subscribe to feed")
    console.error(err)
  }
}

export type TX = {
  buyerId: string
  grossAmount: string
  mintOnchainId: string
  sellerId: string
  source:
    | "ALPHA"
    | "AUCTION_HOUSE"
    | "BUBBLEGUM"
    | "DIGITALEYEZ"
    | "DIGITALEYEZ_V2"
    | "ELIXIR"
    | "ELIXIR_COMPOSED"
    | "HADESWAP"
    | "HYPERSPACE"
    | "MAGICEDEN"
    | "MAGICEDEN_AUCTION"
    | "MAGICEDEN_V2"
    | "ONCHAIN"
    | "SMB"
    | "SMB_V2"
    | "SOLANART"
    | "SOLSEA"
    | "SWAPSORIAN"
    | "TCOMP"
    | "TENSORBID"
    | "TENSORSWAP"
    | "TOKEN_METADATA"
    | "YAWWW"
  txAt: number
  txId: string
  txType:
    | "ADJUST_PRICE"
    | "AUCTION_CANCEL"
    | "AUCTION_CREATE"
    | "AUCTION_PLACE_BID"
    | "AUCTION_SETTLE"
    | "CANCEL_BID"
    | "CREATE_MINT"
    | "DELIST"
    | "ELIXIR_APPRAISE"
    | "ELIXIR_BUY_PNFT"
    | "ELIXIR_COMPOSED_BUY_NFT"
    | "ELIXIR_COMPOSED_SELL_NFT"
    | "ELIXIR_FRACTIONALIZE"
    | "ELIXIR_FUSE"
    | "ELIXIR_POOL_DEPOSIT_FNFT"
    | "ELIXIR_POOL_EXCHANGE_FNFT"
    | "ELIXIR_POOL_WITHDRAW_FNFT"
    | "ELIXIR_SELL_PNFT"
    | "FAILED"
    | "LIST"
    | "MARGIN_ATTACH"
    | "MARGIN_CLOSE"
    | "MARGIN_DEPOSIT"
    | "MARGIN_DETACH"
    | "MARGIN_INIT"
    | "MARGIN_WITHDRAW"
    | "OTC_BUNDLED_MAKER_WITHDRAW"
    | "OTC_BUNDLED_MAKE_OFFER"
    | "OTC_BUNDLED_TAKER_WITHDRAW"
    | "OTC_BUNDLED_TAKE_OFFER"
    | "OTHER"
    | "PLACE_BID"
    | "SALE_ACCEPT_BID"
    | "SALE_BUY_NOW"
    | "SWAP_BUY_NFT"
    | "SWAP_BUY_SINGLE_LISTING"
    | "SWAP_CLOSE_POOL"
    | "SWAP_DELIST"
    | "SWAP_DEPOSIT_LIQ"
    | "SWAP_DEPOSIT_NFT"
    | "SWAP_DEPOSIT_SOL"
    | "SWAP_EDIT_POOL"
    | "SWAP_EDIT_SINGLE_LISTING"
    | "SWAP_INIT_POOL"
    | "SWAP_LIST"
    | "SWAP_SELL_NFT"
    | "SWAP_WITHDRAW_LIQ"
    | "SWAP_WITHDRAW_MM_FEE"
    | "SWAP_WITHDRAW_NFT"
    | "SWAP_WITHDRAW_SOL"
    | "TRANSFER"
    | "UPDATE_MINT"
}

export type MINT = {
  attributes: Record<string, any>[]
  compressed: boolean
  imageUri: string
  name: string
  onchainId: string
  owner: string
  rarityRankHR: number | null
  rarityRankStat: number | null
  rarityRankTT: number | null
  tokenStandard:
    | "FUNGIBLE"
    | "FUNGIBLE_ASSET"
    | "NON_FUNGIBLE"
    | "NON_FUNGIBLE_EDITION"
    | "PROGRAMMABLE_NON_FUNGIBLE"
    | "PROGRAMMABLE_NON_FUNGIBLE_EDITION"
}
