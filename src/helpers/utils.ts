import { WalletContextState } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

export async function signMessage(wallet: WalletContextState, nonce: string) {
  const message = `Sign in to Biblio\n\${nonce}`;
  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = await wallet?.signMessage?.(encodedMessage);
  return base58.encode(new Uint8Array(signedMessage || []));
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const lamportsToSol = (lamports: string | number | null | BN) => {
  try {
    const input = (typeof lamports === "string") ? parseInt(lamports) : lamports;
    const num = new BN(input || 0).toNumber() / LAMPORTS_PER_SOL;
    return num.toLocaleString(undefined, { minimumSignificantDigits: 1});
  } catch {
    return 0
  }
}

export function shorten(address: string) {
  if (!address) {
    return;
  }
  return `${address.substring(0, 4)}...${address.substring(address.length - 4, address.length)}`
}