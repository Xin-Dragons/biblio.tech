import { WalletContextState } from "@solana/wallet-adapter-react";
import base58 from "bs58";

export async function signMessage(wallet: WalletContextState, nonce: string) {
  const message = `Sign in to Biblio\n\${nonce}`;
  const encodedMessage = new TextEncoder().encode(message);
  const signedMessage = await wallet?.signMessage?.(encodedMessage);
  return base58.encode(new Uint8Array(signedMessage || []));
}