import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata"
import { PublicKey, Umi, publicKey } from "@metaplex-foundation/umi"
import { getAssetGpaBuilder } from "@nifty-oss/asset"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import BN from "bn.js"
import base58 from "bs58"
import { flatten } from "lodash"
import { isAddress } from "viem"
import { DANDIES_NIFTY_COLLECTION } from "../constants"

export async function signMessage(wallet: WalletContextState, nonce: string) {
  const message = `Sign in to Biblio\n\${nonce}`
  const encodedMessage = new TextEncoder().encode(message)
  const signedMessage = await wallet?.signMessage?.(encodedMessage)
  return base58.encode(new Uint8Array(signedMessage || []))
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const lamportsToSol = (lamports: string | number | null | BN) => {
  try {
    const input = typeof lamports === "string" ? parseInt(lamports) : lamports
    const num = new BN(input || 0).toNumber() / LAMPORTS_PER_SOL
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } catch {
    return 0
  }
}

export function shorten(address: string) {
  if (!address) {
    return
  }
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}

export const isValidPublicKey = (input: string) => {
  try {
    const pk = publicKey(input)
    return true
  } catch {
    return false
  }
}

export const getAddressType = (pk: string) => {
  return isValidPublicKey(pk) ? "Solana" : isAddress(pk!) ? "Ethereum" : "Unknown"
}

export async function waitForWalletChange(signer: string): Promise<void> {
  // @ts-ignore
  if (window.solana?.publicKey?.toBase58() === signer) {
    return
  }

  await sleep(1000)
  return waitForWalletChange(signer)
}

export function toTitleCase(str: string) {
  return str.replace("-", " ").replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

export function isNonFungible(tokenStandard: TokenStandard): Boolean {
  return [
    TokenStandard.NonFungible,
    TokenStandard.NonFungibleEdition,
    TokenStandard.ProgrammableNonFungible,
    TokenStandard.ProgrammableNonFungibleEdition,
  ].includes(tokenStandard)
}

export function isFungible(tokenStandard: TokenStandard): Boolean {
  return [TokenStandard.Fungible, TokenStandard.FungibleAsset].includes(tokenStandard)
}

export async function getNiftyDandies(umi: Umi, wallets: PublicKey[]) {
  return flatten(
    await Promise.all(
      wallets.map((wallet) =>
        getAssetGpaBuilder(umi)
          .whereField("owner", wallet)
          .whereField("group", DANDIES_NIFTY_COLLECTION)
          .getDeserialized()
      )
    )
  )
}

export function imageCdn(src: string, w: number = 400, h: number = 400) {
  return `https://img-cdn.magiceden.dev/rs:fill:${w || ""}:${h || ""}:0:0/plain/${src}`
}
