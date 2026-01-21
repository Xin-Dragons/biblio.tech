import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata"
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox"
import { PublicKey, createNoopSigner, signerIdentity } from "@metaplex-foundation/umi"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"

export const getAnonUmi = (publicKey: PublicKey) =>
  createUmi(process.env.NEXT_PUBLIC_RPC_HOST!, { commitment: "processed" })
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(signerIdentity(createNoopSigner(publicKey)))
