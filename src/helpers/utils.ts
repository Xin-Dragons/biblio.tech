import { PublicKey } from "@metaplex-foundation/js"
import { Transaction, Umi, isPda, publicKey } from "@metaplex-foundation/umi"
import { WalletContextState } from "@solana/wallet-adapter-react"
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js"
import BN from "bn.js"
import base58 from "bs58"
import { isAddress } from "viem"
import { SYSTEM_PROGRAM_PK } from "@/constants"
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata"
import { umi } from "@/app/helpers/umi"

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
    return num.toLocaleString(
      undefined,
      num > 10 ? { maximumFractionDigits: 0 } : num > 0 ? { maximumSignificantDigits: 2 } : { maximumFractionDigits: 2 }
    )
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

export const isWallet = async (umi: Umi, input: string) => {
  if (isValidPublicKey(input)) {
    const acc = await umi.rpc.getAccount(publicKey(input))
    return acc.exists && acc.owner === publicKey(SYSTEM_PROGRAM_PK)
  }
  return false
}

export const isDigitalAsset = async (umi: Umi, input: string) => {
  try {
    const asset = await fetchDigitalAsset(umi, publicKey(input))
    return true
  } catch (err) {
    return false
  }
}

export const isValidPublicKey = (input: string) => {
  try {
    const pk = new PublicKey(input)
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

export const bigNumberFormatter = Intl.NumberFormat("en", { notation: "compact" })

export async function withMappedCurrency(item: any) {
  const tx = await umi.rpc.getTransaction(base58.decode(item.transactionId), {
    commitment: "confirmed",
  })
  if (!tx) {
    return item
  }
  const preTokenBalance = tx.meta.preTokenBalances.find((p) => p.owner === item.seller && p.mint !== item.mint)
  if (!preTokenBalance) {
    return item
  }

  const postTokenBalace = tx.meta.postTokenBalances.find((p) => p.owner === item.seller && p.mint !== item.mint)
  if (!postTokenBalace) {
    return item
  }
  const change = Number(
    (postTokenBalace.amount.basisPoints - preTokenBalance.amount.basisPoints) /
      BigInt(Math.pow(10, preTokenBalance.amount.decimals))
  )
  const currency = await fetchDigitalAsset(umi, publicKey(preTokenBalance.mint))
  return {
    ...item,
    price: change,
    currency: currency.metadata.symbol,
  }
}

export function isUUID(input: string) {
  return input.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
}

export const jsonify = (item: any) => JSON.parse(JSON.stringify(item))

export async function getFirstSigForAddress(connection: Connection, address: PublicKey, before?: string) {
  const sigs = await connection.getConfirmedSignaturesForAddress2(address, { before })
  if (sigs.length === 1_000 && sigs[sigs.length - 1].signature !== before) {
    return getFirstSigForAddress(connection, address, sigs[sigs.length - 1].signature)
  }

  return sigs[sigs.length - 1]
}
