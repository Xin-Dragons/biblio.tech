import { Metaplex, Nft, PublicKey, walletAdapterIdentity } from "@metaplex-foundation/js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { flatten } from "lodash";

export async function getFreezeInstructions(nft: Nft, wallet: WalletContextState, metaplex: Metaplex) {
  return flatten([
    metaplex.tokens().builders().approveDelegateAuthority({
      mintAddress: nft.mint.address,
      delegateAuthority: wallet.publicKey as PublicKey,
    }).getInstructions(),
    metaplex.use(walletAdapterIdentity(wallet)).nfts().builders().freezeDelegatedNft({
      mintAddress: nft.mint.address,
      delegateAuthority: metaplex.identity()
    }).getInstructions()
  ]);
}